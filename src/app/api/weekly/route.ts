import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthContext, requireAuth } from '@/lib/auth-server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  detectAvailableWeeks,
  computeWeeklyNCAnalysis,
  computeWeeklyProductivity,
  generateWeeklyInsights,
  WeeklyPeriod,
  WeeklyCapacitySummary,
  parseDateSafe,
  formatDateToYmd,
} from '@/lib/weeklyAnalytics';
import { NCProgressTransaction, WarehousePipeCapacity, CoilStripArea } from '@/types/warehouse';
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

    // 2. Ambil list snapshots dari SQLite / Supabase
    const db = getLocalDb();
    let snapshotRows: Array<{
      snapshot_key: string;
      last_updated: string;
      nc_progress_data?: string;
      pipe_capacities?: string;
      coil_strip_data?: string;
    }> = [];

    if (db) {
      try {
        const rows = db.prepare(`
          SELECT snapshot_key, last_updated, nc_progress_data, pipe_capacities, coil_strip_data
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
          .select('snapshot_key, last_updated, nc_progress_data, pipe_capacities, coil_strip_data')
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

    // 4. Kumpulkan seluruh transaksi NC unik di pekan ini dari snapshot terkait
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

    // 5. Hitung analisis mingguan Progres NC
    const ncSummary = computeWeeklyNCAnalysis(allNcTransactions, selectedPeriod);

    // 6. Hitung analisis mingguan Produktivitas MB51
    const productivitySummary = computeWeeklyProductivity(prodDataset, selectedPeriod);

    // 7. Hitung analisis pergerakan Kapasitas Gudang (Awal Minggu vs Akhir Minggu)
    // Filter snapshot yang jatuh dalam pekan ini
    const weekSnapshots = snapshotRows.filter((s) => {
      const snapDate = s.snapshot_key.replace(/^snap_/, '');
      return snapDate >= selectedPeriod.startDate && snapDate <= selectedPeriod.endDate;
    });

    let startPipeStock = 0;
    let endPipeStock = 0;
    let startCoilStock = 0;
    let endCoilStock = 0;
    let avgOccupancy = 0;
    const whMovementMap = new Map<string, {
      gudang: string;
      kapasitas: number;
      stockStart: number;
      stockEnd: number;
      deltaStock: number;
      occupancyEnd: number;
    }>();

    if (weekSnapshots.length > 0) {
      const firstSnap = weekSnapshots[0];
      const lastSnap = weekSnapshots[weekSnapshots.length - 1];

      const firstPipes: WarehousePipeCapacity[] = parseJsonSafe(firstSnap.pipe_capacities, []);
      const lastPipes: WarehousePipeCapacity[] = parseJsonSafe(lastSnap.pipe_capacities, []);
      const firstCoils: CoilStripArea[] = parseJsonSafe(firstSnap.coil_strip_data, []);
      const lastCoils: CoilStripArea[] = parseJsonSafe(lastSnap.coil_strip_data, []);

      firstPipes.forEach((p) => {
        startPipeStock += p.stock || 0;
        whMovementMap.set(p.gudang, {
          gudang: p.gudang,
          kapasitas: p.kapasitas || 0,
          stockStart: p.stock || 0,
          stockEnd: p.stock || 0,
          deltaStock: 0,
          occupancyEnd: p.persenTerisi || 0,
        });
      });

      lastPipes.forEach((p) => {
        endPipeStock += p.stock || 0;
        if (!whMovementMap.has(p.gudang)) {
          whMovementMap.set(p.gudang, {
            gudang: p.gudang,
            kapasitas: p.kapasitas || 0,
            stockStart: p.stock || 0,
            stockEnd: p.stock || 0,
            deltaStock: 0,
            occupancyEnd: p.persenTerisi || 0,
          });
        } else {
          const entry = whMovementMap.get(p.gudang)!;
          entry.stockEnd = p.stock || 0;
          entry.deltaStock = (p.stock || 0) - entry.stockStart;
          entry.occupancyEnd = p.kapasitas > 0 ? Number(((p.stock / p.kapasitas) * 100).toFixed(1)) : 0;
        }
      });

      firstCoils.forEach((c) => {
        startCoilStock += c.totalTon || 0;
      });

      lastCoils.forEach((c) => {
        endCoilStock += c.totalTon || 0;
      });

      let totalCap = 0;
      lastPipes.forEach((p) => {
        totalCap += p.kapasitas || 0;
      });
      avgOccupancy = totalCap > 0 ? Number(((endPipeStock / totalCap) * 100).toFixed(1)) : 0;
    }

    const capacitySummary: WeeklyCapacitySummary = {
      startSnapshotKey: weekSnapshots[0]?.snapshot_key || '',
      endSnapshotKey: weekSnapshots[weekSnapshots.length - 1]?.snapshot_key || '',
      startPipeStock: Math.round(startPipeStock),
      endPipeStock: Math.round(endPipeStock),
      deltaPipeStock: Math.round(endPipeStock - startPipeStock),
      avgPipeOccupancy: avgOccupancy,
      startCoilStock: Math.round(startCoilStock),
      endCoilStock: Math.round(endCoilStock),
      deltaCoilStock: Math.round(endCoilStock - startCoilStock),
      warehouseMovement: Array.from(whMovementMap.values()),
    };

    // 8. Generate Executive Insights
    const keyInsights = generateWeeklyInsights(ncSummary, productivitySummary, capacitySummary);

    return NextResponse.json({
      success: true,
      availableWeeks,
      selectedWeek: selectedPeriod.id,
      report: {
        period: selectedPeriod,
        ncSummary,
        productivitySummary,
        capacitySummary,
        keyInsights,
      },
    });
  } catch (error) {
    console.error('Weekly analytics API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
