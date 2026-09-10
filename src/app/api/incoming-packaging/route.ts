import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { IncomingPackagingItem } from '../../../types/warehouse';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SNAPSHOT_KEY_AUDIT_PKG = 'audit_incoming_packaging';

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
    const date = searchParams.get('date');

    // 1. SUPABASE CLOUD (Primary)
    if (isSupabaseConfigured && supabase) {
      try {
        // Cek record dedicated audit_incoming_packaging
        const { data, error } = await supabase
          .from('warehouse_snapshots')
          .select('incoming_packaging_data, last_updated')
          .eq('snapshot_key', SNAPSHOT_KEY_AUDIT_PKG)
          .maybeSingle();

        let rawItems: any = null;
        if (!error && data?.incoming_packaging_data) {
          rawItems = typeof data.incoming_packaging_data === 'string'
            ? JSON.parse(data.incoming_packaging_data)
            : data.incoming_packaging_data;
        }

        // Fallback jika dedicated record belum ada, cek latest snapshot
        if (!rawItems || (Array.isArray(rawItems) && rawItems.length === 0)) {
          const { data: latestData } = await supabase
            .from('warehouse_snapshots')
            .select('incoming_packaging_data')
            .neq('snapshot_key', 'app_settings')
            .neq('snapshot_key', SNAPSHOT_KEY_AUDIT_PKG)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestData?.incoming_packaging_data) {
            rawItems = typeof latestData.incoming_packaging_data === 'string'
              ? JSON.parse(latestData.incoming_packaging_data)
              : latestData.incoming_packaging_data;
          }
        }

        if (Array.isArray(rawItems)) {
          let items: IncomingPackagingItem[] = rawItems;
          if (date) {
            items = items.filter((i) => i.tglIncoming === date || i.tglIncoming?.startsWith(date));
          }
          return NextResponse.json({ success: true, items });
        }
      } catch (err) {
        console.warn('Supabase incoming_packaging query error, falling back to SQLite:', err);
      }
    }

    // 2. SQLITE LOCAL (Fallback)
    const db = getLocalDb();
    if (!db) {
      return NextResponse.json({ success: true, items: [] });
    }

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS incoming_packaging (
        id TEXT PRIMARY KEY,
        tgl_incoming TEXT NOT NULL,
        customer TEXT NOT NULL,
        type TEXT NOT NULL,
        stock_aktual_internal INTEGER DEFAULT 0,
        out_qty INTEGER DEFAULT 0,
        in_qty INTEGER DEFAULT 0,
        stock_saat_ini INTEGER DEFAULT 0,
        slot TEXT DEFAULT '-',
        kaki TEXT DEFAULT '-',
        dinding TEXT DEFAULT '-',
        rangka TEXT DEFAULT '-',
        keterangan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let rows: any[] = [];
    if (date) {
      const stmt = db.prepare(`
        SELECT * FROM incoming_packaging
        WHERE tgl_incoming = ?
        ORDER BY created_at DESC
      `);
      rows = stmt.all(date);
    } else {
      const stmt = db.prepare(`
        SELECT * FROM incoming_packaging
        ORDER BY created_at DESC
      `);
      rows = stmt.all();
    }

    // Fallback: jika tabel SQLite kosong, cek legacy warehouse_snapshots
    if (rows.length === 0) {
      try {
        const legacyStmt = db.prepare(`
          SELECT incoming_packaging_data FROM warehouse_snapshots
          WHERE incoming_packaging_data IS NOT NULL AND incoming_packaging_data != '[]'
          ORDER BY created_at DESC LIMIT 1
        `);
        const legacyRow = legacyStmt.get() as any;
        if (legacyRow?.incoming_packaging_data) {
          const legacyItems: IncomingPackagingItem[] = JSON.parse(legacyRow.incoming_packaging_data);
          if (Array.isArray(legacyItems) && legacyItems.length > 0) {
            return NextResponse.json({ success: true, items: legacyItems });
          }
        }
      } catch (e) {
        console.warn('Fallback legacy migration skipped:', e);
      }
    }

    const items: IncomingPackagingItem[] = rows.map((r) => ({
      id: r.id,
      tglIncoming: r.tgl_incoming,
      customer: r.customer,
      type: r.type,
      stockAktualInternal: r.stock_aktual_internal || 0,
      outQty: r.out_qty || 0,
      inQty: r.in_qty || 0,
      stockSaatIni: r.stock_saat_ini || 0,
      detailNG: {
        slot: r.slot || '-',
        kaki: r.kaki || '-',
        dinding: r.dinding || '-',
        rangka: r.rangka || '-'
      },
      keterangan: r.keterangan || ''
    }));

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('Failed to get incoming packaging items:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: IncomingPackagingItem[] = Array.isArray(body) ? body : (body.items || []);

    const nowStr = new Date().toLocaleString('id-ID');

    // 1. SUPABASE CLOUD (Primary)
    if (isSupabaseConfigured && supabase) {
      const payload = {
        snapshot_key: SNAPSHOT_KEY_AUDIT_PKG,
        last_updated: nowStr,
        pipe_capacities: '[]',
        fast_slow_data: '[]',
        coil_strip_data: '[]',
        nc_warehouse_data: '[]',
        nc_items: '[]',
        loo_st_data: '[]',
        loo_lt_data: '[]',
        unfifo_data: '[]',
        incoming_packaging_data: JSON.stringify(items)
      };

      const { error } = await supabase
        .from('warehouse_snapshots')
        .upsert(payload, { onConflict: 'snapshot_key' });

      if (error) {
        console.error('Supabase upsert audit_incoming_packaging error:', error);
        throw error;
      }
    }

    // 2. SQLITE LOCAL (Fallback / Persistence)
    const db = getLocalDb();
    if (db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS incoming_packaging (
            id TEXT PRIMARY KEY,
            tgl_incoming TEXT NOT NULL,
            customer TEXT NOT NULL,
            type TEXT NOT NULL,
            stock_aktual_internal INTEGER DEFAULT 0,
            out_qty INTEGER DEFAULT 0,
            in_qty INTEGER DEFAULT 0,
            stock_saat_ini INTEGER DEFAULT 0,
            slot TEXT DEFAULT '-',
            kaki TEXT DEFAULT '-',
            dinding TEXT DEFAULT '-',
            rangka TEXT DEFAULT '-',
            keterangan TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        if (items.length === 0) {
          db.prepare('DELETE FROM incoming_packaging').run();
        } else {
          const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO incoming_packaging (
              id, tgl_incoming, customer, type, stock_aktual_internal, out_qty, in_qty, stock_saat_ini, slot, kaki, dinding, rangka, keterangan, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);

          const insertMany = db.transaction((itemsToInsert: IncomingPackagingItem[]) => {
            db.prepare('DELETE FROM incoming_packaging').run();
            for (const item of itemsToInsert) {
              insertStmt.run(
                item.id,
                item.tglIncoming || '',
                item.customer,
                item.type,
                item.stockAktualInternal || 0,
                item.outQty || 0,
                item.inQty || 0,
                item.stockSaatIni || 0,
                String(item.detailNG?.slot ?? '-'),
                String(item.detailNG?.kaki ?? '-'),
                String(item.detailNG?.dinding ?? '-'),
                String(item.detailNG?.rangka ?? '-'),
                item.keterangan || ''
              );
            }
          });

          insertMany(items);
        }
      } catch (sqlErr) {
        console.warn('SQLite incoming_packaging write error:', sqlErr);
      }
    }

    return NextResponse.json({ success: true, count: items.length });
  } catch (error: unknown) {
    console.error('Failed to save incoming packaging items:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (isSupabaseConfigured && supabase) {
      if (id) {
        const { data } = await supabase
          .from('warehouse_snapshots')
          .select('incoming_packaging_data')
          .eq('snapshot_key', SNAPSHOT_KEY_AUDIT_PKG)
          .maybeSingle();

        if (data?.incoming_packaging_data) {
          const parsed = JSON.parse(data.incoming_packaging_data);
          const filtered = Array.isArray(parsed) ? parsed.filter((i: any) => i.id !== id) : [];
          await supabase
            .from('warehouse_snapshots')
            .upsert({
              snapshot_key: SNAPSHOT_KEY_AUDIT_PKG,
              incoming_packaging_data: JSON.stringify(filtered),
              last_updated: new Date().toLocaleString('id-ID')
            }, { onConflict: 'snapshot_key' });
        }
      } else {
        await supabase
          .from('warehouse_snapshots')
          .upsert({
            snapshot_key: SNAPSHOT_KEY_AUDIT_PKG,
            incoming_packaging_data: '[]',
            last_updated: new Date().toLocaleString('id-ID')
          }, { onConflict: 'snapshot_key' });
      }
    }

    const db = getLocalDb();
    if (db) {
      if (id) {
        db.prepare('DELETE FROM incoming_packaging WHERE id = ?').run(id);
      } else {
        db.prepare('DELETE FROM incoming_packaging').run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete incoming packaging item:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
