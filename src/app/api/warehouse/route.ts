import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import {
  getNormalizedSnapshotsListFromSupabase,
  getNormalizedSnapshotFromSupabase,
  saveNormalizedSnapshotToSupabase,
  deleteNormalizedSnapshotFromSupabase,
  deleteAllNormalizedSnapshotsFromSupabase,
} from '../../../lib/supabaseNormalized';
import { calculateSTOPeriodSummary } from '../../../lib/parseStockOpname';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fallback SQLite instance for local environment
let localDb: any = null;
function getLocalDb() {
  if (!localDb) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dbModule = require('../../../lib/db');
      localDb = dbModule.default || dbModule;
    } catch (e) {
      console.warn('SQLite not available in this environment:', e);
    }
  }
  return localDb;
}

// Normalized SQLite helper (legacy)
function getNormDb(): any {
  return null;
}

function hasRealPipe(val: any): boolean {
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.some(
    (g: any) =>
      ((g.wipLt || 0) +
        (g.fgLt || 0) +
        (g.wipSt || 0) +
        (g.fgSt || 0) +
        (g.stock || 0) +
        (g.tonaseTotal || 0)) > 0
  );
}

function hasRealCoil(val: any): boolean {
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.some(
    (c: any) =>
      ((c.coilTon || 0) +
        (c.stripTon || 0) +
        (c.totalTon || 0) +
        (c.coilQty || 0) +
        (c.stripQty || 0)) > 0
  );
}

function hasArray(val: any): boolean {
  return Array.isArray(val) && val.length > 0;
}

