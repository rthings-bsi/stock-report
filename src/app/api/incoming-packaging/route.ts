import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { IncomingPackagingItem } from '../../../types/warehouse';
import {
  hasPermission,
  isAuthContext,
  rejectCrossOrigin,
  requireAuth,
  requirePermission,
} from '@/lib/auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SNAPSHOT_KEY_AUDIT_PKG = 'audit_incoming_packaging';

// JSON file persistence helper for local Termux / Standalone
function getPackagingFilePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {}
  }
  return path.join(dataDir, 'incoming_packaging.json');
}

function readPackagingFromJson(): IncomingPackagingItem[] {
  try {
    const filePath = getPackagingFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to read incoming_packaging from JSON:', e);
  }
  return [];
}

function writePackagingToJson(items: IncomingPackagingItem[]) {
  try {
    const filePath = getPackagingFilePath();
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write incoming_packaging to JSON:', e);
  }
}

// Fallback SQLite instance for local environment (when native binding is available)
let localDb: any = null;
function getLocalDb() {
  if (!localDb) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dbModule = require('../../../lib/db');
      const resolved = dbModule?.default !== undefined ? dbModule.default : dbModule;
      if (resolved && typeof resolved.prepare === 'function') {
        localDb = resolved;
      } else {
        localDb = null;
      }
    } catch (e) {
      console.warn('SQLite not available in this environment:', e);
      localDb = null;
    }
  }
  return localDb;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // 1. SUPABASE CLOUD (Primary if configured)
    if (isSupabaseConfigured && supabase) {
      try {
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

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          let items: IncomingPackagingItem[] = rawItems;
          if (date) {
            items = items.filter((i) => i.tglIncoming === date || i.tglIncoming?.startsWith(date));
          }
          return NextResponse.json({ success: true, items });
        }
      } catch (err) {
        console.warn('Supabase incoming_packaging query error, falling back:', err);
      }
    }

    // 2. SQLITE LOCAL (Fallback if native binding available)
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

        if (rows.length > 0) {
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
        }
      } catch (sqlErr) {
        console.warn('SQLite incoming_packaging query error, falling back to JSON:', sqlErr);
      }
    }

    // 3. FILESYSTEM JSON FALLBACK (Always reliable on Termux / Standalone)
    const jsonItems = readPackagingFromJson();
    let items = jsonItems;
    if (date) {
      items = items.filter((i) => i.tglIncoming === date || i.tglIncoming?.startsWith(date));
    }
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
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;
  if (
    !hasPermission(auth, 'canEditIncomingPkg') &&
    !hasPermission(auth, 'canUploadIncomingPkg')
  ) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak untuk mengubah data incoming packaging.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const items: IncomingPackagingItem[] = Array.isArray(body) ? body : (body.items || []);

    const nowStr = new Date().toLocaleString('id-ID');

    // 1. SUPABASE CLOUD (Primary if configured)
    if (isSupabaseConfigured && supabase) {
      try {
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

        await supabase
          .from('warehouse_snapshots')
          .upsert(payload, { onConflict: 'snapshot_key' });
      } catch (err) {
        console.warn('Supabase upsert audit_incoming_packaging error:', err);
      }
    }

    // 2. SQLITE LOCAL (Fallback if native binding available)
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

    // 3. FILESYSTEM JSON FALLBACK (Always persists on disk)
    writePackagingToJson(items);

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
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requirePermission(request, 'canEditIncomingPkg');
  if (!isAuthContext(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (isSupabaseConfigured && supabase) {
      try {
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
      } catch (supaErr) {
        console.warn('Supabase incoming_packaging delete error:', supaErr);
      }
    }

    const db = getLocalDb();
    if (db) {
      try {
        if (id) {
          db.prepare('DELETE FROM incoming_packaging WHERE id = ?').run(id);
        } else {
          db.prepare('DELETE FROM incoming_packaging').run();
        }
      } catch (sqlErr) {
        console.warn('SQLite incoming_packaging delete error:', sqlErr);
      }
    }

    // 3. FILESYSTEM JSON FALLBACK
    if (id) {
      const current = readPackagingFromJson();
      const filtered = current.filter((i) => i.id !== id);
      writePackagingToJson(filtered);
    } else {
      writePackagingToJson([]);
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
