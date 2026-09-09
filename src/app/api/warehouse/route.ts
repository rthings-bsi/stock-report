import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

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
          .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, snapshots: data || [] });
      }

      let query = supabase.from('warehouse_snapshots').select('*').neq('snapshot_key', 'app_settings');
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
        pipeCapacities: typeof row.pipe_capacities === 'string' ? JSON.parse(row.pipe_capacities) : row.pipe_capacities,
        fastSlowData: typeof row.fast_slow_data === 'string' ? JSON.parse(row.fast_slow_data) : row.fast_slow_data,
        coilStripData: typeof row.coil_strip_data === 'string' ? JSON.parse(row.coil_strip_data) : row.coil_strip_data,
        ncWarehouseData: typeof row.nc_warehouse_data === 'string' ? JSON.parse(row.nc_warehouse_data) : row.nc_warehouse_data,
        ncItems: typeof row.nc_items === 'string' ? JSON.parse(row.nc_items) : row.nc_items,
        looSTData: typeof row.loo_st_data === 'string' ? JSON.parse(row.loo_st_data) : row.loo_st_data,
        looLTData: typeof row.loo_lt_data === 'string' ? JSON.parse(row.loo_lt_data) : row.loo_lt_data,
        unfifoData: typeof row.unfifo_data === 'string' ? JSON.parse(row.unfifo_data) : row.unfifo_data,
        unfifoCoilData: row.unfifo_coil_data ? (typeof row.unfifo_coil_data === 'string' ? JSON.parse(row.unfifo_coil_data) : row.unfifo_coil_data) : [],
        unfifoPipeData: row.unfifo_pipe_data ? (typeof row.unfifo_pipe_data === 'string' ? JSON.parse(row.unfifo_pipe_data) : row.unfifo_pipe_data) : [],
        damagedPackagingData: row.damaged_packaging_data ? (typeof row.damaged_packaging_data === 'string' ? JSON.parse(row.damaged_packaging_data) : row.damaged_packaging_data) : [],
        incomingPackagingData: row.incoming_packaging_data ? (typeof row.incoming_packaging_data === 'string' ? JSON.parse(row.incoming_packaging_data) : row.incoming_packaging_data) : [],
        customerBreakdown: row.customer_breakdown ? (typeof row.customer_breakdown === 'string' ? JSON.parse(row.customer_breakdown) : row.customer_breakdown) : {},
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

    const stmt = db.prepare(`
      SELECT * FROM warehouse_snapshots
      WHERE snapshot_key = ?
      LIMIT 1
    `);
    const row = stmt.get(key) as any;

    if (!row) {
      return NextResponse.json({ success: true, data: null });
    }

    const data = {
      snapshotKey: row.snapshot_key,
      lastUpdated: row.last_updated,
      pipeCapacities: JSON.parse(row.pipe_capacities),
      fastSlowData: JSON.parse(row.fast_slow_data),
      coilStripData: JSON.parse(row.coil_strip_data),
      ncWarehouseData: JSON.parse(row.nc_warehouse_data),
      ncItems: JSON.parse(row.nc_items),
      looSTData: JSON.parse(row.loo_st_data),
      looLTData: JSON.parse(row.loo_lt_data),
      unfifoData: JSON.parse(row.unfifo_data),
      unfifoCoilData: row.unfifo_coil_data ? JSON.parse(row.unfifo_coil_data) : [],
      unfifoPipeData: row.unfifo_pipe_data ? JSON.parse(row.unfifo_pipe_data) : [],
      damagedPackagingData: row.damaged_packaging_data ? JSON.parse(row.damaged_packaging_data) : [],
      incomingPackagingData: row.incoming_packaging_data ? JSON.parse(row.incoming_packaging_data) : [],
      customerBreakdown: row.customer_breakdown ? JSON.parse(row.customer_breakdown) : {},
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
      customerBreakdown,
      lastUpdated,
      snapshotKey,
    } = body;

    const nowStr = lastUpdated || new Date().toLocaleString('id-ID');
    const dateKey = snapshotKey || `snap_${new Date().toISOString().slice(0, 10)}`;

    // 1. SUPABASE PERSISTENCE
    if (isSupabaseConfigured && supabase) {
      const payload = {
        snapshot_key: dateKey,
        last_updated: nowStr,
        pipe_capacities: pipeCapacities || [],
        fast_slow_data: fastSlowData || [],
        coil_strip_data: coilStripData || [],
        nc_warehouse_data: ncWarehouseData || [],
        nc_items: ncItems || [],
        loo_st_data: looSTData || [],
        loo_lt_data: looLTData || [],
        unfifo_data: unfifoData || [],
        unfifo_coil_data: unfifoCoilData || [],
        unfifo_pipe_data: unfifoPipeData || [],
        damaged_packaging_data: damagedPackagingData || [],
        incoming_packaging_data: incomingPackagingData || [],
        customer_breakdown: customerBreakdown || {},
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
        customer_breakdown = excluded.customer_breakdown,
        created_at = CURRENT_TIMESTAMP;
    `);

    upsertStmt.run({
      snapshotKey: dateKey,
      lastUpdated: nowStr,
      pipeCapacities: JSON.stringify(pipeCapacities || []),
      fastSlowData: JSON.stringify(fastSlowData || []),
      coilStripData: JSON.stringify(coilStripData || []),
      ncWarehouseData: JSON.stringify(ncWarehouseData || []),
      ncItems: JSON.stringify(ncItems || []),
      looSTData: JSON.stringify(looSTData || []),
      looLTData: JSON.stringify(looLTData || []),
      unfifoData: JSON.stringify(unfifoData || []),
      unfifoCoilData: JSON.stringify(unfifoCoilData || []),
      unfifoPipeData: JSON.stringify(unfifoPipeData || []),
      damagedPackagingData: JSON.stringify(damagedPackagingData || []),
      incomingPackagingData: JSON.stringify(incomingPackagingData || []),
      customerBreakdown: JSON.stringify(customerBreakdown || {}),
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
