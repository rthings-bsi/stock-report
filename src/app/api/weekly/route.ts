import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { hasPermission, isAuthContext, requireAuth } from '@/lib/auth-server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  detectAvailableWeeks,
  computeWeeklyNCAnalysis,
  computeWeeklyProductivity,
  computeWeeklyCapacity,
  computeWeeklyFastSlow,
  computeWeeklyCoilStrip,
  computeWeeklyNCStock,
  computeWeeklyLoo,
  computeWeeklyUnfifo,
  computeWeeklyPackaging,
  generateWeeklyInsights,
  aggregateMB51ForWeek,
  parseDateSafe,
  formatDateToYmd,
} from '@/lib/weeklyAnalytics';
import {
  NCProgressTransaction,
  WarehousePipeCapacity,
  FastSlowPipe,
  CoilStripArea,
  PipeNCWarehouse,
  PipeNCItem,
  LooComparisonItem,
  UnfifoItem,
  UnfifoCoilItem,
  UnfifoPipeItem,
  DamagedPackagingItem,
  IncomingPackagingItem,
} from '@/types/warehouse';
import { MB51Dataset } from '@/types/productivity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTIVITY_JSON_PATH = path.join(DATA_DIR, 'mb51_productivity.json');

let localDb: any = null;
function getLocalDb() {
  if (!localDb) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dbModule = require('@/lib/db');
      const resolved = dbModule?.default !== undefined ? dbModule.default : dbModule;
      if (resolved && typeof resolved.prepare === 'function') {
        localDb = resolved;
      }
    } catch {
      localDb = null;
    }
  }
  return localDb;
}

