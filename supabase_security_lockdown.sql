-- ==============================================================================
-- SPINDO WAREHOUSE - SUPABASE SECURITY LOCKDOWN
-- Jalankan sekali di Supabase SQL Editor untuk database yang SUDAH ADA.
--
-- Latar belakang:
--   Schema lama membuat policy "Allow read"/"Allow write" untuk role anon dan
--   authenticated. Artinya siapa pun yang memiliki anon/publishable key bisa
--   membaca dan menulis seluruh data warehouse.
--
-- Setelah skrip ini:
--   - RLS aktif di semua tabel.
--   - SEMUA policy public dihapus (tidak ada policy = akses ditolak).
--   - Role anon tidak punya hak tabel/sequence.
--   - Aplikasi tetap berjalan karena server memakai SUPABASE_SERVICE_ROLE_KEY,
--     dan service role otomatis melewati RLS.
--
-- WAJIB: rotasi (regenerate) anon/publishable key dan service role key di
-- Supabase Dashboard > Settings > API setelah menjalankan skrip ini, karena
-- key lama pernah tertulis di source code.
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  pol record;
  tbls text[] := ARRAY[
    'snapshots',
    'pipe_capacities',
    'fast_slow',
    'coil_strip',
    'nc_warehouse',
    'nc_items',
    'loo_items',
    'unfifo_items',
    'unfifo_coil',
    'unfifo_pipe',
    'damaged_packaging',
    'nc_progress',
    'stock_opname',
    'customer_breakdown',
    'warehouse_snapshots',
    'users',
    'roles',
    'app_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Defense in depth: cabut akses langsung role anon.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  END IF;
END $$;

-- ==============================================================================
-- VERIFIKASI (opsional, jalankan manual)
-- ==============================================================================
-- SELECT tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Hasil yang diharapkan: tidak ada baris untuk tabel warehouse.
-- ==============================================================================
