const fs = require('fs');
let code = fs.readFileSync('src/lib/db.ts', 'utf8');

// Wrap better-sqlite3 in try-catch
code = code.replace(
  "const Database = require('better-sqlite3');",
  `let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.warn('better-sqlite3 not available (Vercel Serverless environment)');
}`
);

code = code.replace(
  "const db = new Database(dbPath);",
  `let db = null;
if (Database) {
  try {
    db = new Database(dbPath);
  } catch (e) {
    console.warn('Could not initialize SQLite (Read-only filesystem?):', e);
  }
}`
);

// Wrap db calls
code = code.replace(
  "db.pragma('journal_mode = WAL');",
  "if (db) db.pragma('journal_mode = WAL');"
);

code = code.replace(
  "db.exec(`\n  CREATE TABLE IF NOT EXISTS warehouse_snapshots",
  "if (db) {\n  db.exec(`\n  CREATE TABLE IF NOT EXISTS warehouse_snapshots"
);

code = code.replace(
  "  CREATE TABLE IF NOT EXISTS roles (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    key TEXT UNIQUE NOT NULL,\n    name TEXT NOT NULL,\n    description TEXT,\n    color TEXT DEFAULT 'slate',\n    is_system INTEGER DEFAULT 0,\n    permissions TEXT NOT NULL,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n  );\n`);",
  "  CREATE TABLE IF NOT EXISTS roles (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    key TEXT UNIQUE NOT NULL,\n    name TEXT NOT NULL,\n    description TEXT,\n    color TEXT DEFAULT 'slate',\n    is_system INTEGER DEFAULT 0,\n    permissions TEXT NOT NULL,\n    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n  );\n`);\n}"
);

code = code.replace(
  "// Seed default roles if roles table is empty\ntry {\n  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };",
  "// Seed default roles if roles table is empty\ntry {\n if (db) {\n  const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };"
);

code = code.replace(
  "    insertRole.run('admin', 'Administrator', 'Hak akses penuh: kelola seluruh modul, upload SAP, manajemen user & roles, edit semua data.', 'emerald', 1, adminPerms);\n    insertRole.run('staff', 'Staff Operasional', 'Akses monitoring warehouse dan pencatatan mutasi operasional RTP Incoming Packaging.', 'sky', 1, staffPerms);\n    insertRole.run('viewer', 'Viewer / Auditor', 'Akses pemantauan visual (view-only) tanpa izin modifikasi data atau upload file.', 'slate', 0, viewerPerms);\n  }\n} catch (e) {",
  "    insertRole.run('admin', 'Administrator', 'Hak akses penuh: kelola seluruh modul, upload SAP, manajemen user & roles, edit semua data.', 'emerald', 1, adminPerms);\n    insertRole.run('staff', 'Staff Operasional', 'Akses monitoring warehouse dan pencatatan mutasi operasional RTP Incoming Packaging.', 'sky', 1, staffPerms);\n    insertRole.run('viewer', 'Viewer / Auditor', 'Akses pemantauan visual (view-only) tanpa izin modifikasi data atau upload file.', 'slate', 0, viewerPerms);\n  }\n }\n} catch (e) {"
);

code = code.replace(
  "// Seed default accounts if users table is empty\ntry {\n  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };",
  "// Seed default accounts if users table is empty\ntry {\n if (db) {\n  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };"
);

code = code.replace(
  "    insertUser.run('admin', '123', 'Administrator Warehouse', 'admin', 'Warehouse Section Head', 'Unit 5 - Spindo');\n    insertUser.run('staff', '123', 'Staff Operasional Warehouse', 'staff', 'Warehouse Monitoring Staff', 'Unit 5 - Spindo');\n  }\n} catch (e) {",
  "    insertUser.run('admin', '123', 'Administrator Warehouse', 'admin', 'Warehouse Section Head', 'Unit 5 - Spindo');\n    insertUser.run('staff', '123', 'Staff Operasional Warehouse', 'staff', 'Warehouse Monitoring Staff', 'Unit 5 - Spindo');\n  }\n }\n} catch (e) {"
);

code = code.replace(
  "// Auto-migration if column not exists\ntry {\n  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_coil_data TEXT;`);\n} catch {}\n",
  "// Auto-migration if column not exists\nif (db) {\ntry {\n  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN unfifo_coil_data TEXT;`);\n} catch {}\n"
);
code = code.replace(
  "try {\n  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN incoming_packaging_data TEXT;`);\n} catch {}",
  "try {\n  db.exec(`ALTER TABLE warehouse_snapshots ADD COLUMN incoming_packaging_data TEXT;`);\n} catch {}\n}"
);

fs.writeFileSync('src/lib/db.ts', code);
