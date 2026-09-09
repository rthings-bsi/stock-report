const { Client } = require('pg');
const connectionString = 'postgresql://postgres:%40gudang13joss%40@db.gobcmaehhdktvyqbvfjv.supabase.co:5432/postgres';
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
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

      CREATE TABLE IF NOT EXISTS users (
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
      
      -- Insert default roles if table empty
      INSERT INTO roles (key, name, description, color, is_system, permissions)
      SELECT 'admin', 'Administrator', 'Hak akses penuh', 'emerald', 1, '{"viewCapacity":true,"viewFastSlow":true,"viewCoilStrip":true,"viewNC":true,"viewUnfifo":true,"viewLoo":true,"viewDamagedPkg":true,"viewIncomingPkg":true,"viewUserManagement":true,"canUploadSAP":true,"canEditIncomingPkg":true,"canEditDamagedPkg":true,"canExportExcel":true,"canCustomizeLayout":true,"canManageUsers":true,"canSaveSnapshot":true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM roles);

      INSERT INTO roles (key, name, description, color, is_system, permissions)
      SELECT 'staff', 'Staff Operasional', 'Akses operasional', 'sky', 1, '{"viewCapacity":true,"viewFastSlow":true,"viewCoilStrip":true,"viewNC":true,"viewUnfifo":true,"viewLoo":true,"viewDamagedPkg":true,"viewIncomingPkg":true,"viewUserManagement":false,"canUploadSAP":false,"canEditIncomingPkg":true,"canEditDamagedPkg":false,"canExportExcel":true,"canCustomizeLayout":false,"canManageUsers":false,"canSaveSnapshot":false}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE key = 'staff');

      -- Insert default users if table empty
      INSERT INTO users (username, password, name, role, department, unit)
      SELECT 'admin', '123', 'Administrator Warehouse', 'admin', 'Warehouse Section Head', 'Unit 5 - Spindo'
      WHERE NOT EXISTS (SELECT 1 FROM users);

      INSERT INTO users (username, password, name, role, department, unit)
      SELECT 'staff', '123', 'Staff Operasional Warehouse', 'staff', 'Warehouse Monitoring Staff', 'Unit 5 - Spindo'
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'staff');
    `);
    
    console.log('Users and Roles tables created in Supabase');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}
run();
