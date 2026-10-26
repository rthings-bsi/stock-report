import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  isAuthContext,
  rejectCrossOrigin,
  requireAuth,
} from '@/lib/auth-server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTIVITY_JSON_PATH = path.join(DATA_DIR, 'mb51_productivity.json');
const HEADCOUNT_JSON_PATH = path.join(DATA_DIR, 'mb51_headcount.json');
const PARSER_SCRIPT_PATH = path.join(process.cwd(), 'scripts', 'parse_mb51_productivity.py');

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

interface HeadcountConfig {
  defaultManpower: Record<string, { 'Shift 1': number | null; 'Shift 2': number | null; 'Shift 3': number | null }>;
  dateOverrides: Array<{
    tanggal: string;
    gudang: string;
    shift: 'Shift 1' | 'Shift 2' | 'Shift 3';
    man: number | null;
  }>;
  thresholds: {
    lowKgPerMan: number;
    idleTxPerMan: number;
    heavyKgPerTx: number;
  };
}

const DEFAULT_HEADCOUNT_CONFIG: HeadcountConfig = {
  defaultManpower: {
    'Gd.01': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': 1 },
    'Gd.02': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 1 },
    'Gd.03': { 'Shift 1': 3, 'Shift 2': 3, 'Shift 3': 1 },
    'Gd.04': { 'Shift 1': 4, 'Shift 2': 4, 'Shift 3': 1 },
    'Gd.05': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 3 },
    'Gd.06': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': null },
    'Gd.08': { 'Shift 1': 4, 'Shift 2': 3, 'Shift 3': null },
    'Gd.09': { 'Shift 1': null, 'Shift 2': null, 'Shift 3': null },
    'Gd.10': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 5 },
    'Gd.11': { 'Shift 1': 6, 'Shift 2': 5, 'Shift 3': 5 },
    'Gd.12': { 'Shift 1': 3, 'Shift 2': 3, 'Shift 3': 1 },
    'Gd.13': { 'Shift 1': 3, 'Shift 2': 4, 'Shift 3': 2 },
    'Gd.14': { 'Shift 1': 5, 'Shift 2': 5, 'Shift 3': 3 },
  },
  dateOverrides: [],
  thresholds: {
    lowKgPerMan: 5000,
    idleTxPerMan: 25,
    heavyKgPerTx: 2000,
  },
};

function loadHeadcountConfig(): HeadcountConfig {
  try {
    if (fs.existsSync(HEADCOUNT_JSON_PATH)) {
      const raw = JSON.parse(fs.readFileSync(HEADCOUNT_JSON_PATH, 'utf-8'));
      return {
        defaultManpower: {
          ...DEFAULT_HEADCOUNT_CONFIG.defaultManpower,
          ...(raw.defaultManpower || {}),
        },
        dateOverrides: Array.isArray(raw.dateOverrides) ? raw.dateOverrides : [],
        thresholds: {
          ...DEFAULT_HEADCOUNT_CONFIG.thresholds,
          ...(raw.thresholds || {}),
        },
      };
    }
  } catch (e) {
    console.warn('Failed to read mb51_headcount.json, using default:', e);
  }
  return DEFAULT_HEADCOUNT_CONFIG;
}

function loadProductivityDataset() {
  if (!fs.existsSync(PRODUCTIVITY_JSON_PATH)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(PRODUCTIVITY_JSON_PATH, 'utf-8'));
}

