# 05 - Deployment & Environment

Panduan konfigurasi environment variables, deployment pipeline Vercel, dan manajemen database Supabase untuk Spindo Warehouse Dashboard.

---

## 1. Environment Variables (`.env.local`)
Buat file `.env.local` pada root project (`C:\Project Web\spindo\New\spindo_app\.env.local`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*Catatan: Jika variabel di atas dikosongkan, aplikasi otomatis beralih menggunakan SQLite local `warehouse.db`.*

---

## 2. Setup Supabase SQL
Jalankan script DDL berikut pada Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS warehouse_snapshots (
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
  customer_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_key ON warehouse_snapshots(snapshot_key);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_created_at ON warehouse_snapshots(created_at DESC);
```

---

## 3. Perintah Pengembangan Lokal
```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev

# Jalankan typecheck & build
npm run build

# Start production server lokal
npm run start
```

---

## 4. Deployment ke Vercel
1. Repository GitHub: `https://github.com/rthings-bsi/stock-report.git`
2. Hubungkan repository ke project baru di Vercel Dashboard.
3. Daftarkan environment variable `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` pada tab **Settings -> Environment Variables**.
4. Deploy branch `main`.

Terkait: [[00 - Index]], [[01 - Architecture & Database Dual-Mode]]
