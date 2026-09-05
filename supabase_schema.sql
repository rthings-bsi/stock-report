# Supabase PostgreSQL Migration for Spindo Warehouse Dashboard
# Jalankan query ini di Supabase SQL Editor:

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

-- Index snapshot key untuk lookup instan
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_key ON warehouse_snapshots(snapshot_key);
CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_created_at ON warehouse_snapshots(created_at DESC);

-- Enable RLS (Row Level Security) jika diperlukan atau buka akses anon untuk dashboard internal
ALTER TABLE warehouse_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy untuk read & write public anon key
CREATE POLICY "Allow public read warehouse_snapshots"
ON warehouse_snapshots FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert/update warehouse_snapshots"
ON warehouse_snapshots FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