function sanitizeProductivityDataset(dataset: any) {
  if (!dataset || !Array.isArray(dataset.records)) return dataset;
  const hasOldDemo = dataset.records.some((r: any) => String(r.tanggal || '').startsWith('2025'));
  if (!hasOldDemo) return dataset;

  const records = dataset.records.filter((r: any) => !String(r.tanggal || '').startsWith('2025'));
  const hourlyRecords = Array.isArray(dataset.hourlyRecords)
    ? dataset.hourlyRecords.filter((h: any) => !String(h.tanggal || '').startsWith('2025'))
    : [];
  const postingDates = (dataset.postingDates || []).filter((d: string) => !String(d).startsWith('2025'));
  const tanggalKerjaDates = (dataset.tanggalKerjaDates || []).filter((d: string) => !String(d).startsWith('2025'));

  return {
    ...dataset,
    totalRowsRead: records.length,
    postingDates,
    tanggalKerjaDates,
    records,
    hourlyRecords,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isDiagnostic = url.searchParams.get('check') === '1' || url.searchParams.get('diagnostic') === '1';

  // Mode diagnostik: periksa konektivitas dan kelengkapan tabel Supabase di produksi
  if (isDiagnostic) {
    const diag: Record<string, any> = {
      timestamp: new Date().toISOString(),
      environment: {
        isCloudDeploy: Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.ENABLE_SUPABASE === 'true'),
        nodeEnv: process.env.NODE_ENV,
        isSupabaseConfigured,
        hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
        hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
        hasAnySupabaseKey: Boolean(
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          process.env.SUPABASE_SERVICE_KEY ||
          process.env.SUPABASE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.SUPABASE_ANON_KEY
        ),
      },
      tables: {},
      summary: '',
    };

    if (!isSupabaseConfigured || !supabase) {
      diag.summary = 'Supabase BELUM terkonfigurasi. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY sudah diset di Vercel Environment Variables.';
      return NextResponse.json({ success: false, diagnostic: diag });
    }

    try {
      const { data, error } = await supabase.from('productivity_data').select('data_key, last_updated').limit(1);
      diag.tables.productivity_data = error
        ? { exists: false, error: error.message, code: error.code }
        : { exists: true, rowCount: data?.length ?? 0 };
    } catch (e: any) {
      diag.tables.productivity_data = { exists: false, exception: e?.message };
    }

    try {
      const { data, error } = await supabase.from('warehouse_snapshots').select('snapshot_key, audit_sloc_data, sto_data, nc_progress_data').limit(1);
      diag.tables.warehouse_snapshots = error
        ? { exists: false, error: error.message, code: error.code }
        : { exists: true, hasAuditSLocCol: true, rowCount: data?.length ?? 0 };
    } catch (e: any) {
      diag.tables.warehouse_snapshots = { exists: false, exception: e?.message };
    }

    try {
      const { data, error } = await supabase.from('roles').select('id, key').limit(1);
      diag.tables.roles = error
        ? { exists: false, error: error.message }
        : { exists: true, rowCount: data?.length ?? 0 };
    } catch (e: any) {
      diag.tables.roles = { exists: false, exception: e?.message };
    }

    const allOk = Boolean(diag.tables.productivity_data?.exists && diag.tables.warehouse_snapshots?.exists);
    diag.summary = allOk
      ? 'Database Supabase SIAP. Tabel productivity_data dan warehouse_snapshots terdeteksi.'
      : 'Tabel Supabase BELUM LENGKAP. Silakan jalankan script supabase_master_migration.sql di Supabase SQL Editor.';

    return NextResponse.json({ success: allOk, diagnostic: diag });
  }

  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    // 1. Supabase Cloud (Primary jika aktif)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: supaRow } = await supabase
          .from('productivity_data')
          .select('dataset, headcount, last_updated')
          .eq('data_key', 'current')
          .maybeSingle();

        if (supaRow && supaRow.dataset) {
          const rawDataset = typeof supaRow.dataset === 'string' ? JSON.parse(supaRow.dataset) : supaRow.dataset;
          const dataset = sanitizeProductivityDataset(rawDataset);
          const headcount = supaRow.headcount
            ? (typeof supaRow.headcount === 'string' ? JSON.parse(supaRow.headcount) : supaRow.headcount)
            : loadHeadcountConfig();

          return NextResponse.json({
            success: true,
            dataset,
            headcount,
            source: 'supabase',
          });
        }
      } catch (supaErr) {
        console.warn('Supabase productivity read warning:', supaErr);
      }
    }

    // 2. SQLite Database Lokal
    const db = getLocalDb();
    if (db) {
      try {
        const row = db.prepare("SELECT dataset, headcount, last_updated FROM productivity_data WHERE data_key = 'current' LIMIT 1").get() as any;
        if (row && row.dataset) {
          const rawDataset = JSON.parse(row.dataset);
          const dataset = sanitizeProductivityDataset(rawDataset);
          const headcount = row.headcount ? JSON.parse(row.headcount) : loadHeadcountConfig();
          return NextResponse.json({
            success: true,
            dataset,
            headcount,
            source: 'sqlite',
          });
        }
      } catch (sqlErr) {
        console.warn('SQLite productivity read warning:', sqlErr);
      }
    }

    // 3. Fallback File JSON Lokal
    const rawDataset = loadProductivityDataset();
    const dataset = sanitizeProductivityDataset(rawDataset);
    const headcount = loadHeadcountConfig();

    // Auto-seed ke Supabase jika di cloud deploy tabel productivity_data masih kosong dan ada data valid
    if (dataset && Array.isArray(dataset.records) && dataset.records.length > 0 && isSupabaseConfigured && supabase) {
      try {
        await supabase.from('productivity_data').upsert({
          data_key: 'current',
          dataset,
          headcount,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'data_key' });
        console.log('[SUPABASE] Auto-seed dataset produktivitas MB51 ke Supabase berhasil');
      } catch (seedErr) {
        console.warn('[SUPABASE] Auto-seed warning:', seedErr);
      }
    }

    return NextResponse.json({
      success: true,
      dataset,
      headcount,
      source: 'json_file',
    });
  } catch (err: any) {
    console.error('Error loading MB51 productivity data:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat data produktivitas MB51' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const originErr = rejectCrossOrigin(request);
  if (originErr) return originErr;

  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  const contentType = request.headers.get('content-type') || '';

  try {
    // 1. JSON body -> Save Headcount Config or Reset Default
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.action === 'reset_headcount') {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(HEADCOUNT_JSON_PATH, JSON.stringify(DEFAULT_HEADCOUNT_CONFIG, null, 2), 'utf-8');

        // Simpan ke SQLite
        const db = getLocalDb();
        if (db) {
          try {
            db.prepare(`
              INSERT INTO productivity_data (data_key, headcount, last_updated)
              VALUES ('current', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(data_key) DO UPDATE SET
                headcount = excluded.headcount,
                last_updated = excluded.last_updated
            `).run(JSON.stringify(DEFAULT_HEADCOUNT_CONFIG));
          } catch (e) {
            console.warn('SQLite reset headcount warning:', e);
          }
        }

        // Simpan ke Supabase
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('productivity_data').upsert({
              data_key: 'current',
              headcount: DEFAULT_HEADCOUNT_CONFIG,
              last_updated: new Date().toISOString(),
            }, { onConflict: 'data_key' });
          } catch (e) {
            console.warn('Supabase reset headcount warning:', e);
          }
        }

        return NextResponse.json({
          success: true,
          headcount: DEFAULT_HEADCOUNT_CONFIG,
        });
      }

      if (body.action === 'save_headcount' && body.headcount) {
        const nextConfig: HeadcountConfig = {
          defaultManpower: {
            ...DEFAULT_HEADCOUNT_CONFIG.defaultManpower,
            ...(body.headcount.defaultManpower || {}),
          },
          dateOverrides: Array.isArray(body.headcount.dateOverrides) ? body.headcount.dateOverrides : [],
          thresholds: {
            ...DEFAULT_HEADCOUNT_CONFIG.thresholds,
            ...(body.headcount.thresholds || {}),
          },
        };
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(HEADCOUNT_JSON_PATH, JSON.stringify(nextConfig, null, 2), 'utf-8');

        // Simpan ke SQLite
        const db = getLocalDb();
        if (db) {
          try {
            db.prepare(`
              INSERT INTO productivity_data (data_key, headcount, last_updated)
              VALUES ('current', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(data_key) DO UPDATE SET
                headcount = excluded.headcount,
                last_updated = excluded.last_updated
            `).run(JSON.stringify(nextConfig));
          } catch (e) {
            console.warn('SQLite save headcount warning:', e);
          }
        }

        // Simpan ke Supabase
        if (isSupabaseConfigured && supabase) {
          try {
            await supabase.from('productivity_data').upsert({
              data_key: 'current',
              headcount: nextConfig,
              last_updated: new Date().toISOString(),
            }, { onConflict: 'data_key' });
          } catch (e) {
            console.warn('Supabase save headcount warning:', e);
          }
        }

        return NextResponse.json({
          success: true,
          headcount: nextConfig,
        });
      }

      if (body.action === 'save_dataset' || body.dataset) {
        const incomingDataset = body.dataset;
        if (!incomingDataset || !Array.isArray(incomingDataset.records)) {
          return NextResponse.json({ success: false, error: 'Dataset MB51 tidak valid' }, { status: 400 });
        }

        // Ambil dataset eksisting untuk proses merge cerdas
        let existingDataset: any = null;
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: supaRow } = await supabase
              .from('productivity_data')
              .select('dataset')
              .eq('data_key', 'current')
              .maybeSingle();
            if (supaRow?.dataset) {
              existingDataset = typeof supaRow.dataset === 'string' ? JSON.parse(supaRow.dataset) : supaRow.dataset;
            }
          } catch {}
        }
        if (!existingDataset) {
          const db = getLocalDb();
          if (db) {
            try {
              const row = db.prepare("SELECT dataset FROM productivity_data WHERE data_key = 'current' LIMIT 1").get() as any;
              if (row?.dataset) {
                existingDataset = JSON.parse(row.dataset);
              }
            } catch {}
          }
        }
        if (!existingDataset) {
          existingDataset = loadProductivityDataset();
        }

        let finalDataset = incomingDataset;
        if (existingDataset && Array.isArray(existingDataset.records) && !body.replace) {
          // Merge: tanggal yang ada di incoming akan menimpa/menambah, tanggal lain tetap dipertahankan
          // Pastikan data demo legacy 2025 tidak diikutkan lagi
          const incomingDates = new Set<string>();
          for (const r of incomingDataset.records) {
            if (r.tanggal && !String(r.tanggal).startsWith('2025')) incomingDates.add(r.tanggal);
          }

          const mergedRecords = existingDataset.records
            .filter((r: any) => !incomingDates.has(r.tanggal) && !String(r.tanggal || '').startsWith('2025'));
          mergedRecords.push(...incomingDataset.records.filter((r: any) => !String(r.tanggal || '').startsWith('2025')));

          let mergedHourly: any[] = [];
          if (Array.isArray(incomingDataset.hourlyRecords)) {
            const existingHourly = Array.isArray(existingDataset.hourlyRecords) ? existingDataset.hourlyRecords : [];
            mergedHourly = existingHourly
              .filter((hb: any) => !incomingDates.has(hb.tanggal) && !String(hb.tanggal || '').startsWith('2025'));
            mergedHourly.push(...incomingDataset.hourlyRecords.filter((hb: any) => !String(hb.tanggal || '').startsWith('2025')));
          } else if (Array.isArray(existingDataset.hourlyRecords)) {
            mergedHourly = existingDataset.hourlyRecords.filter((hb: any) => !String(hb.tanggal || '').startsWith('2025'));
          }

          const postingDates = Array.from(
            new Set([...(existingDataset.postingDates || []), ...(incomingDataset.postingDates || [])])
          ).filter((d) => !String(d).startsWith('2025')).sort();
          const tanggalKerjaDates = Array.from(
            new Set([...(existingDataset.tanggalKerjaDates || []), ...(incomingDataset.tanggalKerjaDates || [])])
          ).filter((d) => !String(d).startsWith('2025')).sort();

          finalDataset = {
            sourceFile: incomingDataset.sourceFile || existingDataset.sourceFile || 'SAP_MB51_Export.xlsx',
            lastUpdated: incomingDataset.lastUpdated || new Date().toISOString(),
            totalRowsRead: (existingDataset.totalRowsRead || 0) + (incomingDataset.totalRowsRead || 0),
            postingDates,
            tanggalKerjaDates,
            records: mergedRecords,
            hourlyRecords: mergedHourly,
          };
        }

        // 1. Simpan ke JSON Lokal jika bisa
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
          fs.writeFileSync(PRODUCTIVITY_JSON_PATH, JSON.stringify(finalDataset, null, 2), 'utf-8');
        } catch (e) {
          console.warn('Filesystem write warning:', e);
        }

        // 2. Simpan ke SQLite
        const db = getLocalDb();
        if (db) {
          try {
            db.prepare(`
              INSERT INTO productivity_data (data_key, dataset, last_updated)
              VALUES ('current', ?, CURRENT_TIMESTAMP)
              ON CONFLICT(data_key) DO UPDATE SET
                dataset = excluded.dataset,
                last_updated = excluded.last_updated
            `).run(JSON.stringify(finalDataset));
          } catch (e) {
            console.warn('SQLite save dataset warning:', e);
          }
        }

        // 3. Simpan ke Supabase
        let supaErrorDetail: string | null = null;
        if (isSupabaseConfigured && supabase) {
          try {
            const { error: supaErr } = await supabase.from('productivity_data').upsert({
              data_key: 'current',
              dataset: finalDataset,
              last_updated: new Date().toISOString(),
            }, { onConflict: 'data_key' });
            if (supaErr) {
              console.error('Supabase save dataset error:', supaErr);
              supaErrorDetail = supaErr.message || JSON.stringify(supaErr);
            }
          } catch (e: any) {
            console.warn('Supabase save dataset warning:', e);
            supaErrorDetail = e?.message || 'Exception during Supabase save';
          }
        }

        return NextResponse.json({
          success: true,
          dataset: finalDataset,
          persisted: {
            supabase: isSupabaseConfigured ? (!supaErrorDetail ? 'saved' : `error: ${supaErrorDetail}`) : 'not_configured',
            sqlite: db ? 'saved' : 'skipped',
          },
        });
      }

      return NextResponse.json({ success: false, error: 'Action tidak dikenali' }, { status: 400 });
    }

    // 2. Multipart Form Data -> Upload File MB51 (.xlsx / .xls / .csv)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'File tidak ditemukan pada request' }, { status: 400 });
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!['.xlsx', '.xls', '.csv', '.tsv', '.txt'].includes(ext)) {
        return NextResponse.json(
          { success: false, error: 'Format file harus .xlsx, .xls, .csv, .tsv, atau .txt (Export SAP MB51)' },
          { status: 400 }
        );
      }

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spindo-mb51-'));
      const tmpInputPath = path.join(tmpDir, file.name.replace(/[^a-zA-Z0-9._ -]/g, '_'));
      const tmpOutputPath = path.join(tmpDir, 'output.json');

      try {
        const arrayBuffer = await file.arrayBuffer();
        fs.writeFileSync(tmpInputPath, Buffer.from(arrayBuffer));

        await execFileAsync(
          'python',
          ['-I', PARSER_SCRIPT_PATH, '--input', tmpInputPath, '--output', tmpOutputPath],
          { timeout: 180000, maxBuffer: 10 * 1024 * 1024 }
        );

        if (!fs.existsSync(tmpOutputPath)) {
          throw new Error('Parser tidak menghasilkan output data yang valid');
        }

        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.copyFileSync(tmpOutputPath, PRODUCTIVITY_JSON_PATH);

        const dataset = loadProductivityDataset();
        const headcount = loadHeadcountConfig();

        // Simpan ke SQLite
        const db = getLocalDb();
        if (db) {
          try {
            db.prepare(`
              INSERT INTO productivity_data (data_key, dataset, headcount, last_updated)
              VALUES ('current', ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(data_key) DO UPDATE SET
                dataset = excluded.dataset,
                last_updated = excluded.last_updated
            `).run(JSON.stringify(dataset), JSON.stringify(headcount));
          } catch (e) {
            console.warn('SQLite save productivity dataset warning:', e);
          }
        }

        // Simpan ke Supabase
        let supaErrorDetail: string | null = null;
        if (isSupabaseConfigured && supabase) {
          try {
            const { error: supaErr } = await supabase.from('productivity_data').upsert({
              data_key: 'current',
              dataset,
              headcount,
              last_updated: new Date().toISOString(),
            }, { onConflict: 'data_key' });
            if (supaErr) {
              console.error('Supabase save productivity dataset warning:', supaErr);
              supaErrorDetail = supaErr.message || JSON.stringify(supaErr);
            }
          } catch (e: any) {
            console.warn('Supabase save productivity dataset warning:', e);
            supaErrorDetail = e?.message || 'Exception during Supabase save';
          }
        }

        return NextResponse.json({
          success: true,
          dataset,
          headcount,
          persisted: {
            supabase: isSupabaseConfigured ? (!supaErrorDetail ? 'saved' : `error: ${supaErrorDetail}`) : 'not_configured',
          },
        });
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup error
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Unsupported Content-Type' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/productivity:', err);
    const stderrMsg = err?.stderr ? String(err.stderr).trim() : '';
    return NextResponse.json(
      {
        success: false,
        error: stderrMsg || err?.message || 'Gagal memproses file MB51',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const originErr = rejectCrossOrigin(request);
  if (originErr) return originErr;

  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const cleanDate = dateParam ? dateParam.trim().replace(/^snap_/, '') : null;
    const isSingleDateDelete = Boolean(cleanDate && cleanDate !== '' && cleanDate !== 'latest' && cleanDate !== 'ALL');

    const emptyDataset = {
      sourceFile: '',
      lastUpdated: new Date().toISOString(),
      totalRowsRead: 0,
      postingDates: [],
      tanggalKerjaDates: [],
      records: [],
      hourlyRecords: [],
    };

    let targetDataset = emptyDataset;

    if (isSingleDateDelete && cleanDate) {
      // Ambil dataset yang ada saat ini
      let currentDataset: any = null;
      const db = getLocalDb();
      if (db) {
        try {
          const row = db.prepare("SELECT dataset FROM productivity_data WHERE data_key = 'current' LIMIT 1").get() as any;
          if (row?.dataset) {
            currentDataset = typeof row.dataset === 'string' ? JSON.parse(row.dataset) : row.dataset;
          }
        } catch (e) {
          console.warn('SQLite read error during DELETE:', e);
        }
      }

      if (!currentDataset && isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.from('productivity_data').select('dataset').eq('data_key', 'current').maybeSingle();
          if (data?.dataset) {
            currentDataset = typeof data.dataset === 'string' ? JSON.parse(data.dataset) : data.dataset;
          }
        } catch (e) {
          console.warn('Supabase read error during DELETE:', e);
        }
      }

      if (!currentDataset) {
        currentDataset = loadProductivityDataset();
      }

      if (currentDataset && Array.isArray(currentDataset.records)) {
        const filteredRecords = currentDataset.records.filter((r: any) => r.tanggal !== cleanDate);
        const filteredHourly = Array.isArray(currentDataset.hourlyRecords)
          ? currentDataset.hourlyRecords.filter((h: any) => h.tanggal !== cleanDate)
          : [];
        const postingDates = (currentDataset.postingDates || []).filter((d: string) => d !== cleanDate);
        const tanggalKerjaDates = (currentDataset.tanggalKerjaDates || []).filter((d: string) => d !== cleanDate);

        targetDataset = {
          sourceFile: currentDataset.sourceFile || '',
          lastUpdated: new Date().toISOString(),
          totalRowsRead: filteredRecords.length,
          postingDates,
          tanggalKerjaDates,
          records: filteredRecords,
          hourlyRecords: filteredHourly,
        };
      }
    }

    // 1. Simpan ke file JSON lokal
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(PRODUCTIVITY_JSON_PATH, JSON.stringify(targetDataset, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Filesystem write warning during DELETE:', e);
    }

    // 2. Simpan ke SQLite
    const db = getLocalDb();
    if (db) {
      try {
        db.prepare(`
          INSERT INTO productivity_data (data_key, dataset, last_updated)
          VALUES ('current', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(data_key) DO UPDATE SET
            dataset = excluded.dataset,
            last_updated = excluded.last_updated
        `).run(JSON.stringify(targetDataset));
      } catch (e) {
        console.warn('SQLite save error during DELETE:', e);
      }
    }

    // 3. Simpan ke Supabase jika terkonfigurasi
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('productivity_data').upsert({
          data_key: 'current',
          dataset: targetDataset,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'data_key' });
      } catch (e) {
        console.warn('Supabase save error during DELETE:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: isSingleDateDelete
        ? `Data produktivitas tanggal ${cleanDate} berhasil dihapus.`
        : 'Semua data transaksi produktivitas berhasil direset.',
      deletedDate: isSingleDateDelete ? cleanDate : null,
      remainingRows: targetDataset.totalRowsRead,
      dataset: targetDataset,
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/productivity:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus data produktivitas' },
      { status: 500 }
    );
  }
}

