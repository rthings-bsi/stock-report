-- ==============================================================================
-- MIGRASI: Audit SLoc & Produktivitas Gudang (MB51) untuk Supabase PostgreSQL
-- ------------------------------------------------------------------------------
-- Menambahkan:
--   1. Kolom audit_sloc_data, sto_data, & nc_progress_data pada warehouse_snapshots
--   2. Tabel baru productivity_data untuk sinkronisasi dataset & headcount MB51
--
-- Sifat : IDEMPOTENT — aman dijalankan berkali-kali.
-- Cara  : Supabase Dashboard -> SQL Editor -> paste seluruh file -> Run.
-- ==============================================================================

BEGIN;

-- 1. Pastikan kolom Audit SLoc, STO, dan NC Progress ada di warehouse_snapshots
ALTER TABLE IF EXISTS public.warehouse_snapshots
  ADD COLUMN IF NOT EXISTS audit_sloc_data JSONB,
  ADD COLUMN IF NOT EXISTS sto_data JSONB,
  ADD COLUMN IF NOT EXISTS nc_progress_data JSONB;

COMMENT ON COLUMN public.warehouse_snapshots.audit_sloc_data IS
  'Data rekonsiliasi Audit SLoc 14 kolom SAP (JSON array)';

COMMENT ON COLUMN public.warehouse_snapshots.sto_data IS
  'Data Stock Opname (STO) SAP (JSON array)';

COMMENT ON COLUMN public.warehouse_snapshots.nc_progress_data IS
  'Data pergerakan / transaksi Progres NC MVT 309, 261 & 101';

-- 2. Tabel Produktivitas Tenaga Kerja Gudang (MB51) ----------------------------
CREATE TABLE IF NOT EXISTS public.productivity_data (
  id BIGSERIAL PRIMARY KEY,
  data_key TEXT UNIQUE NOT NULL DEFAULT 'current',
  dataset JSONB,
  headcount JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productivity_data_key ON public.productivity_data(data_key);

COMMENT ON TABLE public.productivity_data IS
  'Penyimpanan terpusat dataset produktivitas gudang (SAP MB51) dan konfigurasi master headcount/manpower';

-- 3. Row Level Security (RLS) -------------------------------------------------
ALTER TABLE public.productivity_data ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses: tolak akses langsung anon / authenticated via client-side;
-- hanya server (service_role) yang diizinkan baca & tulis untuk keamanan data.
DROP POLICY IF EXISTS "service_role_all_productivity_data" ON public.productivity_data;
CREATE POLICY "service_role_all_productivity_data"
  ON public.productivity_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;

-- Supabase/PostgREST menyimpan cache skema; paksa reload supaya kolom dan tabel baru
-- langsung dikenali oleh API server.
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- VERIFIKASI (jalankan setelah migrasi untuk memastikan berhasil)
-- ==============================================================================
SELECT 'warehouse_snapshots' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'warehouse_snapshots'
  AND column_name IN ('audit_sloc_data', 'sto_data', 'nc_progress_data')
UNION ALL
SELECT 'productivity_data' AS table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'productivity_data';
