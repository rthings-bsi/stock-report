-- ==============================================================================
-- Supabase PostgreSQL Normalized Migration for Spindo Warehouse Dashboard
-- Jalankan skrip ini langsung di Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. HEADER ARSIP / SNAPSHOT
CREATE TABLE IF NOT EXISTS snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT UNIQUE NOT NULL,
  last_updated TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snapshots_key ON snapshots(snapshot_key);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at DESC);

-- 2. KAPASITAS PIPA
CREATE TABLE IF NOT EXISTS pipe_capacities (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_pipe_capacities_snap ON pipe_capacities(snapshot_key);

-- 3. FAST SLOW
CREATE TABLE IF NOT EXISTS fast_slow (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_fast_slow_snap ON fast_slow(snapshot_key);

-- 4. COIL & STRIP
CREATE TABLE IF NOT EXISTS coil_strip (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_coil_strip_snap ON coil_strip(snapshot_key);

-- 5. REKAP GUDANG NC
CREATE TABLE IF NOT EXISTS nc_warehouse (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  prime NUMERIC(12, 2) DEFAULT 0,
  grade_e NUMERIC(12, 2) DEFAULT 0,
  grade_c NUMERIC(12, 2) DEFAULT 0,
  persen_grade_e NUMERIC(6, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_warehouse_snap ON nc_warehouse(snapshot_key);

-- 6. DETAIL ITEM NC
CREATE TABLE IF NOT EXISTS nc_items (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nc_items_snap ON nc_items(snapshot_key);

-- 7. LOO FULFILLMENT (ST & LT)
CREATE TABLE IF NOT EXISTS loo_items (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  loo_type TEXT NOT NULL, -- 'ST' | 'LT'
  no_urut INT,
  gudang TEXT,
  gudangs JSONB DEFAULT '[]'::jsonb,
  customer TEXT,
  ukuran TEXT,
  kode_material TEXT,
  material_type TEXT,
  grade TEXT,
  prime_ton NUMERIC(12, 2) DEFAULT 0,
  grade_c_ton NUMERIC(12, 2) DEFAULT 0,
  grade_e_ton NUMERIC(12, 2) DEFAULT 0,
  fg_ton NUMERIC(12, 2) DEFAULT 0,
  wip_ton NUMERIC(12, 2) DEFAULT 0,
  total_stock_ton NUMERIC(12, 2) DEFAULT 0,
  loo_ton NUMERIC(12, 2) DEFAULT 0,
  persen_fulfillment NUMERIC(6, 2) DEFAULT 0,
  prime_fulfillment NUMERIC(6, 2) DEFAULT 0,
  fg_qty INT DEFAULT 0,
  wip_qty INT DEFAULT 0,
  total_qty INT DEFAULT 0,
  loo_qty INT DEFAULT 0,
  gudang_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loo_items_snap ON loo_items(snapshot_key, loo_type);

-- 8. UNFIFO REKAP
CREATE TABLE IF NOT EXISTS unfifo_items (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT,
  kode_material TEXT,
  ukuran TEXT,
  customer TEXT,
  batch_old TEXT,
  batch_new TEXT,
  date_old TEXT,
  date_new TEXT,
  qty_old INT DEFAULT 0,
  tonase_old NUMERIC(12, 2) DEFAULT 0,
  aging_days INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unfifo_items_snap ON unfifo_items(snapshot_key);

-- 9. UNFIFO COIL
CREATE TABLE IF NOT EXISTS unfifo_coil (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT,
  kode_material TEXT,
  specification TEXT,
  manufaktur TEXT,
  batch TEXT,
  tebal NUMERIC(10, 2) DEFAULT 0,
  lebar NUMERIC(10, 2) DEFAULT 0,
  qty_roll INT DEFAULT 0,
  tonase NUMERIC(12, 3) DEFAULT 0,
  inc_date TEXT,
  unfifo_status TEXT,
  issue_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unfifo_coil_snap ON unfifo_coil(snapshot_key);

-- 10. UNFIFO PIPA
CREATE TABLE IF NOT EXISTS unfifo_pipe (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT,
  kode_material TEXT,
  ukuran TEXT,
  customer TEXT,
  batch TEXT,
  prod_year TEXT,
  qty_btg INT DEFAULT 0,
  tonase NUMERIC(12, 3) DEFAULT 0,
  inc_date TEXT,
  unfifo_status TEXT,
  issue_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unfifo_pipe_snap ON unfifo_pipe(snapshot_key);

-- 11. PACKAGING RUSAK
CREATE TABLE IF NOT EXISTS damaged_packaging (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_damaged_pkg_snap ON damaged_packaging(snapshot_key);

-- 12. TRANSAKSI PROGRESS NC (SAP)
CREATE TABLE IF NOT EXISTS nc_progress (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_nc_progress_snap ON nc_progress(snapshot_key);

-- 13. STOCK OPNAME
CREATE TABLE IF NOT EXISTS stock_opname (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  data_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_opname_snap ON stock_opname(snapshot_key);

-- 14. CUSTOMER BREAKDOWN
CREATE TABLE IF NOT EXISTS customer_breakdown (
  id BIGSERIAL PRIMARY KEY,
  snapshot_key TEXT NOT NULL REFERENCES snapshots(snapshot_key) ON DELETE CASCADE,
  gudang TEXT NOT NULL,
  customer TEXT NOT NULL,
  qty INT DEFAULT 0,
  tonase NUMERIC(12, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cust_breakdown_snap ON customer_breakdown(snapshot_key);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- ==============================================================================
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'snapshots', 'pipe_capacities', 'fast_slow', 'coil_strip', 'nc_warehouse',
    'nc_items', 'loo_items', 'unfifo_items', 'unfifo_coil', 'unfifo_pipe',
    'damaged_packaging', 'nc_progress', 'stock_opname', 'customer_breakdown'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow read %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow read %I" ON %I FOR SELECT TO anon, authenticated USING (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow write %I" ON %I;', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow write %I" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ==============================================================================
-- AUTOMATIC DATA MIGRATION FROM warehouse_snapshots (IF EXISTS)
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
  rec RECORD;
  gudang_key text;
  cust_elem jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_snapshots') THEN
    FOR r IN SELECT * FROM warehouse_snapshots LOOP
      -- 1. Insert snapshot header
      INSERT INTO snapshots (snapshot_key, last_updated, created_at)
      VALUES (r.snapshot_key, r.last_updated, r.created_at)
      ON CONFLICT (snapshot_key) DO UPDATE SET
        last_updated = EXCLUDED.last_updated,
        created_at = EXCLUDED.created_at;

      -- 2. Pipe Capacities
      IF r.pipe_capacities IS NOT NULL AND jsonb_typeof(r.pipe_capacities) = 'array' THEN
        DELETE FROM pipe_capacities WHERE snapshot_key = r.snapshot_key;
        INSERT INTO pipe_capacities (
          snapshot_key, gudang, kapasitas, stock, persen_terisi, selisih,
          wip_lt, fg_lt, wip_st, fg_st, customer_stock, free_stock, persen_free_stock
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          COALESCE((elem->>'kapasitas')::numeric, 0),
          COALESCE((elem->>'stock')::numeric, 0),
          COALESCE((elem->>'persenTerisi')::numeric, 0),
          COALESCE((elem->>'selisih')::numeric, 0),
          COALESCE((elem->>'wipLt')::numeric, 0),
          COALESCE((elem->>'fgLt')::numeric, 0),
          COALESCE((elem->>'wipSt')::numeric, 0),
          COALESCE((elem->>'fgSt')::numeric, 0),
          COALESCE((elem->>'customerStock')::numeric, 0),
          COALESCE((elem->>'freeStock')::numeric, 0),
          COALESCE((elem->>'persenFreeStock')::numeric, 0)
        FROM jsonb_array_elements(r.pipe_capacities) AS elem;
      END IF;

      -- 3. Fast Slow
      IF r.fast_slow_data IS NOT NULL AND jsonb_typeof(r.fast_slow_data) = 'array' THEN
        DELETE FROM fast_slow WHERE snapshot_key = r.snapshot_key;
        INSERT INTO fast_slow (
          snapshot_key, gudang, fast_ton, fast_persen, slow_ton, slow_persen,
          total_ton, fg_lt_slow, fg_st_slow, wip_lt_slow, wip_st_slow, yearly_slow_ton
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          COALESCE((elem->>'fastTon')::numeric, 0),
          COALESCE((elem->>'fastPersen')::numeric, 0),
          COALESCE((elem->>'slowTon')::numeric, 0),
          COALESCE((elem->>'slowPersen')::numeric, 0),
          COALESCE((elem->>'totalTon')::numeric, 0),
          COALESCE((elem->>'fgLtSlow')::numeric, 0),
          COALESCE((elem->>'fgStSlow')::numeric, 0),
          COALESCE((elem->>'wipLtSlow')::numeric, 0),
          COALESCE((elem->>'wipStSlow')::numeric, 0),
          COALESCE(elem->'yearlySlowTon', '{}'::jsonb)
        FROM jsonb_array_elements(r.fast_slow_data) AS elem;
      END IF;

      -- 4. Coil & Strip
      IF r.coil_strip_data IS NOT NULL AND jsonb_typeof(r.coil_strip_data) = 'array' THEN
        DELETE FROM coil_strip WHERE snapshot_key = r.snapshot_key;
        INSERT INTO coil_strip (
          snapshot_key, gudang, area, coil_qty, coil_ton, strip_qty, strip_ton,
          total_qty, total_ton, kapasitas, persen_terisi
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          (elem->>'area')::text,
          COALESCE((elem->>'coilQty')::int, 0),
          COALESCE((elem->>'coilTon')::numeric, 0),
          COALESCE((elem->>'stripQty')::int, 0),
          COALESCE((elem->>'stripTon')::numeric, 0),
          COALESCE((elem->>'totalQty')::int, 0),
          COALESCE((elem->>'totalTon')::numeric, 0),
          COALESCE((elem->>'kapasitas')::numeric, 0),
          COALESCE((elem->>'persenTerisi')::numeric, 0)
        FROM jsonb_array_elements(r.coil_strip_data) AS elem;
      END IF;

      -- 5. NC Warehouse
      IF r.nc_warehouse_data IS NOT NULL AND jsonb_typeof(r.nc_warehouse_data) = 'array' THEN
        DELETE FROM nc_warehouse WHERE snapshot_key = r.snapshot_key;
        INSERT INTO nc_warehouse (
          snapshot_key, gudang, prime, grade_e, grade_c, persen_grade_e
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          COALESCE((elem->>'prime')::numeric, 0),
          COALESCE((elem->>'gradeE')::numeric, 0),
          COALESCE((elem->>'gradeC')::numeric, 0),
          COALESCE((elem->>'persenGradeE')::numeric, 0)
        FROM jsonb_array_elements(r.nc_warehouse_data) AS elem;
      END IF;

      -- 6. NC Items
      IF r.nc_items IS NOT NULL AND jsonb_typeof(r.nc_items) = 'array' THEN
        DELETE FROM nc_items WHERE snapshot_key = r.snapshot_key;
        INSERT INTO nc_items (
          snapshot_key, item_id, no_nc, gudang, ukuran, customer,
          kode_material, type, grade, fg_ton, wip_ton, total_ton, remarks
        )
        SELECT
          r.snapshot_key,
          (elem->>'id')::text,
          (elem->>'noNC')::text,
          (elem->>'gudang')::text,
          (elem->>'ukuran')::text,
          (elem->>'customer')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'type')::text,
          (elem->>'grade')::text,
          COALESCE((elem->>'fgTon')::numeric, 0),
          COALESCE((elem->>'wipTon')::numeric, 0),
          COALESCE((elem->>'totalTon')::numeric, 0),
          (elem->>'remarks')::text
        FROM jsonb_array_elements(r.nc_items) AS elem;
      END IF;

      -- 7. LOO ST & LT
      IF r.loo_st_data IS NOT NULL AND jsonb_typeof(r.loo_st_data) = 'array' THEN
        DELETE FROM loo_items WHERE snapshot_key = r.snapshot_key AND loo_type = 'ST';
        INSERT INTO loo_items (
          snapshot_key, loo_type, no_urut, gudang, gudangs, customer, ukuran,
          kode_material, material_type, grade, prime_ton, grade_c_ton, grade_e_ton,
          fg_ton, wip_ton, total_stock_ton, loo_ton, persen_fulfillment, prime_fulfillment,
          fg_qty, wip_qty, total_qty, loo_qty, gudang_breakdown
        )
        SELECT
          r.snapshot_key,
          'ST',
          (elem->>'no')::int,
          (elem->>'gudang')::text,
          COALESCE(elem->'gudangs', '[]'::jsonb),
          (elem->>'customer')::text,
          (elem->>'ukuran')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'type')::text,
          (elem->>'grade')::text,
          COALESCE((elem->>'primeTon')::numeric, 0),
          COALESCE((elem->>'gradeCTon')::numeric, 0),
          COALESCE((elem->>'gradeETon')::numeric, 0),
          COALESCE((elem->>'fgTon')::numeric, 0),
          COALESCE((elem->>'wipTon')::numeric, 0),
          COALESCE((elem->>'totalStockTon')::numeric, 0),
          COALESCE((elem->>'looTon')::numeric, 0),
          COALESCE((elem->>'persenFulfillment')::numeric, 0),
          COALESCE((elem->>'primeFulfillment')::numeric, 0),
          COALESCE((elem->>'fgQty')::int, 0),
          COALESCE((elem->>'wipQty')::int, 0),
          COALESCE((elem->>'totalQty')::int, 0),
          COALESCE((elem->>'looQty')::int, 0),
          COALESCE(elem->'gudangBreakdown', '{}'::jsonb)
        FROM jsonb_array_elements(r.loo_st_data) AS elem;
      END IF;

      IF r.loo_lt_data IS NOT NULL AND jsonb_typeof(r.loo_lt_data) = 'array' THEN
        DELETE FROM loo_items WHERE snapshot_key = r.snapshot_key AND loo_type = 'LT';
        INSERT INTO loo_items (
          snapshot_key, loo_type, no_urut, gudang, gudangs, customer, ukuran,
          kode_material, material_type, grade, prime_ton, grade_c_ton, grade_e_ton,
          fg_ton, wip_ton, total_stock_ton, loo_ton, persen_fulfillment, prime_fulfillment,
          fg_qty, wip_qty, total_qty, loo_qty, gudang_breakdown
        )
        SELECT
          r.snapshot_key,
          'LT',
          (elem->>'no')::int,
          (elem->>'gudang')::text,
          COALESCE(elem->'gudangs', '[]'::jsonb),
          (elem->>'customer')::text,
          (elem->>'ukuran')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'type')::text,
          (elem->>'grade')::text,
          COALESCE((elem->>'primeTon')::numeric, 0),
          COALESCE((elem->>'gradeCTon')::numeric, 0),
          COALESCE((elem->>'gradeETon')::numeric, 0),
          COALESCE((elem->>'fgTon')::numeric, 0),
          COALESCE((elem->>'wipTon')::numeric, 0),
          COALESCE((elem->>'totalStockTon')::numeric, 0),
          COALESCE((elem->>'looTon')::numeric, 0),
          COALESCE((elem->>'persenFulfillment')::numeric, 0),
          COALESCE((elem->>'primeFulfillment')::numeric, 0),
          COALESCE((elem->>'fgQty')::int, 0),
          COALESCE((elem->>'wipQty')::int, 0),
          COALESCE((elem->>'totalQty')::int, 0),
          COALESCE((elem->>'looQty')::int, 0),
          COALESCE(elem->'gudangBreakdown', '{}'::jsonb)
        FROM jsonb_array_elements(r.loo_lt_data) AS elem;
      END IF;

      -- 8. UNFIFO
      IF r.unfifo_data IS NOT NULL AND jsonb_typeof(r.unfifo_data) = 'array' THEN
        DELETE FROM unfifo_items WHERE snapshot_key = r.snapshot_key;
        INSERT INTO unfifo_items (
          snapshot_key, gudang, kode_material, ukuran, customer,
          batch_old, batch_new, date_old, date_new, qty_old, tonase_old, aging_days
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'ukuran')::text,
          (elem->>'customer')::text,
          (elem->>'batchOld')::text,
          (elem->>'batchNew')::text,
          (elem->>'dateOld')::text,
          (elem->>'dateNew')::text,
          COALESCE((elem->>'qtyOld')::int, 0),
          COALESCE((elem->>'tonaseOld')::numeric, 0),
          COALESCE((elem->>'agingDays')::int, 0)
        FROM jsonb_array_elements(r.unfifo_data) AS elem;
      END IF;

      -- 9. UNFIFO Coil
      IF r.unfifo_coil_data IS NOT NULL AND jsonb_typeof(r.unfifo_coil_data) = 'array' THEN
        DELETE FROM unfifo_coil WHERE snapshot_key = r.snapshot_key;
        INSERT INTO unfifo_coil (
          snapshot_key, gudang, kode_material, specification, manufaktur,
          batch, tebal, lebar, qty_roll, tonase, inc_date, unfifo_status, issue_note
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'specification')::text,
          (elem->>'manufaktur')::text,
          (elem->>'batch')::text,
          COALESCE((elem->>'tebal')::numeric, 0),
          COALESCE((elem->>'lebar')::numeric, 0),
          COALESCE((elem->>'qtyRoll')::int, 0),
          COALESCE((elem->>'tonase')::numeric, 0),
          (elem->>'incDate')::text,
          (elem->>'unfifoStatus')::text,
          (elem->>'issueNote')::text
        FROM jsonb_array_elements(r.unfifo_coil_data) AS elem;
      END IF;

      -- 10. UNFIFO Pipe
      IF r.unfifo_pipe_data IS NOT NULL AND jsonb_typeof(r.unfifo_pipe_data) = 'array' THEN
        DELETE FROM unfifo_pipe WHERE snapshot_key = r.snapshot_key;
        INSERT INTO unfifo_pipe (
          snapshot_key, gudang, kode_material, ukuran, customer, batch,
          prod_year, qty_btg, tonase, inc_date, unfifo_status, issue_note
        )
        SELECT
          r.snapshot_key,
          (elem->>'gudang')::text,
          (elem->>'kodeMaterial')::text,
          (elem->>'ukuran')::text,
          (elem->>'customer')::text,
          (elem->>'batch')::text,
          (elem->>'prodYear')::text,
          COALESCE((elem->>'qtyBtg')::int, 0),
          COALESCE((elem->>'tonase')::numeric, 0),
          (elem->>'incDate')::text,
          (elem->>'unfifoStatus')::text,
          (elem->>'issueNote')::text
        FROM jsonb_array_elements(r.unfifo_pipe_data) AS elem;
      END IF;

      -- 11. Damaged Packaging
      IF r.damaged_packaging_data IS NOT NULL AND jsonb_typeof(r.damaged_packaging_data) = 'array' THEN
        DELETE FROM damaged_packaging WHERE snapshot_key = r.snapshot_key;
        INSERT INTO damaged_packaging (
          snapshot_key, item_id, no_urut, package_no, serial_no, plant, customer,
          user_scan, tgl_scan_in, jam_scan_in, kondisi, slot, kaki, rangka,
          pengait, dinding, label_item, limbah, defect_category
        )
        SELECT
          r.snapshot_key,
          (elem->>'id')::text,
          (elem->>'no')::int,
          (elem->>'packageNo')::text,
          (elem->>'serialNo')::text,
          (elem->>'plant')::text,
          (elem->>'customer')::text,
          (elem->>'userScan')::text,
          (elem->>'tglScanIn')::text,
          (elem->>'jamScanIn')::text,
          (elem->>'kondisi')::text,
          (elem->>'slot')::text,
          (elem->>'kaki')::text,
          (elem->>'rangka')::text,
          (elem->>'pengait')::text,
          (elem->>'dinding')::text,
          (elem->>'labelItem')::text,
          (elem->>'limbah')::text,
          (elem->>'defectCategory')::text
        FROM jsonb_array_elements(r.damaged_packaging_data) AS elem;
      END IF;

      -- 12. NC Progress
      IF r.nc_progress_data IS NOT NULL AND jsonb_typeof(r.nc_progress_data) = 'array' THEN
        DELETE FROM nc_progress WHERE snapshot_key = r.snapshot_key;
        INSERT INTO nc_progress (
          snapshot_key, item_id, entry_date, time_of_entry, plant, storage_location,
          posting_date, movement_type, customer, purchase_order, order_no, work_center,
          material, material_description, batch, qty_in_un_of_entry, quantity, amount_in_lc,
          document_header_text, material_document, material_doc_item, reference, gr_gi_slip,
          user_name, text, unloading_point, sales_order, sales_order_item, kg_gi, kg_gr,
          transaction_type, ncr_number, problem_remark
        )
        SELECT
          r.snapshot_key,
          (elem->>'id')::text,
          (elem->>'entryDate')::text,
          (elem->>'timeOfEntry')::text,
          (elem->>'plant')::text,
          (elem->>'storageLocation')::text,
          (elem->>'postingDate')::text,
          (elem->>'movementType')::text,
          (elem->>'customer')::text,
          (elem->>'purchaseOrder')::text,
          (elem->>'order')::text,
          (elem->>'workCenter')::text,
          (elem->>'material')::text,
          (elem->>'materialDescription')::text,
          (elem->>'batch')::text,
          COALESCE((elem->>'qtyInUnOfEntry')::numeric, 0),
          COALESCE((elem->>'quantity')::numeric, 0),
          COALESCE((elem->>'amountInLC')::numeric, 0),
          (elem->>'documentHeaderText')::text,
          (elem->>'materialDocument')::text,
          (elem->>'materialDocItem')::text,
          (elem->>'reference')::text,
          (elem->>'grGiSlip')::text,
          (elem->>'userName')::text,
          (elem->>'text')::text,
          (elem->>'unloadingPoint')::text,
          (elem->>'salesOrder')::text,
          (elem->>'salesOrderItem')::text,
          COALESCE((elem->>'kgGI')::numeric, 0),
          COALESCE((elem->>'kgGR')::numeric, 0),
          (elem->>'transactionType')::text,
          (elem->>'ncrNumber')::text,
          (elem->>'problemRemark')::text
        FROM jsonb_array_elements(r.nc_progress_data) AS elem;
      END IF;

      -- 13. Customer Breakdown
      IF r.customer_breakdown IS NOT NULL AND jsonb_typeof(r.customer_breakdown) = 'object' THEN
        DELETE FROM customer_breakdown WHERE snapshot_key = r.snapshot_key;
        FOR gudang_key IN SELECT jsonb_object_keys(r.customer_breakdown) LOOP
          FOR cust_elem IN SELECT jsonb_array_elements(r.customer_breakdown->gudang_key) LOOP
            INSERT INTO customer_breakdown (snapshot_key, gudang, customer, qty, tonase)
            VALUES (
              r.snapshot_key,
              gudang_key,
              (cust_elem->>'customer')::text,
              COALESCE((cust_elem->>'qty')::int, 0),
              COALESCE((cust_elem->>'tonase')::numeric, 0)
            );
          END LOOP;
        END LOOP;
      END IF;

    END LOOP;
  END IF;
END $$;
