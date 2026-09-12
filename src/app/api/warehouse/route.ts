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
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return val;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'latest';
    const listOnly = searchParams.get('list') === 'true';

    // 1. JIKA MENGGUNAKAN SUPABASE
    if (isSupabaseConfigured && supabase) {
      if (listOnly) {
        const { data, error } = await supabase
          .from('warehouse_snapshots')
          .select('snapshot_key, last_updated, created_at')
          .neq('snapshot_key', 'app_settings')
          .neq('snapshot_key', 'audit_incoming_packaging')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, snapshots: data || [] });
      }

      let query = supabase
        .from('warehouse_snapshots')
        .select('*')
        .neq('snapshot_key', 'app_settings')
        .neq('snapshot_key', 'audit_incoming_packaging');
      if (key === 'latest') {
        query = query.order('created_at', { ascending: false }).limit(1);
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

      return NextResponse.json({ success: true, data: parsedData });
    }

    // 2. FALLBACK KE SQLITE LOCAL
    const db = getLocalDb();
    if (!db) {
      return NextResponse.json({ success: true, data: null, note: 'Database unconfigured' });
    }

    if (listOnly) {
      const listStmt = db.prepare(`
        SELECT snapshot_key, last_updated, created_at
        FROM warehouse_snapshots
        ORDER BY created_at DESC
      `);
      const rows = listStmt.all();
      return NextResponse.json({ success: true, snapshots: rows });
    }

    let row: any = null;
    if (key === 'latest') {
      const stmt = db.prepare(`
        SELECT * FROM warehouse_snapshots
        ORDER BY created_at DESC
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

    if (!row) {
      return NextResponse.json({ success: true, data: null });
    }

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

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Failed to get warehouse data:', error);
    return NextResponse.json(
      { success: false, error: `Failed to read data: ${error instanceof Error ? error.message : JSON.stringify(error)}` },
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

    // 1. SUPABASE PERSISTENCE
    if (isSupabaseConfigured && supabase) {
      // Ambil data snapshot eksisting untuk mencegah penghapusan saat upload parsial
      const { data: existingRows } = await supabase
        .from('warehouse_snapshots')
        .select('*')
        .eq('snapshot_key', dateKey)
        .limit(1);

      let existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      if (!existing) {
        const { data: latestRows } = await supabase
          .from('warehouse_snapshots')
          .select('*')
          .neq('snapshot_key', 'app_settings')
          .neq('snapshot_key', 'audit_incoming_packaging')
          .order('created_at', { ascending: false })
          .limit(1);
        if (latestRows && latestRows.length > 0) {
          existing = latestRows[0];
        }
      }

      const prevPipe = existing ? parseJsonSafe(existing.pipe_capacities, []) : [];
      const prevFastSlow = existing ? parseJsonSafe(existing.fast_slow_data, []) : [];
      const prevCoil = existing ? parseJsonSafe(existing.coil_strip_data, []) : [];
      const prevNcWh = existing ? parseJsonSafe(existing.nc_warehouse_data, []) : [];
      const prevNcItems = existing ? parseJsonSafe(existing.nc_items, []) : [];
      const prevLooST = existing ? parseJsonSafe(existing.loo_st_data, []) : [];
      const prevLooLT = existing ? parseJsonSafe(existing.loo_lt_data, []) : [];
      const prevUnfifo = existing ? parseJsonSafe(existing.unfifo_data, []) : [];
      const prevUnfifoCoil = existing ? parseJsonSafe(existing.unfifo_coil_data, []) : [];
      const prevUnfifoPipe = existing ? parseJsonSafe(existing.unfifo_pipe_data, []) : [];
      const prevDamagedPkg = existing ? parseJsonSafe(existing.damaged_packaging_data, []) : [];
      const prevIncomingPkg = existing ? parseJsonSafe(existing.incoming_packaging_data, []) : [];
      const prevNcProgress = existing ? parseJsonSafe(existing.nc_progress_data, []) : [];
      const prevCustBreakdown = existing ? parseJsonSafe(existing.customer_breakdown, {}) : {};

      const payload = {
        snapshot_key: dateKey,
        last_updated: nowStr,
        pipe_capacities: hasRealPipe(pipeCapacities) ? pipeCapacities : (hasRealPipe(prevPipe) ? prevPipe : (pipeCapacities || [])),
        fast_slow_data: hasArray(fastSlowData) ? fastSlowData : prevFastSlow,
        coil_strip_data: hasRealCoil(coilStripData) ? coilStripData : (hasRealCoil(prevCoil) ? prevCoil : (coilStripData || [])),
        nc_warehouse_data: hasRealPipe(pipeCapacities) && hasArray(ncWarehouseData) ? ncWarehouseData : (hasRealPipe(prevNcWh) ? prevNcWh : (ncWarehouseData || [])),
        nc_items: hasArray(ncItems) ? ncItems : prevNcItems,
        loo_st_data: hasArray(looSTData) ? looSTData : prevLooST,
        loo_lt_data: hasArray(looLTData) ? looLTData : prevLooLT,
        unfifo_data: hasArray(unfifoData) ? unfifoData : prevUnfifo,
        unfifo_coil_data: hasArray(unfifoCoilData) ? unfifoCoilData : prevUnfifoCoil,
        unfifo_pipe_data: hasArray(unfifoPipeData) ? unfifoPipeData : prevUnfifoPipe,
        damaged_packaging_data: hasArray(damagedPackagingData) ? damagedPackagingData : prevDamagedPkg,
        incoming_packaging_data: hasArray(incomingPackagingData) ? incomingPackagingData : prevIncomingPkg,
        nc_progress_data: hasArray(ncProgressData) ? ncProgressData : prevNcProgress,
        customer_breakdown: hasObject(customerBreakdown) ? customerBreakdown : prevCustBreakdown,
      };

      const { error } = await supabase
        .from('warehouse_snapshots')
        .upsert(payload, { onConflict: 'snapshot_key' });

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'Saved to Supabase successfully',
        snapshotKey: dateKey,
      });
    }

    // 2. SQLITE LOCAL PERSISTENCE
    const db = getLocalDb();
    if (!db) {
      return NextResponse.json({ success: true, message: 'Saved in-memory only (Database unconfigured)' });
    }

    // Ambil data snapshot eksisting di SQLite untuk smart-merge upload parsial
    let existingRow = db.prepare('SELECT * FROM warehouse_snapshots WHERE snapshot_key = ? LIMIT 1').get(dateKey) as any;
    if (!existingRow) {
      existingRow = db.prepare('SELECT * FROM warehouse_snapshots ORDER BY created_at DESC LIMIT 1').get() as any;
    }

    const prevPipe = existingRow ? parseJsonSafe(existingRow.pipe_capacities, []) : [];
    const prevFastSlow = existingRow ? parseJsonSafe(existingRow.fast_slow_data, []) : [];
    const prevCoil = existingRow ? parseJsonSafe(existingRow.coil_strip_data, []) : [];
    const prevNcWh = existingRow ? parseJsonSafe(existingRow.nc_warehouse_data, []) : [];
    const prevNcItems = existingRow ? parseJsonSafe(existingRow.nc_items, []) : [];
    const prevLooST = existingRow ? parseJsonSafe(existingRow.loo_st_data, []) : [];
    const prevLooLT = existingRow ? parseJsonSafe(existingRow.loo_lt_data, []) : [];
    const prevUnfifo = existingRow ? parseJsonSafe(existingRow.unfifo_data, []) : [];
    const prevUnfifoCoil = existingRow ? parseJsonSafe(existingRow.unfifo_coil_data, []) : [];
    const prevUnfifoPipe = existingRow ? parseJsonSafe(existingRow.unfifo_pipe_data, []) : [];
    const prevDamagedPkg = existingRow ? parseJsonSafe(existingRow.damaged_packaging_data, []) : [];
    const prevIncomingPkg = existingRow ? parseJsonSafe(existingRow.incoming_packaging_data, []) : [];
    const prevNcProgress = existingRow ? parseJsonSafe(existingRow.nc_progress_data, []) : [];
    const prevCustBreakdown = existingRow ? parseJsonSafe(existingRow.customer_breakdown, {}) : {};

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

    return NextResponse.json({
      success: true,
      message: 'Saved to SQLite successfully',
      snapshotKey: dateKey,
    });
  } catch (error: unknown) {
    console.error('Failed to save warehouse data:', error);
    return NextResponse.json(
      { success: false, error: `Failed to write data: ${error instanceof Error ? error.message : JSON.stringify(error)}` },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('warehouse_snapshots').delete().neq('id', 0);
      return NextResponse.json({ success: true, message: 'Supabase snapshots reset' });
    }

    const db = getLocalDb();
    if (db) {
      db.prepare('DELETE FROM warehouse_snapshots').run();
      return NextResponse.json({ success: true, message: 'SQLite snapshots reset' });
    }

    return NextResponse.json({ success: true, message: 'Reset done' });
  } catch (error: unknown) {
    console.error('Failed to reset warehouse snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset snapshots' },
      { status: 500 }
    );
  }
}
