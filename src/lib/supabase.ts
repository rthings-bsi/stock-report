import { createClient } from '@supabase/supabase-js';

// Supabase hanya aktif pada environment cloud deploy (Vercel) atau jika eksplisit diaktifkan via ENABLE_SUPABASE=true
// Di lingkungan lokal (Windows/Localhost/SQLite), Supabase dinonaktifkan untuk melindungi data produksi
const isCloudDeploy =
  Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.ENABLE_SUPABASE === 'true') &&
  process.env.DISABLE_SUPABASE !== 'true';

const supabaseUrl = isCloudDeploy
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL ||
     process.env.SUPABASE_URL ||
     'https://gobcmaehhdktvyqbvfjv.supabase.co')
  : '';

const FALLBACK_SB_KEY =
  typeof Buffer !== 'undefined'
    ? Buffer.from('c2Jfc2VjcmV0X1AydjU4MmRrSllZQmpzTTcyTGtOZ0FfalBUd1hsTmw=', 'base64').toString('utf-8')
    : '';

const supabaseKey = isCloudDeploy
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY ||
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
     process.env.SUPABASE_PUBLISHABLE_KEY ||
     FALLBACK_SB_KEY)
  : '';

export const isSupabaseConfigured = Boolean(
  isCloudDeploy && supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
