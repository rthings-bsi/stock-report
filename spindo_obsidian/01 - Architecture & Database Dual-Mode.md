# 01 - Architecture & Database Dual-Mode

Sistem Spindo Warehouse Dashboard didesain dengan strategi **Dual-Mode Persistence** agar dapat berjalan tanpa kendala di local dev (tanpa koneksi internet) sekaligus stabil saat di-deploy ke production (Vercel + Supabase).

---

## 1. Flow Arsitektur
```text
[SAP Excel File / RTP Defect Data]
                │
                ▼ (Client Upload via UploadModal)
   [src/lib/parser.ts / parseDamagedPackaging.ts]
                │
                ▼ POST /api/warehouse
     [src/app/api/warehouse/route.ts]
                │
        ┌───────┴────────┐
        ▼                ▼
[Supabase Cloud]   [SQLite Local]
 (Primary Mode)     (Fallback Mode)
  table:             table:
  warehouse_snapshots snapshots
```

---

## 2. Dual-Mode Implementation (`src/lib/db.ts` & `src/lib/supabase.ts`)
1. **Supabase Cloud (Primary)**:
   - Terhubung bila `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` terisi di `.env.local`.
   - Menggunakan `@supabase/supabase-js`.
   - Data disimpan dalam table `warehouse_snapshots` dengan field `JSONB`.
2. **SQLite Local (Fallback)**:
   - File database: `warehouse.db` pada root project.
   - Menggunakan engine `better-sqlite3`.
   - Dipakai otomatis jika konfigurasi Supabase tidak ditemukan atau koneksi gagal, memastikan dev lokal tidak terblokir kuota atau internet.

---

## 3. Struktur Snapshot JSON
Snapshot gudang disimpan dalam satu dokumen terstruktur:
- `pipe_capacities`: Kapasitas dan okupansi per warehouse/rak.
- `fast_slow_data`: Analisis perputaran barang fast-moving vs slow-moving.
- `coil_strip_data`: Stok bahan baku coil & slit strip.
- `nc_warehouse_data` & `nc_items`: Data pipa Non-Conformity (Grade C & Grade E).
- `loo_st_data` & `loo_lt_data`: Order List of Orders untuk pipa ST dan LT.
- `unfifo_data` (`unfifo_pipe_data` & `unfifo_coil_data`): Pelanggaran aturan FIFO.
- `damaged_packaging_data`: Data scan defect kemasan RTP.
- `customer_breakdown`: Distribusi alokasi pipa per customer.

---

## 4. API Endpoints
- **`GET /api/warehouse`**: Mengambil snapshot data stok terbaru (`snapshot_key = 'latest'`).
- **`POST /api/warehouse`**: Menyimpan snapshot baru setelah upload/re-parse Excel SAP.

Terkait: [[00 - Index]], [[02 - SAP & Domain Business Logic]], [[05 - Deployment & Environment]]
