-- ==============================================================================
-- SPINDO WAREHOUSE - MASTER SUPABASE SQL MIGRATION (ALL-IN-ONE)
-- ==============================================================================
-- Skrip ini IDEMPOTENT (aman dijalankan berkali-kali).
-- Menyiapkan seluruh tabel database Supabase yang dibutuhkan di produksi:
--   1. warehouse_snapshots (termasuk audit_sloc_data, sto_data, nc_progress_data)
--   2. productivity_data (Produktivitas Tenaga Kerja Gudang SAP MB51)
--   3. roles & users (Kelola Pengguna & Hak Akses)
--   4. snapshots & tabel-tabel normalized (Kapasitas, Fast/Slow, NC, LOO, dll.)
--   5. Row Level Security (RLS) & schema reload
--
-- CARA PENGGUNAAN:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard/project/gobcmaehhdktvyqbvfjv)
-- 2. Masuk ke menu "SQL Editor" di bilah samping kiri
-- 3. Klik "New query"
-- 4. Salin seluruh isi skrip ini, tempel ke editor, lalu klik tombol "Run" (hijau)
-- 5. Tabel verifikasi di bagian bawah akan menampilkan status kolom yang berhasil dibuat.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. TABEL UTAMA: WAREHOUSE_SNAPSHOTS (Legacy & Consolidated Snapshot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT UNIQUE NOT NULL,
  last_updated TEXT NOT NULL,
  pipe_capacities JSONB NOT NULL DEFAULT '[]'::jsonb,
  fast_slow_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  coil_strip_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  nc_warehouse_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  nc_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  loo_st_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  loo_lt_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  unfifo_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  unfifo_coil_data JSONB DEFAULT '[]'::jsonb,
  unfifo_pipe_data JSONB DEFAULT '[]'::jsonb,
  damaged_packaging_data JSONB DEFAULT '[]'::jsonb,
  incoming_packaging_data JSONB DEFAULT '[]'::jsonb,
  nc_progress_data JSONB DEFAULT '[]'::jsonb,
  sto_data JSONB DEFAULT '[]'::jsonb,
  audit_sloc_data JSONB DEFAULT '[]'::jsonb,
  customer_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambahkan kolom jika tabel sudah ada dari versi lama
ALTER TABLE public.warehouse_snapshots
  ADD COLUMN IF NOT EXISTS unfifo_coil_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS unfifo_pipe_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS damaged_packaging_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS incoming_packaging_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS nc_progress_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sto_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_sloc_data JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_breakdown JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_key ON public.warehouse_snapshots(snapshot_key);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_created ON public.warehouse_snapshots(created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. TABEL PRODUKTIVITAS TENAGA KERJA GUDANG (SAP MB51)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.productivity_data (
  id BIGSERIAL PRIMARY KEY,
  data_key TEXT UNIQUE NOT NULL DEFAULT 'current',
  dataset JSONB,
  headcount JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productivity_data_key ON public.productivity_data(data_key);

-- ------------------------------------------------------------------------------
-- 3. TABEL ROLES & USERS (Manajemen User & Autentikasi)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'slate',
  is_system INTEGER DEFAULT 0,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  department TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles jika belum ada
INSERT INTO public.roles (key, name, description, color, is_system, permissions)
SELECT 'admin', 'Administrator', 'Hak akses tertinggi ke seluruh modul dan pengaturan', 'emerald', 1,
  '{"viewCapacity":true,"viewFastSlow":true,"viewCoilStrip":true,"viewNC":true,"viewUnfifo":true,"viewLoo":true,"viewDamagedPkg":true,"viewIncomingPkg":true,"viewProgressNC":true,"viewCapacitySettings":true,"viewSTO":true,"viewAuditSLoc":true,"viewProductivity":true,"viewUserManagement":true,"canUploadSAP":true,"canUploadPipe":true,"canUploadCoil":true,"canUploadLoo":true,"canUploadDamagedPkg":true,"canUploadIncomingPkg":true,"canUploadProgressNC":true,"canUploadSTO":true,"canUploadAuditSLoc":true,"canUploadProductivity":true,"canEditIncomingPkg":true,"canEditDamagedPkg":true,"canEditProgressNC":true,"canEditSTO":true,"canEditAuditSLoc":true,"canExportExcel":true,"canCustomizeLayout":true,"canManageCapacity":true,"canManageUsers":true,"canSaveSnapshot":true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE key = 'admin');

INSERT INTO public.roles (key, name, description, color, is_system, permissions)
SELECT 'staff', 'Staff Operasional', 'Akses operasional monitoring gudang dan pencatatan RTP', 'sky', 1,
  '{"viewCapacity":true,"viewFastSlow":true,"viewCoilStrip":true,"viewNC":true,"viewUnfifo":true,"viewLoo":true,"viewDamagedPkg":true,"viewIncomingPkg":true,"viewProgressNC":true,"viewCapacitySettings":true,"viewSTO":true,"viewAuditSLoc":true,"viewProductivity":true,"viewUserManagement":false,"canUploadSAP":false,"canUploadPipe":false,"canUploadCoil":false,"canUploadLoo":false,"canUploadDamagedPkg":false,"canUploadIncomingPkg":false,"canUploadProgressNC":false,"canUploadSTO":false,"canUploadAuditSLoc":false,"canUploadProductivity":false,"canEditIncomingPkg":true,"canEditDamagedPkg":false,"canEditProgressNC":true,"canEditSTO":false,"canEditAuditSLoc":false,"canExportExcel":true,"canCustomizeLayout":false,"canManageCapacity":false,"canManageUsers":false,"canSaveSnapshot":false}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE key = 'staff');

-- ------------------------------------------------------------------------------
-- 4. TABEL NORMALIZED (Header Snapshots & Detail Tables)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT UNIQUE NOT NULL,
  last_updated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_key ON public.snapshots(snapshot_key);

CREATE TABLE IF NOT EXISTS public.pipe_capacities (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  kapasitas NUMERIC(12, 2) DEFAULT 0,
  stock NUMERIC(12, 2) DEFAULT 0,
  persen_terisi NUMERIC(6, 2) DEFAULT 0,
  selisih NUMERIC(12, 2) DEFAULT 0,
  wip_lt NUMERIC(12, 2) DEFAULT 0,
  fg_lt NUMERIC(12, 2) DEFAULT 0,
  wip_st NUMERIC(12, 2) DEFAULT 0,
  fg_st NUMERIC(12, 2) DEFAULT 0,
  customer_stock NUMERIC(12, 2) DEFAULT 0,
  free_stock NUMERIC(12, 2) DEFAULT 0,
  persen_free_stock NUMERIC(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipe_capacities_snap ON public.pipe_capacities(snapshot_key);

CREATE TABLE IF NOT EXISTS public.fast_slow (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  fast_ton NUMERIC(12, 2) DEFAULT 0,
  fast_persen NUMERIC(6, 2) DEFAULT 0,
  slow_ton NUMERIC(12, 2) DEFAULT 0,
  slow_persen NUMERIC(6, 2) DEFAULT 0,
  total_ton NUMERIC(12, 2) DEFAULT 0,
  fg_lt_slow NUMERIC(12, 2) DEFAULT 0,
  fg_st_slow NUMERIC(12, 2) DEFAULT 0,
  wip_lt_slow NUMERIC(12, 2) DEFAULT 0,
  wip_st_slow NUMERIC(12, 2) DEFAULT 0,
  yearly_slow_ton JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fast_slow_snap ON public.fast_slow(snapshot_key);

CREATE TABLE IF NOT EXISTS public.coil_strip (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  area TEXT NOT NULL,
  coil_qty INT DEFAULT 0,
  coil_ton NUMERIC(12, 2) DEFAULT 0,
  strip_qty INT DEFAULT 0,
  strip_ton NUMERIC(12, 2) DEFAULT 0,
  total_qty INT DEFAULT 0,
  total_ton NUMERIC(12, 2) DEFAULT 0,
  kapasitas NUMERIC(12, 2) DEFAULT 0,
  persen_terisi NUMERIC(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coil_strip_snap ON public.coil_strip(snapshot_key);

CREATE TABLE IF NOT EXISTS public.nc_warehouse (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  prime NUMERIC(12, 2) DEFAULT 0,
  grade_e NUMERIC(12, 2) DEFAULT 0,
  grade_c NUMERIC(12, 2) DEFAULT 0,
  persen_grade_e NUMERIC(6, 2) DEFAULT 0,
  qty INT,
  qty_lt INT,
  qty_st INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_warehouse_snap ON public.nc_warehouse(snapshot_key);

CREATE TABLE IF NOT EXISTS public.nc_items (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  item_id TEXT,
  no_nc TEXT,
  gudang TEXT,
  ukuran TEXT,
  customer TEXT,
  kode_material TEXT,
  type TEXT,
  grade TEXT,
  fg_ton NUMERIC(12, 3) DEFAULT 0,
  wip_ton NUMERIC(12, 3) DEFAULT 0,
  total_ton NUMERIC(12, 3) DEFAULT 0,
  qty INT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_items_snap ON public.nc_items(snapshot_key);

CREATE TABLE IF NOT EXISTS public.nc_progress (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  item_id TEXT,
  entry_date TEXT,
  time_of_entry TEXT,
  plant TEXT,
  storage_location TEXT,
  posting_date TEXT,
  movement_type TEXT,
  customer TEXT,
  purchase_order TEXT,
  order_no TEXT,
  work_center TEXT,
  material TEXT,
  material_description TEXT,
  batch TEXT,
  qty_in_un_of_entry NUMERIC(12, 2) DEFAULT 0,
  quantity NUMERIC(12, 2) DEFAULT 0,
  amount_in_lc NUMERIC(14, 2) DEFAULT 0,
  document_header_text TEXT,
  material_document TEXT,
  material_doc_item TEXT,
  reference TEXT,
  gr_gi_slip TEXT,
  user_name TEXT,
  text TEXT,
  unloading_point TEXT,
  sales_order TEXT,
  sales_order_item TEXT,
  kg_gi NUMERIC(12, 2) DEFAULT 0,
  kg_gr NUMERIC(12, 2) DEFAULT 0,
  transaction_type TEXT,
  ncr_number TEXT,
  problem_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_progress_snap ON public.nc_progress(snapshot_key);

CREATE TABLE IF NOT EXISTS public.damaged_packaging (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  item_id TEXT,
  no_urut INT,
  package_no TEXT,
  serial_no TEXT,
  plant TEXT,
  customer TEXT,
  user_scan TEXT,
  tgl_scan_in TEXT,
  jam_scan_in TEXT,
  kondisi TEXT,
  slot TEXT,
  kaki TEXT,
  rangka TEXT,
  pengait TEXT,
  dinding TEXT,
  label_item TEXT,
  limbah TEXT,
  defect_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_damaged_pkg_snap ON public.damaged_packaging(snapshot_key);

CREATE TABLE IF NOT EXISTS public.stock_opname (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  data_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_opname_snap ON public.stock_opname(snapshot_key);

CREATE TABLE IF NOT EXISTS public.customer_breakdown (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES public.snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  customer TEXT NOT NULL,
  qty INT DEFAULT 0,
  tonase NUMERIC(12, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cust_breakdown_snap ON public.customer_breakdown(snapshot_key);

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) & SERVICE ROLE POLICIES
-- ------------------------------------------------------------------------------
-- Seluruh tabel diamankan dengan RLS. Akses via SUPABASE_SERVICE_ROLE_KEY di server
-- otomatis diizinkan penuh (bypasses RLS), sementara akses anon/publik ditolak.
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'warehouse_snapshots',
    'productivity_data',
    'roles',
    'users',
    'snapshots',
    'pipe_capacities',
    'fast_slow',
    'coil_strip',
    'nc_warehouse',
    'nc_items',
    'nc_progress',
    'damaged_packaging',
    'stock_opname',
    'customer_breakdown'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'service_role_all_' || tbl, tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', 'service_role_all_' || tbl, tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Paksa PostgREST reload cache schema agar kolom dan tabel baru langsung aktif
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- HASIL VERIFIKASI KOLOM & TABEL
-- ==============================================================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'warehouse_snapshots' AND column_name IN ('audit_sloc_data', 'sto_data', 'nc_progress_data', 'customer_breakdown'))
    OR
    (table_name = 'productivity_data' AND column_name IN ('data_key', 'dataset', 'headcount', 'last_updated'))
    OR
    (table_name = 'roles' AND column_name IN ('key', 'permissions'))
    OR
    (table_name = 'users' AND column_name IN ('username', 'role'))
  )
ORDER BY table_name, column_name;
