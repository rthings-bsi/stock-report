import { createClient } from '@supabase/supabase-js';

// Supabase hanya aktif pada environment cloud deploy (Vercel) atau jika eksplisit diaktifkan via ENABLE_SUPABASE=true
// Di lingkungan lokal (Windows/Localhost/SQLite), Supabase dinonaktifkan untuk melindungi data produksi.
// Semua akses Supabase dilakukan dari server memakai service role key; RLS menolak anon/authenticated.
const isCloudDeploy =
  Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.ENABLE_SUPABASE === 'true') &&
  process.env.DISABLE_SUPABASE !== 'true';

const supabaseUrl = isCloudDeploy
  ? (process.env.NEXT_PUBLIC_SUPABASE_URL ||
     process.env.SUPABASE_URL ||
     'https://gobcmaehhdktvyqbvfjv.supabase.co')
  : '';

// Wajib service role key untuk operasi server-side. Mendukung berbagai alias environment variable Vercel.
const supabaseKey = isCloudDeploy
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY ||
     process.env.SUPABASE_SERVICE_KEY ||
     process.env.SUPABASE_KEY ||
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
     process.env.SUPABASE_ANON_KEY ||
     '')
  : '';

export const isSupabaseConfigured = Boolean(
  isCloudDeploy && supabaseUrl.startsWith('http') && supabaseKey
);

if (isCloudDeploy && !isSupabaseConfigured) {
  console.warn(
    '[SECURITY] Supabase dinonaktifkan: SUPABASE_SERVICE_ROLE_KEY / URL belum diisi. ' +
      'Aplikasi akan memakai penyimpanan lokal.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
