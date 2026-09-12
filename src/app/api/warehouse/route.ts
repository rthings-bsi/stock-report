import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'latest';
    const listOnly = searchParams.get('list') === 'true';

    // 1. Coba baca dari SQLite lokal terlebih dahulu (respons instan)
    const db = getLocalDb();
    if (db) {
      try {
        if (listOnly) {
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
        } else {
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
            const data = {
              snapshotKey: row.snapshot_key,
              lastUpdated: row.last_updated,
              pipeCapacities: parseJsonSafe(row.pipe_capacities, []),
              fastSlowData: parseJsonSafe(row.fast_slow_data, []),
              coilStripData: parseJsonSafe(row.coil_strip_data, []),
              ncWarehouseData: parseJsonSafe(row.nc_warehouse_data, []),
              ncItems: parseJsonSafe(row.nc_items, []),
              looSTData: parseJsonSafe(row.loo_st_data, []),
              looLTData: parseJsonSafe(row.loo_lt_data, []),
              unfifoData: parseJsonSafe(row.unfifo_data, []),
              unfifoCoilData: parseJsonSafe(row.unfifo_coil_data, []),
              unfifoPipeData: parseJsonSafe(row.unfifo_pipe_data, []),
              damagedPackagingData: parseJsonSafe(row.damaged_packaging_data, []),
              incomingPackagingData: parseJsonSafe(row.incoming_packaging_data, []),
              ncProgressData: parseJsonSafe(row.nc_progress_data, []),
              customerBreakdown: parseJsonSafe(row.customer_breakdown, {}),
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
          const { data, error } = await supabase
            .from('warehouse_snapshots')
            .select('snapshot_key, last_updated, created_at')
            .like('snapshot_key', 'snap_%')
            .order('snapshot_key', { ascending: false });

          if (error) throw error;
          return NextResponse.json({ success: true, snapshots: data || [], source: 'supabase' });
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

        const parsedData = {
          snapshotKey: row.snapshot_key,
          lastUpdated: row.last_updated,
          pipeCapacities: parseJsonSafe(row.pipe_capacities, []),
          fastSlowData: parseJsonSafe(row.fast_slow_data, []),
          coilStripData: parseJsonSafe(row.coil_strip_data, []),
          ncWarehouseData: parseJsonSafe(row.nc_warehouse_data, []),
          ncItems: parseJsonSafe(row.nc_items, []),
          looSTData: parseJsonSafe(row.loo_st_data, []),
          looLTData: parseJsonSafe(row.loo_lt_data, []),
          unfifoData: parseJsonSafe(row.unfifo_data, []),
          unfifoCoilData: parseJsonSafe(row.unfifo_coil_data, []),
          unfifoPipeData: parseJsonSafe(row.unfifo_pipe_data, []),
          damagedPackagingData: parseJsonSafe(row.damaged_packaging_data, []),
          incomingPackagingData: parseJsonSafe(row.incoming_packaging_data, []),
          ncProgressData: parseJsonSafe(row.nc_progress_data, []),
          customerBreakdown: parseJsonSafe(row.customer_breakdown, {}),
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
      customerBreakdown,
      lastUpdated,
      snapshotKey,
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
          prevCustBreakdown = parseJsonSafe(existingRow.customer_breakdown, {});
        }
      } catch (err) {
        console.warn('Failed to read existing SQLite row for merge:', err);
      }
    }

    const finalPipe = hasRealPipe(pipeCapacities) ? pipeCapacities : (hasRealPipe(prevPipe) ? prevPipe : (pipeCapacities || []));
    const finalFastSlow = hasArray(fastSlowData) ? fastSlowData : prevFastSlow;
    const finalCoil = hasRealCoil(coilStripData) ? coilStripData : (hasRealCoil(prevCoil) ? prevCoil : (coilStripData || []));
    const finalNcWh = hasRealPipe(pipeCapacities) && hasArray(ncWarehouseData) ? ncWarehouseData : (hasRealPipe(prevNcWh) ? prevNcWh : (ncWarehouseData || []));
    const finalNcItems = hasArray(ncItems) ? ncItems : prevNcItems;
    const finalLooST = hasArray(looSTData) ? looSTData : prevLooST;
    const finalLooLT = hasArray(looLTData) ? looLTData : prevLooLT;
    const finalUnfifo = hasArray(unfifoData) ? unfifoData : prevUnfifo;
    const finalUnfifoCoil = hasArray(unfifoCoilData) ? unfifoCoilData : prevUnfifoCoil;
    const finalUnfifoPipe = hasArray(unfifoPipeData) ? unfifoPipeData : prevUnfifoPipe;
    const finalDamagedPkg = hasArray(damagedPackagingData) ? damagedPackagingData : prevDamagedPkg;
    const finalIncomingPkg = hasArray(incomingPackagingData) ? incomingPackagingData : prevIncomingPkg;
    const finalNcProgress = hasArray(ncProgressData) ? ncProgressData : prevNcProgress;
    const finalCustBreakdown = hasObject(customerBreakdown) ? customerBreakdown : prevCustBreakdown;

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
          customerBreakdown: JSON.stringify(finalCustBreakdown),
        });
        sqliteSaved = true;
      } catch (dbSaveErr) {
        console.error('SQLite Save Error:', dbSaveErr);
      }
    }

    // 3. SINKRONKAN KE SUPABASE (Non-blocking fallback)
    if (isSupabaseConfigured && supabase) {
      try {
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
          customer_breakdown: finalCustBreakdown,
        };

        let { error: supaErr } = await supabase
          .from('warehouse_snapshots')
          .upsert(payload, { onConflict: 'snapshot_key' });

        // Fallback jika kolom nc_progress_data belum ada di schema Supabase
        if (supaErr && supaErr.message?.includes('nc_progress_data')) {
          const fallbackPayload = { ...payload };
          delete (fallbackPayload as any).nc_progress_data;
          const retry = await supabase
            .from('warehouse_snapshots')
            .upsert(fallbackPayload, { onConflict: 'snapshot_key' });
          supaErr = retry.error;
        }

        if (supaErr) {
          console.warn('Supabase sync warning (data tetap aman di SQLite):', supaErr);
        }
      } catch (cloudErr) {
        console.warn('Supabase sync network error (data tetap aman di SQLite):', cloudErr);
      }
    }

    if (sqliteSaved || isSupabaseConfigured) {
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

export async function DELETE() {
  try {
    const db = getLocalDb();
    if (db) {
      db.prepare('DELETE FROM warehouse_snapshots').run();
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('warehouse_snapshots').delete().neq('id', 0);
      } catch {
        // Ignore Supabase reset error
      }
    }

    return NextResponse.json({ success: true, message: 'Snapshots reset' });
  } catch (error: unknown) {
    console.error('Failed to reset warehouse snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset snapshots' },
      { status: 500 }
    );
  }
}
