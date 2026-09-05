/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from 'path';
import * as fs from 'fs';

const Database = require('better-sqlite3');

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'warehouse.db');
const db = new Database(dbPath);

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS warehouse_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT UNIQUE NOT NULL,
    last_updated TEXT NOT NULL,
    pipe_capacities TEXT NOT NULL,
    fast_slow_data TEXT NOT NULL,
    coil_strip_data TEXT NOT NULL,
    nc_warehouse_data TEXT NOT NULL,
    nc_items TEXT NOT NULL,
    loo_st_data TEXT NOT NULL,
    loo_lt_data TEXT NOT NULL,
    unfifo_data TEXT NOT NULL,
    unfifo_coil_data TEXT,
    unfifo_pipe_data TEXT,
    customer_breakdown TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS upload_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Auto-migration if column not exists
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_coil_data TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_pipe_data TEXT;`);
} catch {}

export default db;