function parseJsonSafe(val: any, fallback: any = []) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val ?? fallback;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  if (auth.user.role !== 'admin' && !hasPermission(auth, 'viewWeeklyAnalytics')) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak: Anda tidak memiliki izin untuk melihat modul Analisis Mingguan.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedWeek = searchParams.get('week');

    // 1. Ambil data produktivitas dari JSON / DB
    let prodDataset: MB51Dataset | null = null;
    try {
      if (fs.existsSync(PRODUCTIVITY_JSON_PATH)) {
        const rawJson = fs.readFileSync(PRODUCTIVITY_JSON_PATH, 'utf-8');
        prodDataset = JSON.parse(rawJson);
      }
    } catch (e) {
      console.warn('Failed to load mb51_productivity.json in weekly route:', e);
    }

    const prodDates = prodDataset?.tanggalKerjaDates || prodDataset?.postingDates || [];

    // 2. Ambil list snapshots komprehensif dari SQLite / Supabase
    const db = getLocalDb();
    let snapshotRows: Array<{
      snapshot_key: string;
      last_updated: string;
      pipe_capacities?: string;
      fast_slow_data?: string;
      coil_strip_data?: string;
      nc_warehouse_data?: string;
      nc_items?: string;
      loo_st_data?: string;
      loo_lt_data?: string;
      unfifo_data?: string;
      unfifo_coil_data?: string;
      unfifo_pipe_data?: string;
      damaged_packaging_data?: string;
      incoming_packaging_data?: string;
      nc_progress_data?: string;
    }> = [];

    if (db) {
      try {
        const rows = db.prepare(`
          SELECT snapshot_key, last_updated,
                 pipe_capacities, fast_slow_data, coil_strip_data,
                 nc_warehouse_data, nc_items,
                 loo_st_data, loo_lt_data,
                 unfifo_data, unfifo_coil_data, unfifo_pipe_data,
                 damaged_packaging_data, incoming_packaging_data,
                 nc_progress_data
          FROM warehouse_snapshots
          WHERE snapshot_key LIKE 'snap_%'
          ORDER BY snapshot_key ASC
        `).all();
        if (rows && rows.length > 0) {
          snapshotRows = rows;
        }
      } catch (e) {
        console.warn('SQLite read snapshots for weekly route failed:', e);
      }
    }

    if (snapshotRows.length === 0 && isSupabaseConfigured && supabase) {
      try {
        const { data: supaRows } = await supabase
          .from('warehouse_snapshots')
          .select(`
            snapshot_key, last_updated,
            pipe_capacities, fast_slow_data, coil_strip_data,
            nc_warehouse_data, nc_items,
            loo_st_data, loo_lt_data,
            unfifo_data, unfifo_coil_data, unfifo_pipe_data,
            damaged_packaging_data, incoming_packaging_data,
            nc_progress_data
          `)
          .like('snapshot_key', 'snap_%')
          .order('snapshot_key', { ascending: true });
        if (supaRows) {
          snapshotRows = supaRows;
        }
      } catch (supaErr) {
        console.warn('Supabase read snapshots for weekly route failed:', supaErr);
      }
    }

    const snapshotKeys = snapshotRows.map((s) => s.snapshot_key);

    // 3. Deteksi seluruh pekan yang tersedia
    const availableWeeks = detectAvailableWeeks(snapshotKeys, prodDates);

    if (availableWeeks.length === 0) {
      return NextResponse.json({
        success: true,
        availableWeeks: [],
        selectedWeek: null,
        report: null,
      });
    }

    // Tentukan pekan aktif (pilihan user atau pekan terbaru yang ada datanya)
    let selectedPeriod = availableWeeks[0];
    if (requestedWeek) {
      const matched = availableWeeks.find((w) => w.id === requestedWeek);
      if (matched) selectedPeriod = matched;
    }

    // 4. Kumpulkan transaksi NC unik di pekan ini dari snapshot terkait
    const uniqueNcMap = new Map<string, NCProgressTransaction>();

    snapshotRows.forEach((snap) => {
      if (!snap.nc_progress_data) return;
      const items: NCProgressTransaction[] = parseJsonSafe(snap.nc_progress_data, []);
      if (!Array.isArray(items)) return;

      items.forEach((it, idx) => {
        const dStr = it.postingDate || it.entryDate || '';
        const dt = parseDateSafe(dStr);
        if (!dt) return;
        const ymd = formatDateToYmd(dt);
        if (ymd >= selectedPeriod.startDate && ymd <= selectedPeriod.endDate) {
          const txId = it.id || `${it.materialDocument}_${it.materialDocItem || idx}_${it.movementType}`;
          if (!uniqueNcMap.has(txId)) {
            uniqueNcMap.set(txId, it);
          }
        }
      });
    });

    const allNcTransactions = Array.from(uniqueNcMap.values());

    // 5. Filter snapshot dalam pekan ini & snapshot sebelum pekan ini sebagai start snapshot
    const weekSnapshots = snapshotRows.filter((s) => {
      const snapDate = s.snapshot_key.replace(/^snap_/, '');
      return snapDate >= selectedPeriod.startDate && snapDate <= selectedPeriod.endDate;
    });

    const priorSnapshots = snapshotRows.filter((s) => {
      const snapDate = s.snapshot_key.replace(/^snap_/, '');
      return snapDate < selectedPeriod.startDate;
    });
    const priorSnap = priorSnapshots.length > 0 ? priorSnapshots[priorSnapshots.length - 1] : null;

    let firstSnap = weekSnapshots[0] || priorSnap || null;
    let lastSnap = weekSnapshots.length > 0 ? weekSnapshots[weekSnapshots.length - 1] : (priorSnap || null);

    if (weekSnapshots.length === 1 && priorSnap) {
      firstSnap = priorSnap;
      lastSnap = weekSnapshots[0];
    }

    // Ekstraksi data modul dari snapshot awal dan akhir
    const firstPipes: WarehousePipeCapacity[] = parseJsonSafe(firstSnap?.pipe_capacities, []);
    const lastPipes: WarehousePipeCapacity[] = parseJsonSafe(lastSnap?.pipe_capacities, []);
    const firstFS: FastSlowPipe[] = parseJsonSafe(firstSnap?.fast_slow_data, []);
    const lastFS: FastSlowPipe[] = parseJsonSafe(lastSnap?.fast_slow_data, []);
    const firstCoils: CoilStripArea[] = parseJsonSafe(firstSnap?.coil_strip_data, []);
    const lastCoils: CoilStripArea[] = parseJsonSafe(lastSnap?.coil_strip_data, []);
    const firstNCWh: PipeNCWarehouse[] = parseJsonSafe(firstSnap?.nc_warehouse_data, []);
    const lastNCWh: PipeNCWarehouse[] = parseJsonSafe(lastSnap?.nc_warehouse_data, []);
    const ncItems: PipeNCItem[] = parseJsonSafe(lastSnap?.nc_items || firstSnap?.nc_items, []);

    const lastLooST: LooComparisonItem[] = parseJsonSafe(lastSnap?.loo_st_data || firstSnap?.loo_st_data, []);
    const lastLooLT: LooComparisonItem[] = parseJsonSafe(lastSnap?.loo_lt_data || firstSnap?.loo_lt_data, []);

    const unfifoItems: UnfifoItem[] = parseJsonSafe(lastSnap?.unfifo_data || firstSnap?.unfifo_data, []);
    const unfifoCoil: UnfifoCoilItem[] = parseJsonSafe(lastSnap?.unfifo_coil_data || firstSnap?.unfifo_coil_data, []);
    const unfifoPipe: UnfifoPipeItem[] = parseJsonSafe(lastSnap?.unfifo_pipe_data || firstSnap?.unfifo_pipe_data, []);

    const incomingPkg: IncomingPackagingItem[] = parseJsonSafe(lastSnap?.incoming_packaging_data || firstSnap?.incoming_packaging_data, []);
    const damagedPkg: DamagedPackagingItem[] = parseJsonSafe(lastSnap?.damaged_packaging_data || firstSnap?.damaged_packaging_data, []);

    // 6. Hitung agregasi MB51 untuk Smart Fallback
    const mb51Agg = aggregateMB51ForWeek(prodDataset, selectedPeriod);

    // 7. Hitung kalkulasi analitik seluruh 9 modul
    const capacitySummary = computeWeeklyCapacity(
      firstPipes,
      lastPipes,
      firstCoils,
      lastCoils,
      selectedPeriod,
      mb51Agg
    );

    const fastSlowSummary = computeWeeklyFastSlow(
      firstFS,
      lastFS,
      selectedPeriod,
      capacitySummary.warehouseMovement,
      mb51Agg
    );

    const coilStripSummary = computeWeeklyCoilStrip(
      firstCoils,
      lastCoils,
      selectedPeriod,
      mb51Agg
    );

    const ncSummary = computeWeeklyNCAnalysis(allNcTransactions, selectedPeriod);

    const ncStockSummary = computeWeeklyNCStock(
      firstNCWh,
      lastNCWh,
      ncItems,
      selectedPeriod,
      ncSummary
    );

    const looSummary = computeWeeklyLoo(
      lastLooST,
      lastLooLT,
      lastPipes,
      selectedPeriod,
      mb51Agg
    );

    const unfifoSummary = computeWeeklyUnfifo(
      unfifoItems,
      unfifoCoil,
      unfifoPipe,
      selectedPeriod
    );

    const packagingSummary = computeWeeklyPackaging(
      incomingPkg,
      damagedPkg,
      selectedPeriod,
      mb51Agg
    );

    const productivitySummary = computeWeeklyProductivity(prodDataset, selectedPeriod);

    // 8. Generate Executive Insights Komprehensif
    const keyInsights = generateWeeklyInsights(
      ncSummary,
      productivitySummary,
      capacitySummary,
      fastSlowSummary,
      coilStripSummary,
      ncStockSummary,
      looSummary,
      unfifoSummary,
      packagingSummary
    );

    return NextResponse.json({
      success: true,
      availableWeeks,
      selectedWeek: selectedPeriod.id,
      report: {
        period: selectedPeriod,
        capacitySummary,
        fastSlowSummary,
        coilStripSummary,
        ncStockSummary,
        ncSummary,
        looSummary,
        unfifoSummary,
        packagingSummary,
        productivitySummary,
        keyInsights,
      },
    });
  } catch (error) {
    console.error('Weekly analytics API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
