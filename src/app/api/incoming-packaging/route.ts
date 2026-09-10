import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { IncomingPackagingItem } from '../../../types/warehouse';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // 1. SUPABASE
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('incoming_packaging')
        .select('*')
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('tgl_incoming', date);
      }

      const { data, error } = await query;
      if (!error && data) {
        const items: IncomingPackagingItem[] = data.map((r: any) => ({
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
      }
    }

    // 2. SQLITE LOCAL
    const db = getLocalDb();
    if (!db) {
      return NextResponse.json({ success: true, items: [] });
    }

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

    // Jika tabel terpisah masih kosong, cek fallback ke legacy snapshots
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
            // Migrasi otomatis ke tabel terpisah
            const insertStmt = db.prepare(`
              INSERT OR REPLACE INTO incoming_packaging (
                id, tgl_incoming, customer, type, stock_aktual_internal, out_qty, in_qty, stock_saat_ini, slot, kaki, dinding, rangka, keterangan
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMany = db.transaction((itemsToInsert: IncomingPackagingItem[]) => {
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
            insertMany(legacyItems);
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

    // 1. SUPABASE
    if (isSupabaseConfigured && supabase) {
      if (items.length === 0) {
        await supabase.from('incoming_packaging').delete().neq('id', '___NON_EXISTENT___');
        return NextResponse.json({ success: true, message: 'All items cleared' });
      }

      const rows = items.map((item) => ({
        id: item.id,
        tgl_incoming: item.tglIncoming || '',
        customer: item.customer,
        type: item.type,
        stock_aktual_internal: item.stockAktualInternal || 0,
        out_qty: item.outQty || 0,
        in_qty: item.inQty || 0,
        stock_saat_ini: item.stockSaatIni || 0,
        slot: String(item.detailNG?.slot ?? '-'),
        kaki: String(item.detailNG?.kaki ?? '-'),
        dinding: String(item.detailNG?.dinding ?? '-'),
        rangka: String(item.detailNG?.rangka ?? '-'),
        keterangan: item.keterangan || '',
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('incoming_packaging').upsert(rows, { onConflict: 'id' });
      if (error) throw error;

      return NextResponse.json({ success: true, count: rows.length });
    }

    // 2. SQLITE LOCAL
    const db = getLocalDb();
    if (!db) {
      return NextResponse.json({ success: true, count: items.length, note: 'Database unconfigured' });
    }

    if (items.length === 0) {
      db.prepare('DELETE FROM incoming_packaging').run();
      return NextResponse.json({ success: true, message: 'Table cleared' });
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO incoming_packaging (
        id, tgl_incoming, customer, type, stock_aktual_internal, out_qty, in_qty, stock_saat_ini, slot, kaki, dinding, rangka, keterangan, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const insertMany = db.transaction((itemsToInsert: IncomingPackagingItem[]) => {
      // Clear and rewrite with current state
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
        await supabase.from('incoming_packaging').delete().eq('id', id);
      } else {
        await supabase.from('incoming_packaging').delete().neq('id', '___NON_EXISTENT___');
      }
      return NextResponse.json({ success: true });
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
