/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from 'path';
import * as fs from 'fs';

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('better-sqlite3 not available (Vercel Serverless environment)');
}

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'warehouse.db');
let db: any = null;
if (Database) {
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.warn('Could not initialize SQLite (Read-only filesystem?):', e);
  }
}

// Enable WAL mode
if (db) db.pragma('journal_mode = WAL');

// Initialize schema
if (db) {
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

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    department TEXT,
    unit TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'slate',
    is_system INTEGER DEFAULT 0,
    permissions TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
}

// Seed default roles if roles table is empty
try {
 if (db) {
  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (roleCount.count === 0) {
    const insertRole = db.prepare(`
      INSERT INTO roles (key, name, description, color, is_system, permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const adminPerms = JSON.stringify({
      viewCapacity: true,
      viewFastSlow: true,
      viewCoilStrip: true,
      viewNC: true,
      viewUnfifo: true,
      viewLoo: true,
      viewDamagedPkg: true,
      viewIncomingPkg: true,
      viewUserManagement: true,
      canUploadSAP: true,
      canEditIncomingPkg: true,
      canEditDamagedPkg: true,
      canExportExcel: true,
      canCustomizeLayout: true,
      canManageUsers: true,
      canSaveSnapshot: true
    });

    const staffPerms = JSON.stringify({
      viewCapacity: true,
      viewFastSlow: true,
      viewCoilStrip: true,
      viewNC: true,
      viewUnfifo: true,
      viewLoo: true,
      viewDamagedPkg: true,
      viewIncomingPkg: true,
      viewUserManagement: false,
      canUploadSAP: false,
      canEditIncomingPkg: true,
      canEditDamagedPkg: false,
      canExportExcel: true,
      canCustomizeLayout: false,
      canManageUsers: false,
      canSaveSnapshot: false
    });

    const viewerPerms = JSON.stringify({
      viewCapacity: true,
      viewFastSlow: true,
      viewCoilStrip: true,
      viewNC: true,
      viewUnfifo: true,
      viewLoo: true,
      viewDamagedPkg: true,
      viewIncomingPkg: true,
      viewUserManagement: false,
      canUploadSAP: false,
      canEditIncomingPkg: false,
      canEditDamagedPkg: false,
      canExportExcel: true,
      canCustomizeLayout: false,
      canManageUsers: false,
      canSaveSnapshot: false
    });

    insertRole.run('admin', 'Administrator', 'Hak akses penuh: kelola seluruh modul, upload SAP, manajemen user & roles, edit semua data.', 'emerald', 1, adminPerms);
    insertRole.run('staff', 'Staff Operasional', 'Akses monitoring warehouse dan pencatatan mutasi operasional RTP Incoming Packaging.', 'sky', 1, staffPerms);
    insertRole.run('viewer', 'Viewer / Auditor', 'Akses pemantauan visual (view-only) tanpa izin modifikasi data atau upload file.', 'slate', 0, viewerPerms);
  }
 }
} catch (e) {
  console.error('Failed to seed default roles:', e);
}

// Seed default accounts if users table is empty
try {
 if (db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, name, role, department, unit)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('admin', '123', 'Administrator Warehouse', 'admin', 'Warehouse Section Head', 'Unit 5 - Spindo');
    insertUser.run('staff', '123', 'Staff Operasional Warehouse', 'staff', 'Warehouse Monitoring Staff', 'Unit 5 - Spindo');
  }
 }
} catch (e) {
  console.error('Failed to seed default users:', e);
}

// Auto-migration if column not exists
if (db) {
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_coil_data TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_pipe_data TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN damaged_packaging_data TEXT;`);
} catch {}
try {
  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN incoming_packaging_data TEXT;`);
} catch {}
}

export default db;
