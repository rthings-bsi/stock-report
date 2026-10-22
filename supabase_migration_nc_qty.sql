-- ==============================================================================
-- MIGRASI: Kolom Qty (batang) untuk menu Pipa NC
-- ------------------------------------------------------------------------------
-- Menambahkan kolom qty agar menu "Pipa NC" bisa menampilkan kolom Qty (Btg):
--   * nc_items.qty      -> jumlah batang per baris item NC
--   * nc_warehouse.qty  -> total batang per gudang
--   * nc_warehouse.qty_lt / qty_st -> split berdasarkan tipe pipa (LT / ST)
--
-- Sifat : IDEMPOTENT — aman dijalankan berkali-kali.
-- Cara  : Supabase Dashboard -> SQL Editor -> paste seluruh file -> Run.
-- Urutan: jalankan migrasi ini SEBELUM deploy kode yang menulis kolom qty.
--         Kolom dibiarkan NULL (bukan 0) supaya snapshot lama yang belum punya
--         data qty tetap terlihat "belum ada data", bukan 0 btg.
-- ==============================================================================

BEGIN;

-- 1. Detail item NC -----------------------------------------------------------
ALTER TABLE IF EXISTS public.nc_items
  ADD COLUMN IF NOT EXISTS qty INTEGER;

COMMENT ON COLUMN public.nc_items.qty IS
  'Jumlah batang (Qty) per baris item NC. NULL = snapshot lama belum menyimpan qty.';

-- 2. Rekap gudang NC ----------------------------------------------------------
ALTER TABLE IF EXISTS public.nc_warehouse
  ADD COLUMN IF NOT EXISTS qty    INTEGER,
  ADD COLUMN IF NOT EXISTS qty_lt INTEGER,
  ADD COLUMN IF NOT EXISTS qty_st INTEGER;

COMMENT ON COLUMN public.nc_warehouse.qty IS
  'Total batang seluruh grade (prime + NC) di gudang. NULL = data lama.';
COMMENT ON COLUMN public.nc_warehouse.qty_lt IS
  'Total batang pipa tipe LT (panjang). NULL = data lama.';
COMMENT ON COLUMN public.nc_warehouse.qty_st IS
  'Total batang pipa tipe ST (pendek). NULL = data lama.';

COMMIT;

-- Supabase/PostgREST menyimpan cache skema; paksa reload supaya kolom baru
-- langsung dikenali API (menghindari error PGRST204 "Could not find the 'qty' column").
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- VERIFIKASI (jalankan setelah migrasi; harus menampilkan 4 baris)
-- ==============================================================================
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'nc_items'     AND column_name = 'qty')
    OR (table_name = 'nc_warehouse' AND column_name IN ('qty', 'qty_lt', 'qty_st'))
  )
ORDER BY table_name, column_name;

-- ==============================================================================
-- CATATAN
-- ------------------------------------------------------------------------------
-- 1. Migration ini hanya menambah kolom; tidak mengubah RLS, policy, grant,
--    maupun data yang sudah ada.
-- 2. RLS tabel tidak berubah: akses tetap hanya lewat service role (server).
-- 3. Qty baru akan terisi untuk snapshot hasil upload berikutnya, karena nilai
--    qty dihitung parser dari file Excel stock pipa (kolom Qty/BOM).
-- 4. Snapshot yang diunggah sebelum migrasi ini tetap menampilkan "-" pada
--    kolom Qty sampai file stock pipa di-upload ulang.
--
-- ROLLBACK (jika perlu membatalkan):
--   ALTER TABLE public.nc_items     DROP COLUMN IF EXISTS qty;
--   ALTER TABLE public.nc_warehouse DROP COLUMN IF EXISTS qty,
--                                   DROP COLUMN IF EXISTS qty_lt,
--                                   DROP COLUMN IF EXISTS qty_st;
-- ==============================================================================