function hasObject(val: any): boolean {
  return typeof val === 'object' && val !== null && Object.keys(val).length > 0;
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

function getLatestNonEmptySqliteCol(db: any, colName: string, minLength = 5): any {
  if (!db) return null;
  try {
    const r = db.prepare(`
      SELECT ${colName} FROM warehouse_snapshots
      WHERE ${colName} IS NOT NULL AND length(${colName}) > ?
      ORDER BY snapshot_key DESC LIMIT 1
    `).get(minLength) as any;
    return r ? r[colName] : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'latest';
    const listOnly = searchParams.get('list') === 'true';
    const stoHistory = searchParams.get('sto_history') === 'true';

    // Handler riwayat komparasi STO per periode (snapshot)
    if (stoHistory) {
      const periods: any[] = [];
      const db = getLocalDb();
      if (db) {
        try {
          const rows = db.prepare(`
            SELECT snapshot_key, last_updated, sto_data
            FROM warehouse_snapshots
            WHERE sto_data IS NOT NULL AND length(sto_data) > 10
            ORDER BY snapshot_key ASC
          `).all();
          if (rows && rows.length > 0) {
            for (const r of rows) {
              const items = parseJsonSafe(r.sto_data, []);
              if (Array.isArray(items) && items.length > 0) {
                periods.push(calculateSTOPeriodSummary(items, r.snapshot_key, r.last_updated));
              }
            }
          }
        } catch (e) {
          console.warn('SQLite sto_history failed:', e);
        }
      }

      if (periods.length === 0 && isSupabaseConfigured && supabase) {
        try {
          const { data: rows, error: supaErr } = await supabase
            .from('warehouse_snapshots')
            .select('snapshot_key, last_updated, sto_data')
            .not('sto_data', 'is', null)
            .order('snapshot_key', { ascending: true });
          if (!supaErr && rows) {
            for (const r of rows) {
              const items = parseJsonSafe(r.sto_data, []);
              if (Array.isArray(items) && items.length > 0) {
                periods.push(calculateSTOPeriodSummary(items, r.snapshot_key, r.last_updated));
              }
            }
          }
        } catch (supaEx) {
          console.warn('Supabase sto_history error:', supaEx);
        }
      }

      return NextResponse.json({ success: true, periods });
    }

    // 1. Coba baca dari SQLite lokal terlebih dahulu (respons instan)
    const db = getLocalDb();
    const normDb = getNormDb();
    if (db) {
      try {
        if (listOnly) {
          if (normDb?.getNormalizedSnapshotsList) {
            try {
              const normRows = normDb.getNormalizedSnapshotsList(db);
              if (normRows && normRows.length > 0) {
                return NextResponse.json({ success: true, snapshots: normRows, source: 'sqlite' });
              }
            } catch (normListErr) {
              console.warn('Normalized list failed, fallback to warehouse_snapshots:', normListErr);
            }
          }

          const listStmt = db.prepare(`
            SELECT snapshot_key, last_updated, created_at
            FROM warehouse_snapshots
            WHERE snapshot_key LIKE 'snap_%'
            ORDER BY snapshot_key DESC
          `);
          const rows = listStmt.all();
          if (rows && rows.length > 0) {
            return NextResponse.json({ success: true, snapshots: rows, source: 'sqlite' });
          }
          if (!isSupabaseConfigured) {
            return NextResponse.json({ success: true, snapshots: [], source: 'sqlite' });
          }
        } else {
          // Coba ambil dari tabel-tabel ternormalisasi terlebih dahulu
          if (normDb?.getNormalizedSnapshot) {
            try {
              const normData = normDb.getNormalizedSnapshot(db, key);
              if (normData) {
                if (!hasArray(normData.ncProgressData)) {
                  try {
                    const fbNc = db.prepare(`
                      SELECT nc_progress_data FROM warehouse_snapshots
                      WHERE nc_progress_data IS NOT NULL AND length(nc_progress_data) > 5
                      ORDER BY snapshot_key DESC LIMIT 1
                    `).get();
                    if (fbNc?.nc_progress_data) {
                      normData.ncProgressData = parseJsonSafe(fbNc.nc_progress_data, []);
                    }
                  } catch {}
                }

                if (!hasArray(normData.stoData)) {
                  normData.stoData = [];
                }

                return NextResponse.json({ success: true, data: normData, source: 'sqlite' });
              }
            } catch (normGetErr) {
              console.warn('Normalized get failed, fallback to warehouse_snapshots:', normGetErr);
            }
          }

          let row: any = null;
          if (key === 'latest') {
            const stmt = db.prepare(`
              SELECT * FROM warehouse_snapshots
              WHERE snapshot_key LIKE 'snap_%'
              ORDER BY snapshot_key DESC
              LIMIT 1
            `);
            row = stmt.get();
          } else {
            const stmt = db.prepare(`
              SELECT * FROM warehouse_snapshots
              WHERE snapshot_key = ?
              LIMIT 1
            `);
            row = stmt.get(key);
          }

          if (row) {
            let pipeCapacities = parseJsonSafe(row.pipe_capacities, []);
            if (!hasRealPipe(pipeCapacities)) {
              const fb = getLatestNonEmptySqliteCol(db, 'pipe_capacities', 10);
              const p = parseJsonSafe(fb, []);
              if (hasRealPipe(p)) pipeCapacities = p;
            }

            let fastSlowData = parseJsonSafe(row.fast_slow_data, []);
            if (!hasArray(fastSlowData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'fast_slow_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) fastSlowData = p;
            }

            let coilStripData = parseJsonSafe(row.coil_strip_data, []);
            if (!hasRealCoil(coilStripData) && !hasArray(coilStripData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'coil_strip_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasRealCoil(p) || hasArray(p)) coilStripData = p;
            }

            let ncWarehouseData = parseJsonSafe(row.nc_warehouse_data, []);
            if (!hasArray(ncWarehouseData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'nc_warehouse_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) ncWarehouseData = p;
            }

            let ncItems = parseJsonSafe(row.nc_items, []);
            if (!hasArray(ncItems)) {
              const fb = getLatestNonEmptySqliteCol(db, 'nc_items', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) ncItems = p;
            }

            let looSTData = parseJsonSafe(row.loo_st_data, []);
            if (!hasArray(looSTData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'loo_st_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) looSTData = p;
            }

            let looLTData = parseJsonSafe(row.loo_lt_data, []);
            if (!hasArray(looLTData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'loo_lt_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) looLTData = p;
            }

            let unfifoData = parseJsonSafe(row.unfifo_data, []);
            if (!hasArray(unfifoData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'unfifo_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) unfifoData = p;
            }

            let unfifoCoilData = parseJsonSafe(row.unfifo_coil_data, []);
            if (!hasArray(unfifoCoilData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'unfifo_coil_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) unfifoCoilData = p;
            }

            let unfifoPipeData = parseJsonSafe(row.unfifo_pipe_data, []);
            if (!hasArray(unfifoPipeData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'unfifo_pipe_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) unfifoPipeData = p;
            }

            let damagedPackagingData = parseJsonSafe(row.damaged_packaging_data, []);
            if (!hasArray(damagedPackagingData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'damaged_packaging_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) damagedPackagingData = p;
            }

            let incomingPackagingData = parseJsonSafe(row.incoming_packaging_data, []);
            if (!hasArray(incomingPackagingData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'incoming_packaging_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) incomingPackagingData = p;
            }

            let ncProgressData = parseJsonSafe(row.nc_progress_data, []);
            if (!hasArray(ncProgressData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'nc_progress_data', 5);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) ncProgressData = p;
            }

            let stoData = parseJsonSafe(row.sto_data, []);
            if (!hasArray(stoData)) {
              const fb = getLatestNonEmptySqliteCol(db, 'sto_data', 10);
              const p = parseJsonSafe(fb, []);
              if (hasArray(p)) stoData = p;
            }

            let customerBreakdown = parseJsonSafe(row.customer_breakdown, {});
            if (!hasObject(customerBreakdown)) {
              const fb = getLatestNonEmptySqliteCol(db, 'customer_breakdown', 5);
              const p = parseJsonSafe(fb, {});
              if (hasObject(p)) customerBreakdown = p;
            }

            const data = {
              snapshotKey: row.snapshot_key,
              lastUpdated: row.last_updated,
              pipeCapacities,
              fastSlowData,
              coilStripData,
              ncWarehouseData,
              ncItems,
              looSTData,
              looLTData,
              unfifoData,
              unfifoCoilData,
              unfifoPipeData,
              damagedPackagingData,
              incomingPackagingData,
              ncProgressData,
              stoData,
              customerBreakdown,
              createdAt: row.created_at,
            };
            return NextResponse.json({ success: true, data, source: 'sqlite' });
          }
        }
      } catch (dbErr) {
        console.warn('SQLite read failed, attempting Supabase fallback:', dbErr);
      }
    }

    // 2. Fallback ke Supabase Cloud jika SQLite kosong / di Vercel
    if (isSupabaseConfigured && supabase) {
      try {
        if (listOnly) {
          // Prioritaskan daftar dari tabel snapshots ternormalisasi
          try {
            const normSnapshots = await getNormalizedSnapshotsListFromSupabase(supabase);
            if (normSnapshots && normSnapshots.length > 0) {
              return NextResponse.json({ success: true, snapshots: normSnapshots, source: 'supabase_normalized' });
            }
          } catch (normListErr) {
            console.warn('Supabase normalized list query failed, falling back to legacy:', normListErr);
          }

          const { data, error } = await supabase
            .from('warehouse_snapshots')
            .select('snapshot_key, last_updated, created_at')
            .like('snapshot_key', 'snap_%')
            .order('snapshot_key', { ascending: false });

          if (error) throw error;
          return NextResponse.json({ success: true, snapshots: data || [], source: 'supabase' });
        }

        // Prioritaskan baca dari tabel-tabel ternormalisasi Supabase
        try {
          const normData = await getNormalizedSnapshotFromSupabase(supabase, key);
          if (normData) {
            return NextResponse.json({ success: true, data: normData, source: 'supabase_normalized' });
          }
        } catch (normGetErr) {
          console.warn('Supabase normalized read failed, falling back to legacy:', normGetErr);
        }

        let query = supabase
          .from('warehouse_snapshots')
          .select('*')
          .like('snapshot_key', 'snap_%');
        if (key === 'latest') {
          query = query.order('snapshot_key', { ascending: false }).limit(1);
        } else {
          query = query.eq('snapshot_key', key).limit(1);
        }

        const { data, error } = await query;
        if (error) throw error;

        const row = data && data.length > 0 ? data[0] : null;
        if (!row) {
          return NextResponse.json({ success: true, data: null });
        }

        let pipeCapacities = parseJsonSafe(row.pipe_capacities, []);
        let fastSlowData = parseJsonSafe(row.fast_slow_data, []);
        let coilStripData = parseJsonSafe(row.coil_strip_data, []);
        let ncWarehouseData = parseJsonSafe(row.nc_warehouse_data, []);
        let ncItems = parseJsonSafe(row.nc_items, []);
        let looSTData = parseJsonSafe(row.loo_st_data, []);
        let looLTData = parseJsonSafe(row.loo_lt_data, []);
        let unfifoData = parseJsonSafe(row.unfifo_data, []);
        let unfifoCoilData = parseJsonSafe(row.unfifo_coil_data, []);
        let unfifoPipeData = parseJsonSafe(row.unfifo_pipe_data, []);
        let damagedPackagingData = parseJsonSafe(row.damaged_packaging_data, []);
        let incomingPackagingData = parseJsonSafe(row.incoming_packaging_data, []);
        let ncProgressData = parseJsonSafe(row.nc_progress_data, []);
        let stoData = parseJsonSafe(row.sto_data, []);
        let customerBreakdown = parseJsonSafe(row.customer_breakdown, {});

        const needsLegacyFallback =
          !hasRealPipe(pipeCapacities) ||
          !hasArray(fastSlowData) ||
          !hasRealCoil(coilStripData) ||
          !hasArray(ncWarehouseData) ||
          !hasArray(ncItems) ||
          !hasArray(looSTData) ||
          !hasArray(looLTData) ||
          !hasArray(unfifoData) ||
          !hasArray(unfifoCoilData) ||
          !hasArray(unfifoPipeData) ||
          !hasArray(damagedPackagingData) ||
          !hasArray(ncProgressData) ||
          !hasArray(stoData) ||
          !hasObject(customerBreakdown);

        if (needsLegacyFallback) {
          const { data: legRows } = await supabase
            .from('warehouse_snapshots')
            .select('*')
            .neq('snapshot_key', row.snapshot_key)
            .like('snapshot_key', 'snap_%')
            .order('snapshot_key', { ascending: false })
            .limit(10);

          if (legRows && legRows.length > 0) {
            for (const lr of legRows) {
              if (!hasRealPipe(pipeCapacities)) {
                const p = parseJsonSafe(lr.pipe_capacities, []);
                if (hasRealPipe(p)) pipeCapacities = p;
              }
              if (!hasArray(fastSlowData)) {
                const p = parseJsonSafe(lr.fast_slow_data, []);
                if (hasArray(p)) fastSlowData = p;
              }
              if (!hasRealCoil(coilStripData)) {
                const p = parseJsonSafe(lr.coil_strip_data, []);
                if (hasRealCoil(p)) coilStripData = p;
              }
              if (!hasArray(ncWarehouseData)) {
                const p = parseJsonSafe(lr.nc_warehouse_data, []);
                if (hasArray(p)) ncWarehouseData = p;
              }
              if (!hasArray(ncItems)) {
                const p = parseJsonSafe(lr.nc_items, []);
                if (hasArray(p)) ncItems = p;
              }
              if (!hasArray(looSTData)) {
                const p = parseJsonSafe(lr.loo_st_data, []);
                if (hasArray(p)) looSTData = p;
              }
              if (!hasArray(looLTData)) {
                const p = parseJsonSafe(lr.loo_lt_data, []);
                if (hasArray(p)) looLTData = p;
              }
              if (!hasArray(unfifoData)) {
                const p = parseJsonSafe(lr.unfifo_data, []);
                if (hasArray(p)) unfifoData = p;
              }
              if (!hasArray(unfifoCoilData)) {
                const p = parseJsonSafe(lr.unfifo_coil_data, []);
                if (hasArray(p)) unfifoCoilData = p;
              }
              if (!hasArray(unfifoPipeData)) {
                const p = parseJsonSafe(lr.unfifo_pipe_data, []);
                if (hasArray(p)) unfifoPipeData = p;
              }
              if (!hasArray(damagedPackagingData)) {
                const p = parseJsonSafe(lr.damaged_packaging_data, []);
                if (hasArray(p)) damagedPackagingData = p;
              }
              if (!hasArray(incomingPackagingData)) {
                const p = parseJsonSafe(lr.incoming_packaging_data, []);
                if (hasArray(p)) incomingPackagingData = p;
              }
              if (!hasArray(ncProgressData)) {
                const p = parseJsonSafe(lr.nc_progress_data, []);
                if (hasArray(p)) ncProgressData = p;
              }
              if (!hasArray(stoData)) {
                const p = parseJsonSafe(lr.sto_data, []);
                if (hasArray(p)) stoData = p;
              }
              if (!hasObject(customerBreakdown)) {
                const p = parseJsonSafe(lr.customer_breakdown, {});
                if (hasObject(p)) customerBreakdown = p;
              }
            }
          }
        }

        const parsedData = {
          snapshotKey: row.snapshot_key,
          lastUpdated: row.last_updated,
          pipeCapacities,
          fastSlowData,
          coilStripData,
          ncWarehouseData,
          ncItems,
          looSTData,
          looLTData,
          unfifoData,
          unfifoCoilData,
          unfifoPipeData,
          damagedPackagingData,
          incomingPackagingData,
          ncProgressData,
          stoData,
          customerBreakdown,
          createdAt: row.created_at,
        };

        return NextResponse.json({ success: true, data: parsedData, source: 'supabase' });
      } catch (supaErr) {
        console.warn('Supabase query failed:', supaErr);
      }
    }

    return NextResponse.json({ success: true, data: null, snapshots: [] });
  } catch (error: unknown) {
    console.error('Failed to get warehouse data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      pipeCapacities,
      fastSlowData,
      coilStripData,
      ncWarehouseData,
      ncItems,
      looSTData,
      looLTData,
      unfifoData,
      unfifoCoilData,
      unfifoPipeData,
      damagedPackagingData,
      incomingPackagingData,
      ncProgressData,
      stoData,
      customerBreakdown,
      lastUpdated,
      snapshotKey,
      uploadedCategories,
    } = body;

    const nowStr = lastUpdated || new Date().toLocaleString('id-ID');
    const dateKey = snapshotKey || `snap_${new Date().toISOString().slice(0, 10)}`;

    const db = getLocalDb();

    // 1. Ambil data snapshot eksisting untuk smart-merge upload parsial
    let prevPipe: any[] = [];
    let prevFastSlow: any[] = [];
    let prevCoil: any[] = [];
    let prevNcWh: any[] = [];
    let prevNcItems: any[] = [];
    let prevLooST: any[] = [];
    let prevLooLT: any[] = [];
    let prevUnfifo: any[] = [];
    let prevUnfifoCoil: any[] = [];
    let prevUnfifoPipe: any[] = [];
    let prevDamagedPkg: any[] = [];
    let prevIncomingPkg: any[] = [];
    let prevNcProgress: any[] = [];
    let prevStoData: any[] = [];
    let prevCustBreakdown: Record<string, any> = {};

    if (db) {
      try {
        let existingRow = db.prepare('SELECT * FROM warehouse_snapshots WHERE snapshot_key = ? LIMIT 1').get(dateKey) as any;
        if (!existingRow) {
          existingRow = db.prepare('SELECT * FROM warehouse_snapshots WHERE snapshot_key LIKE "snap_%" ORDER BY snapshot_key DESC LIMIT 1').get() as any;
        }

        if (existingRow) {
          prevPipe = parseJsonSafe(existingRow.pipe_capacities, []);
          prevFastSlow = parseJsonSafe(existingRow.fast_slow_data, []);
          prevCoil = parseJsonSafe(existingRow.coil_strip_data, []);
          prevNcWh = parseJsonSafe(existingRow.nc_warehouse_data, []);
          prevNcItems = parseJsonSafe(existingRow.nc_items, []);
          prevLooST = parseJsonSafe(existingRow.loo_st_data, []);
          prevLooLT = parseJsonSafe(existingRow.loo_lt_data, []);
          prevUnfifo = parseJsonSafe(existingRow.unfifo_data, []);
          prevUnfifoCoil = parseJsonSafe(existingRow.unfifo_coil_data, []);
          prevUnfifoPipe = parseJsonSafe(existingRow.unfifo_pipe_data, []);
          prevDamagedPkg = parseJsonSafe(existingRow.damaged_packaging_data, []);
          prevIncomingPkg = parseJsonSafe(existingRow.incoming_packaging_data, []);
          prevNcProgress = parseJsonSafe(existingRow.nc_progress_data, []);
          prevStoData = parseJsonSafe(existingRow.sto_data, []);
          prevCustBreakdown = parseJsonSafe(existingRow.customer_breakdown, {});
        }

        // Multi-snapshot fallback: jika snapshot saat ini/terakhir kekurangan modul data tertentu,
        // cari mundur ke snapshot sebelumnya yang memuat data valid
        if (!hasRealPipe(prevPipe)) {
          const raw = getLatestNonEmptySqliteCol(db, 'pipe_capacities', 10);
          const p = parseJsonSafe(raw, []);
          if (hasRealPipe(p)) prevPipe = p;
        }
        if (!hasArray(prevFastSlow)) {
          const raw = getLatestNonEmptySqliteCol(db, 'fast_slow_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevFastSlow = p;
        }
        if (!hasRealCoil(prevCoil) && !hasArray(prevCoil)) {
          const raw = getLatestNonEmptySqliteCol(db, 'coil_strip_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasRealCoil(p) || hasArray(p)) prevCoil = p;
        }
        if (!hasArray(prevNcWh)) {
          const raw = getLatestNonEmptySqliteCol(db, 'nc_warehouse_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevNcWh = p;
        }
        if (!hasArray(prevNcItems)) {
          const raw = getLatestNonEmptySqliteCol(db, 'nc_items', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevNcItems = p;
        }
        if (!hasArray(prevLooST)) {
          const raw = getLatestNonEmptySqliteCol(db, 'loo_st_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevLooST = p;
        }
        if (!hasArray(prevLooLT)) {
          const raw = getLatestNonEmptySqliteCol(db, 'loo_lt_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevLooLT = p;
        }
        if (!hasArray(prevUnfifo)) {
          const raw = getLatestNonEmptySqliteCol(db, 'unfifo_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevUnfifo = p;
        }
        if (!hasArray(prevUnfifoCoil)) {
          const raw = getLatestNonEmptySqliteCol(db, 'unfifo_coil_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevUnfifoCoil = p;
        }
        if (!hasArray(prevUnfifoPipe)) {
          const raw = getLatestNonEmptySqliteCol(db, 'unfifo_pipe_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevUnfifoPipe = p;
        }
        if (!hasArray(prevDamagedPkg)) {
          const raw = getLatestNonEmptySqliteCol(db, 'damaged_packaging_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevDamagedPkg = p;
        }
        if (!hasArray(prevIncomingPkg)) {
          const raw = getLatestNonEmptySqliteCol(db, 'incoming_packaging_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevIncomingPkg = p;
        }
        if (!hasArray(prevNcProgress)) {
          const raw = getLatestNonEmptySqliteCol(db, 'nc_progress_data', 5);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevNcProgress = p;
        }
        if (!hasArray(prevStoData)) {
          const raw = getLatestNonEmptySqliteCol(db, 'sto_data', 10);
          const p = parseJsonSafe(raw, []);
          if (hasArray(p)) prevStoData = p;
        }
        if (!hasObject(prevCustBreakdown)) {
          const raw = getLatestNonEmptySqliteCol(db, 'customer_breakdown', 5);
          const p = parseJsonSafe(raw, {});
          if (hasObject(p)) prevCustBreakdown = p;
        }

      } catch (err) {
        console.warn('Failed to read existing SQLite row for merge:', err);
      }
    }

    // Fallback baca data referensi dari Supabase jika SQLite kosong / parsial (terutama di Vercel/Cloud deploy)
    const needsCloudFallback =
      !hasRealPipe(prevPipe) ||
      !hasArray(prevFastSlow) ||
      !hasRealCoil(prevCoil) ||
      !hasArray(prevNcWh) ||
      !hasArray(prevNcItems) ||
      !hasArray(prevLooST) ||
      !hasArray(prevLooLT) ||
      !hasArray(prevUnfifo) ||
      !hasArray(prevUnfifoCoil) ||
      !hasArray(prevUnfifoPipe) ||
      !hasArray(prevDamagedPkg) ||
      !hasArray(prevNcProgress) ||
      !hasArray(prevStoData) ||
      !hasObject(prevCustBreakdown);

    if (needsCloudFallback && isSupabaseConfigured && supabase) {
      try {
        let cloudRef: any = null;
        try {
          cloudRef = await getNormalizedSnapshotFromSupabase(supabase, dateKey);
          if (!cloudRef) {
            cloudRef = await getNormalizedSnapshotFromSupabase(supabase, 'latest');
          }
        } catch {
          // Fallback legacy table
        }

        if (cloudRef) {
          if (!hasRealPipe(prevPipe)) prevPipe = cloudRef.pipeCapacities || [];
          if (!hasArray(prevFastSlow)) prevFastSlow = cloudRef.fastSlowData || [];
          if (!hasRealCoil(prevCoil)) prevCoil = cloudRef.coilStripData || [];
          if (!hasArray(prevNcWh)) prevNcWh = cloudRef.ncWarehouseData || [];
          if (!hasArray(prevNcItems)) prevNcItems = cloudRef.ncItems || [];
          if (!hasArray(prevLooST)) prevLooST = cloudRef.looSTData || [];
          if (!hasArray(prevLooLT)) prevLooLT = cloudRef.looLTData || [];
          if (!hasArray(prevUnfifo)) prevUnfifo = cloudRef.unfifoData || [];
          if (!hasArray(prevUnfifoCoil)) prevUnfifoCoil = cloudRef.unfifoCoilData || [];
          if (!hasArray(prevUnfifoPipe)) prevUnfifoPipe = cloudRef.unfifoPipeData || [];
          if (!hasArray(prevDamagedPkg)) prevDamagedPkg = cloudRef.damagedPackagingData || [];
          if (!hasArray(prevNcProgress)) prevNcProgress = cloudRef.ncProgressData || [];
          if (!hasArray(prevStoData)) prevStoData = cloudRef.stoData || [];
          if (!hasObject(prevCustBreakdown)) prevCustBreakdown = cloudRef.customerBreakdown || {};
        }

        // Secondary fallback to legacy warehouse_snapshots if any module is still missing
        const stillMissing =
          !hasRealPipe(prevPipe) ||
          !hasArray(prevFastSlow) ||
          !hasRealCoil(prevCoil) ||
          !hasArray(prevNcWh) ||
          !hasArray(prevNcItems) ||
          !hasArray(prevLooST) ||
          !hasArray(prevLooLT) ||
          !hasArray(prevUnfifo) ||
          !hasArray(prevUnfifoCoil) ||
          !hasArray(prevUnfifoPipe) ||
          !hasArray(prevDamagedPkg) ||
          !hasArray(prevNcProgress) ||
          !hasArray(prevStoData) ||
          !hasObject(prevCustBreakdown);

        if (stillMissing) {
          const { data: legacyRows } = await supabase
            .from('warehouse_snapshots')
            .select('*')
            .like('snapshot_key', 'snap_%')
            .order('snapshot_key', { ascending: false })
            .limit(10);

          if (legacyRows && legacyRows.length > 0) {
            for (const sRow of legacyRows) {
              if (!hasRealPipe(prevPipe)) {
                const p = parseJsonSafe(sRow.pipe_capacities, []);
                if (hasRealPipe(p)) prevPipe = p;
              }
              if (!hasArray(prevFastSlow)) {
                const p = parseJsonSafe(sRow.fast_slow_data, []);
                if (hasArray(p)) prevFastSlow = p;
              }
              if (!hasRealCoil(prevCoil)) {
                const p = parseJsonSafe(sRow.coil_strip_data, []);
                if (hasRealCoil(p)) prevCoil = p;
              }
              if (!hasArray(prevNcWh)) {
                const p = parseJsonSafe(sRow.nc_warehouse_data, []);
                if (hasArray(p)) prevNcWh = p;
              }
              if (!hasArray(prevNcItems)) {
                const p = parseJsonSafe(sRow.nc_items, []);
                if (hasArray(p)) prevNcItems = p;
              }
              if (!hasArray(prevLooST)) {
                const p = parseJsonSafe(sRow.loo_st_data, []);
                if (hasArray(p)) prevLooST = p;
              }
              if (!hasArray(prevLooLT)) {
                const p = parseJsonSafe(sRow.loo_lt_data, []);
                if (hasArray(p)) prevLooLT = p;
              }
              if (!hasArray(prevUnfifo)) {
                const p = parseJsonSafe(sRow.unfifo_data, []);
                if (hasArray(p)) prevUnfifo = p;
              }
              if (!hasArray(prevUnfifoCoil)) {
                const p = parseJsonSafe(sRow.unfifo_coil_data, []);
                if (hasArray(p)) prevUnfifoCoil = p;
              }
              if (!hasArray(prevUnfifoPipe)) {
                const p = parseJsonSafe(sRow.unfifo_pipe_data, []);
                if (hasArray(p)) prevUnfifoPipe = p;
              }
              if (!hasArray(prevDamagedPkg)) {
                const p = parseJsonSafe(sRow.damaged_packaging_data, []);
                if (hasArray(p)) prevDamagedPkg = p;
              }
              if (!hasArray(prevIncomingPkg)) {
                const p = parseJsonSafe(sRow.incoming_packaging_data, []);
                if (hasArray(p)) prevIncomingPkg = p;
              }
              if (!hasArray(prevNcProgress)) {
                const p = parseJsonSafe(sRow.nc_progress_data, []);
                if (hasArray(p)) prevNcProgress = p;
              }
              if (!hasArray(prevStoData)) {
                const p = parseJsonSafe(sRow.sto_data, []);
                if (hasArray(p)) prevStoData = p;
              }
              if (!hasObject(prevCustBreakdown)) {
                const p = parseJsonSafe(sRow.customer_breakdown, {});
                if (hasObject(p)) prevCustBreakdown = p;
              }
            }
          }
        }
      } catch (cloudMergeErr) {
        console.warn('Failed to query Supabase for merge fallback:', cloudMergeErr);
      }
    }

    // Helper untuk memperkaya item LOO dengan stock pipa eksisting jika diupload parsial
    const enrichLoo = (currentLoo: any[], referenceLoo: any[]) => {
      if (!Array.isArray(currentLoo) || currentLoo.length === 0) return currentLoo;
      if (!Array.isArray(referenceLoo) || referenceLoo.length === 0) return currentLoo;

      const refMap = new Map<string, any>();
      for (const item of referenceLoo) {
        if (item.kodeMaterial) refMap.set(item.kodeMaterial, item);
        if (item.ukuran) refMap.set(item.ukuran, item);
      }

      return currentLoo.map((item) => {
        if ((item.totalStockTon || 0) > 0) return item;
        const ref = refMap.get(item.kodeMaterial) || refMap.get(item.ukuran);
        if (!ref || (ref.totalStockTon || 0) === 0) return item;

        const fgTon = ref.fgTon || 0;
        const wipTon = ref.wipTon || 0;
        const totalStockTon = ref.totalStockTon || (fgTon + wipTon);
        const primeTon = ref.primeTon || 0;
        const looTon = item.looTon || 0;
        const persenFulfillment = looTon > 0 ? (totalStockTon / looTon) * 100 : 100;
        const primeFulfillment = looTon > 0 ? (primeTon / looTon) * 100 : 100;

        return {
          ...item,
          fgTon,
          wipTon,
          totalStockTon,
          primeTon,
          gradeCTon: ref.gradeCTon || 0,
          gradeETon: ref.gradeETon || 0,
          grade: ref.grade || item.grade || 'PRIME',
          gudang: ref.gudang || item.gudang,
          gudangs: ref.gudangs || item.gudangs,
          gudangBreakdown: ref.gudangBreakdown || item.gudangBreakdown,
          fgQty: ref.fgQty || item.fgQty || 0,
          wipQty: ref.wipQty || item.wipQty || 0,
          totalQty: ref.totalQty || item.totalQty || 0,
          persenFulfillment: Number(persenFulfillment.toFixed(1)),
          primeFulfillment: Number(primeFulfillment.toFixed(1)),
        };
      });
    };

    const isExplicitUpload = Array.isArray(uploadedCategories) && uploadedCategories.length > 0;
    const uploadHasPipe = isExplicitUpload ? uploadedCategories.includes('pipe') : hasRealPipe(pipeCapacities);
    const uploadHasCoil = isExplicitUpload ? uploadedCategories.includes('coil') : hasRealCoil(coilStripData);
    const uploadHasLoo = isExplicitUpload ? uploadedCategories.includes('loo') : (hasArray(looSTData) || hasArray(looLTData));
    const uploadHasDamagedPkg = isExplicitUpload ? uploadedCategories.includes('damaged_pkg') : hasArray(damagedPackagingData);
    const uploadHasIncomingPkg = isExplicitUpload ? uploadedCategories.includes('incoming_pkg') : hasArray(incomingPackagingData);
    const uploadHasProgressNC = isExplicitUpload ? uploadedCategories.includes('progress_nc') : hasArray(ncProgressData);
    const uploadHasSTO = isExplicitUpload ? uploadedCategories.includes('sto') : hasArray(stoData);

    const finalPipe = uploadHasPipe && hasRealPipe(pipeCapacities) ? pipeCapacities : (hasRealPipe(prevPipe) ? prevPipe : (pipeCapacities || []));
    const finalFastSlow = uploadHasPipe && hasArray(fastSlowData) ? fastSlowData : prevFastSlow;
    const finalCoil = uploadHasCoil && (hasRealCoil(coilStripData) || (coilStripData && coilStripData.length > 0))
      ? coilStripData
      : (hasRealCoil(prevCoil) ? prevCoil : (coilStripData || []));
    const finalNcWh = uploadHasPipe && hasArray(ncWarehouseData) ? ncWarehouseData : (hasArray(prevNcWh) ? prevNcWh : (ncWarehouseData || []));
    const finalNcItems = uploadHasPipe && hasArray(ncItems) ? ncItems : prevNcItems;
    const rawLooST = uploadHasLoo && hasArray(looSTData) ? looSTData : prevLooST;
    const rawLooLT = uploadHasLoo && hasArray(looLTData) ? looLTData : prevLooLT;
    const finalLooST = uploadHasPipe ? rawLooST : enrichLoo(rawLooST, prevLooST);
    const finalLooLT = uploadHasPipe ? rawLooLT : enrichLoo(rawLooLT, prevLooLT);
    const finalUnfifo = (uploadHasPipe || uploadHasCoil) && hasArray(unfifoData) ? unfifoData : prevUnfifo;
    const finalUnfifoCoil = uploadHasCoil ? (unfifoCoilData || []) : (hasArray(prevUnfifoCoil) ? prevUnfifoCoil : (unfifoCoilData || []));
    const finalUnfifoPipe = uploadHasPipe && hasArray(unfifoPipeData) ? unfifoPipeData : prevUnfifoPipe;
    const finalDamagedPkg = uploadHasDamagedPkg && hasArray(damagedPackagingData) ? damagedPackagingData : prevDamagedPkg;
    const finalIncomingPkg = uploadHasIncomingPkg && hasArray(incomingPackagingData) ? incomingPackagingData : prevIncomingPkg;
    const finalNcProgress = uploadHasProgressNC && hasArray(ncProgressData) ? ncProgressData : prevNcProgress;
    const finalStoData = uploadHasSTO ? (Array.isArray(stoData) ? stoData : []) : prevStoData;
    const finalCustBreakdown = uploadHasPipe && hasObject(customerBreakdown) ? customerBreakdown : prevCustBreakdown;

    let sqliteSaved = false;

    // 2. SIMPAN KE SQLITE
    if (db) {
      try {
        const upsertStmt = db.prepare(`
          INSERT INTO warehouse_snapshots (
            snapshot_key,
            last_updated,
            pipe_capacities,
            fast_slow_data,
            coil_strip_data,
            nc_warehouse_data,
            nc_items,
            loo_st_data,
            loo_lt_data,
            unfifo_data,
            unfifo_coil_data,
            unfifo_pipe_data,
            damaged_packaging_data,
            incoming_packaging_data,
            nc_progress_data,
            sto_data,
            customer_breakdown
          ) VALUES (
            @snapshotKey,
            @lastUpdated,
            @pipeCapacities,
            @fastSlowData,
            @coilStripData,
            @ncWarehouseData,
            @ncItems,
            @looSTData,
            @looLTData,
            @unfifoData,
            @unfifoCoilData,
            @unfifoPipeData,
            @damagedPackagingData,
            @incomingPackagingData,
            @ncProgressData,
            @stoData,
            @customerBreakdown
          )
          ON CONFLICT(snapshot_key) DO UPDATE SET
            last_updated = excluded.last_updated,
            pipe_capacities = excluded.pipe_capacities,
            fast_slow_data = excluded.fast_slow_data,
            coil_strip_data = excluded.coil_strip_data,
            nc_warehouse_data = excluded.nc_warehouse_data,
            nc_items = excluded.nc_items,
            loo_st_data = excluded.loo_st_data,
            loo_lt_data = excluded.loo_lt_data,
            unfifo_data = excluded.unfifo_data,
            unfifo_coil_data = excluded.unfifo_coil_data,
            unfifo_pipe_data = excluded.unfifo_pipe_data,
            damaged_packaging_data = excluded.damaged_packaging_data,
            incoming_packaging_data = excluded.incoming_packaging_data,
            nc_progress_data = excluded.nc_progress_data,
            sto_data = excluded.sto_data,
            customer_breakdown = excluded.customer_breakdown,
            created_at = CURRENT_TIMESTAMP;
        `);

        upsertStmt.run({
          snapshotKey: dateKey,
          lastUpdated: nowStr,
          pipeCapacities: JSON.stringify(finalPipe),
          fastSlowData: JSON.stringify(finalFastSlow),
          coilStripData: JSON.stringify(finalCoil),
          ncWarehouseData: JSON.stringify(finalNcWh),
          ncItems: JSON.stringify(finalNcItems),
          looSTData: JSON.stringify(finalLooST),
          looLTData: JSON.stringify(finalLooLT),
          unfifoData: JSON.stringify(finalUnfifo),
          unfifoCoilData: JSON.stringify(finalUnfifoCoil),
          unfifoPipeData: JSON.stringify(finalUnfifoPipe),
          damagedPackagingData: JSON.stringify(finalDamagedPkg),
          incomingPackagingData: JSON.stringify(finalIncomingPkg),
          ncProgressData: JSON.stringify(finalNcProgress),
          stoData: JSON.stringify(finalStoData),
          customerBreakdown: JSON.stringify(finalCustBreakdown),
        });
        sqliteSaved = true;

        // Simpan ke tabel-tabel SQLite ternormalisasi
        const normDb = getNormDb();
        if (normDb?.saveNormalizedSnapshot) {
          try {
            normDb.saveNormalizedSnapshot(db, {
              snapshotKey: dateKey,
              lastUpdated: nowStr,
              pipeCapacities: finalPipe,
              fastSlowData: finalFastSlow,
              coilStripData: finalCoil,
              ncWarehouseData: finalNcWh,
              ncItems: finalNcItems,
              looSTData: finalLooST,
              looLTData: finalLooLT,
              unfifoData: finalUnfifo,
              unfifoCoilData: finalUnfifoCoil,
              unfifoPipeData: finalUnfifoPipe,
              damagedPackagingData: finalDamagedPkg,
              ncProgressData: finalNcProgress,
              stoData: finalStoData,
              customerBreakdown: finalCustBreakdown,
            });
          } catch (normSaveErr) {
            console.warn('Normalized tables save warning:', normSaveErr);
          }
        }
      } catch (dbSaveErr) {
        console.error('SQLite Save Error:', dbSaveErr);
      }
    }

    // 3. SINKRONKAN KE SUPABASE (Primary ke tabel ternormalisasi, secondary legacy)
    let supabaseSaved = false;
    if (isSupabaseConfigured && supabase) {
      try {
        // 3a. SIMPAN KE TABEL-TABEL TERNORMALISASI (Primary)
        try {
          await saveNormalizedSnapshotToSupabase(supabase, {
            snapshotKey: dateKey,
            lastUpdated: nowStr,
            pipeCapacities: finalPipe,
            fastSlowData: finalFastSlow,
            coilStripData: finalCoil,
            ncWarehouseData: finalNcWh,
            ncItems: finalNcItems,
            looSTData: finalLooST,
            looLTData: finalLooLT,
            unfifoData: finalUnfifo,
            unfifoCoilData: finalUnfifoCoil,
            unfifoPipeData: finalUnfifoPipe,
            damagedPackagingData: finalDamagedPkg,
            ncProgressData: finalNcProgress,
            stoData: finalStoData,
            customerBreakdown: finalCustBreakdown,
          });
          supabaseSaved = true;
        } catch (normSaveErr) {
          console.warn('Supabase normalized tables save warning:', normSaveErr);
        }

        // 3b. Simpan juga ke legacy warehouse_snapshots sebagai fallback / backward compatibility
        const payload = {
          snapshot_key: dateKey,
          last_updated: nowStr,
          pipe_capacities: finalPipe,
          fast_slow_data: finalFastSlow,
          coil_strip_data: finalCoil,
          nc_warehouse_data: finalNcWh,
          nc_items: finalNcItems,
          loo_st_data: finalLooST,
          loo_lt_data: finalLooLT,
          unfifo_data: finalUnfifo,
          unfifo_coil_data: finalUnfifoCoil,
          unfifo_pipe_data: finalUnfifoPipe,
          damaged_packaging_data: finalDamagedPkg,
          incoming_packaging_data: finalIncomingPkg,
          nc_progress_data: finalNcProgress,
          sto_data: finalStoData,
          customer_breakdown: finalCustBreakdown,
        };

        let { error: supaErr } = await supabase
          .from('warehouse_snapshots')
          .upsert(payload, { onConflict: 'snapshot_key' });

        // Fallback jika kolom nc_progress_data atau sto_data belum ada di schema Supabase
        if (supaErr && (supaErr.message?.includes('nc_progress_data') || supaErr.message?.includes('sto_data'))) {
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as any).nc_progress_data;
          delete (fallbackPayload as any).sto_data;
          const retry = await supabase
            .from('warehouse_snapshots')
            .upsert(fallbackPayload, { onConflict: 'snapshot_key' });
          supaErr = retry.error;
        }

        if (!supaErr) {
          supabaseSaved = true;
        } else {
          console.warn('Supabase sync warning (data tetap aman di SQLite):', supaErr);
        }
      } catch (cloudErr) {
        console.warn('Supabase sync network error (data tetap aman di SQLite):', cloudErr);
      }
    }

    if (sqliteSaved || supabaseSaved || isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        message: 'Snapshot tersimpan dengan sukses',
        snapshotKey: dateKey,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Saved in-memory only (Database unconfigured)',
      snapshotKey: dateKey,
    });
  } catch (error: unknown) {
    console.error('Failed to save warehouse data:', error);
    return NextResponse.json(
      { success: false, error: `Gagal menyimpan data: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const date = searchParams.get('date');

    let targetKey: string | null = null;
    if (key && key.trim() !== '') {
      targetKey = key.trim();
    } else if (date && date.trim() !== '') {
      const cleanDate = date.trim();
      targetKey = cleanDate.startsWith('snap_') ? cleanDate : `snap_${cleanDate}`;
    }

    const db = getLocalDb();

    // Resolusi key aktual jika targetKey adalah 'latest'
    if (targetKey === 'latest' || targetKey === 'snap_latest') {
      targetKey = null;
      if (db) {
        try {
          const row = db.prepare("SELECT snapshot_key FROM warehouse_snapshots WHERE snapshot_key LIKE 'snap_%' ORDER BY snapshot_key DESC LIMIT 1").get() as any;
          if (row?.snapshot_key) targetKey = row.snapshot_key;
        } catch {}
      }
      if (!targetKey && isSupabaseConfigured && supabase) {
        try {
          const { data: sRows } = await supabase.from('snapshots').select('snapshot_key').like('snapshot_key', 'snap_%').order('snapshot_key', { ascending: false }).limit(1);
          if (sRows && sRows.length > 0) {
            targetKey = sRows[0].snapshot_key;
          } else {
            const { data: wRows } = await supabase.from('warehouse_snapshots').select('snapshot_key').like('snapshot_key', 'snap_%').order('snapshot_key', { ascending: false }).limit(1);
            if (wRows && wRows.length > 0) targetKey = wRows[0].snapshot_key;
          }
        } catch {}
      }
    }

    if (targetKey) {
      const altKey = targetKey.startsWith('snap_') ? targetKey.replace('snap_', '') : `snap_${targetKey}`;
      const keys = [targetKey, altKey];

      // 1. Hapus snapshot spesifik dari SQLite
      if (db) {
        db.prepare('DELETE FROM warehouse_snapshots WHERE snapshot_key IN (?, ?)').run(targetKey, altKey);
        const normDb = getNormDb();
        if (normDb?.deleteNormalizedSnapshot) {
          try {
            normDb.deleteNormalizedSnapshot(db, targetKey);
          } catch (e) {
            console.warn('Failed to delete normalized snapshot:', e);
          }
        }
      }

      // 2. Hapus snapshot spesifik dari Supabase jika terkonfigurasi
      if (isSupabaseConfigured && supabase) {
        try {
          const { error: whErr } = await supabase.from('warehouse_snapshots').delete().in('snapshot_key', keys);
          if (whErr) console.warn('Supabase delete warehouse_snapshots error:', whErr);
        } catch (supErr) {
          console.warn('Supabase delete snapshot error:', supErr);
        }
        try {
          await deleteNormalizedSnapshotFromSupabase(supabase, keys);
        } catch (normErr) {
          console.warn('Supabase delete normalized snapshot error:', normErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Arsip data tanggal ${targetKey.replace('snap_', '')} berhasil dihapus.`,
        deletedKey: targetKey
      });
    }

    // Jika tanpa parameter key/date: Reset semua snapshot ke data awal (perilaku lama)
    if (db) {
      db.prepare('DELETE FROM warehouse_snapshots').run();
      const normDb = getNormDb();
      if (normDb?.deleteAllNormalizedSnapshots) {
        try {
          normDb.deleteAllNormalizedSnapshots(db);
        } catch (e) {
          console.warn('Failed to reset normalized snapshots:', e);
        }
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: whResetErr } = await supabase.from('warehouse_snapshots').delete().like('snapshot_key', '%');
        if (whResetErr) console.warn('Supabase reset warehouse_snapshots error:', whResetErr);
      } catch (supErr) {
        console.warn('Supabase reset warehouse_snapshots error:', supErr);
      }
      try {
        await deleteAllNormalizedSnapshotsFromSupabase(supabase);
      } catch (normErr) {
        console.warn('Supabase reset normalized error:', normErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Semua snapshot data berhasil di-reset.' });
  } catch (error: unknown) {
    console.error('Failed to reset warehouse snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mereset data snapshot' },
      { status: 500 }
    );
  }
}
