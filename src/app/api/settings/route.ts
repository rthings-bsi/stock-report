import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let localDb: any = null;
function getLocalDb() {
  if (!localDb) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dbModule = require('../../../lib/db');
      localDb = dbModule.default || dbModule;
    } catch (e) {
      console.warn('SQLite not available:', e);
    }
  }
  return localDb;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // 1. SUPABASE CLOUD MODE (Primary)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('warehouse_snapshots')
          .select('customer_breakdown')
          .eq('snapshot_key', 'app_settings')
          .maybeSingle();

        if (!error && data?.customer_breakdown) {
          const settings = typeof data.customer_breakdown === 'string'
            ? JSON.parse(data.customer_breakdown)
            : data.customer_breakdown;

          if (key) {
            return NextResponse.json({
              success: true,
              data: settings[key] !== undefined ? settings[key] : null
            });
          }
          return NextResponse.json({ success: true, settings });
        }
      } catch (err) {
        console.warn('Supabase app_settings query error, trying fallback:', err);
      }
    }

    // 2. SQLITE LOCAL MODE (Fallback)
    const db = getLocalDb();
    if (db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        if (key) {
          const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
          return NextResponse.json({
            success: true,
            data: row ? JSON.parse(row.value) : null
          });
        }

        const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
        const allSettings: Record<string, any> = {};
        rows.forEach((r) => {
          try {
            allSettings[r.key] = JSON.parse(r.value);
          } catch {
            allSettings[r.key] = r.value;
          }
        });
        return NextResponse.json({ success: true, settings: allSettings });
      } catch (sqlErr) {
        console.warn('SQLite app_settings error:', sqlErr);
      }
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    // 1. SUPABASE CLOUD PERSISTENCE (Primary)
    if (isSupabaseConfigured && supabase) {
      try {
        // Read current settings
        const { data } = await supabase
          .from('warehouse_snapshots')
          .select('customer_breakdown')
          .eq('snapshot_key', 'app_settings')
          .maybeSingle();

        const currentSettings = data?.customer_breakdown
          ? (typeof data.customer_breakdown === 'string' ? JSON.parse(data.customer_breakdown) : data.customer_breakdown)
          : {};

        currentSettings[key] = typeof value === 'string' ? (value.startsWith('{') || value.startsWith('[') ? JSON.parse(value) : value) : value;

        const payload = {
          snapshot_key: 'app_settings',
          last_updated: new Date().toISOString(),
          pipe_capacities: [],
          fast_slow_data: [],
          coil_strip_data: [],
          nc_warehouse_data: [],
          nc_items: [],
          loo_st_data: [],
          loo_lt_data: [],
          unfifo_data: [],
          customer_breakdown: currentSettings
        };

        const { error } = await supabase
          .from('warehouse_snapshots')
          .upsert(payload, { onConflict: 'snapshot_key' });

        if (!error) {
          return NextResponse.json({ success: true, message: 'Saved to Supabase app_settings' });
        }
      } catch (err) {
        console.warn('Supabase app_settings upsert error:', err);
      }
    }

    // 2. SQLITE LOCAL PERSISTENCE (Fallback)
    const db = getLocalDb();
    if (db) {
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        const upsert = db.prepare(`
          INSERT INTO app_settings (key, value, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
        `);
        upsert.run(key, valueStr);

        return NextResponse.json({ success: true, message: 'Saved to SQLite app_settings' });
      } catch (sqlErr) {
        console.warn('SQLite app_settings upsert error:', sqlErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Saved setting' });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
