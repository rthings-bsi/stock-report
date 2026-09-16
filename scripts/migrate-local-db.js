const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'data', 'warehouse.db');
if (!fs.existsSync(dbPath)) {
  console.error('Database file not found:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

console.log('--- Cleaning up and initializing clean normalized tables ---');

// Drop legacy norm_ prefix tables
db.exec(`
  DROP TABLE IF EXISTS norm_snapshots;
  DROP TABLE IF EXISTS norm_pipe_capacities;
  DROP TABLE IF EXISTS norm_fast_slow;
  DROP TABLE IF EXISTS norm_coil_strip;
  DROP TABLE IF EXISTS norm_nc_warehouse;
  DROP TABLE IF EXISTS norm_nc_items;
  DROP TABLE IF EXISTS norm_loo_items;
  DROP TABLE IF EXISTS norm_unfifo_items;
  DROP TABLE IF EXISTS norm_unfifo_coil;
  DROP TABLE IF EXISTS norm_unfifo_pipe;
  DROP TABLE IF EXISTS norm_damaged_packaging;
  DROP TABLE IF EXISTS norm_nc_progress;
  DROP TABLE IF EXISTS norm_stock_opname;
  DROP TABLE IF EXISTS norm_customer_breakdown;
`);

// Drop old damaged_packaging stub if old columns
try {
  const cols = db.pragma('table_info(damaged_packaging)').map((c) => c.name);
  if (cols.length > 0 && !cols.includes('snapshot_key')) {
    db.exec('DROP TABLE IF EXISTS damaged_packaging;');
  }
} catch {}

// Create clean relational tables
db.exec(`
  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT UNIQUE NOT NULL,
    last_updated TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_snapshots_key ON snapshots(snapshot_key);

  CREATE TABLE IF NOT EXISTS pipe_capacities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT NOT NULL,
    kapasitas REAL DEFAULT 0,
    stock REAL DEFAULT 0,
    persen_terisi REAL DEFAULT 0,
    selisih REAL DEFAULT 0,
    wip_lt REAL DEFAULT 0,
    fg_lt REAL DEFAULT 0,
    wip_st REAL DEFAULT 0,
    fg_st REAL DEFAULT 0,
    customer_stock REAL DEFAULT 0,
    free_stock REAL DEFAULT 0,
    persen_free_stock REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_pipe_capacities_snap ON pipe_capacities(snapshot_key);

  CREATE TABLE IF NOT EXISTS fast_slow (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT NOT NULL,
    fast_ton REAL DEFAULT 0,
    fast_persen REAL DEFAULT 0,
    slow_ton REAL DEFAULT 0,
    slow_persen REAL DEFAULT 0,
    total_ton REAL DEFAULT 0,
    fg_lt_slow REAL DEFAULT 0,
    fg_st_slow REAL DEFAULT 0,
    wip_lt_slow REAL DEFAULT 0,
    wip_st_slow REAL DEFAULT 0,
    yearly_slow_ton TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_fast_slow_snap ON fast_slow(snapshot_key);

  CREATE TABLE IF NOT EXISTS coil_strip (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT NOT NULL,
    area TEXT NOT NULL,
    coil_qty INTEGER DEFAULT 0,
    coil_ton REAL DEFAULT 0,
    strip_qty INTEGER DEFAULT 0,
    strip_ton REAL DEFAULT 0,
    total_qty INTEGER DEFAULT 0,
    total_ton REAL DEFAULT 0,
    kapasitas REAL DEFAULT 0,
    persen_terisi REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_coil_strip_snap ON coil_strip(snapshot_key);

  CREATE TABLE IF NOT EXISTS nc_warehouse (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT NOT NULL,
    prime REAL DEFAULT 0,
    grade_e REAL DEFAULT 0,
    grade_c REAL DEFAULT 0,
    persen_grade_e REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_nc_warehouse_snap ON nc_warehouse(snapshot_key);

  CREATE TABLE IF NOT EXISTS nc_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    item_id TEXT,
    no_nc TEXT,
    gudang TEXT,
    ukuran TEXT,
    customer TEXT,
    kode_material TEXT,
    type TEXT,
    grade TEXT,
    fg_ton REAL DEFAULT 0,
    wip_ton REAL DEFAULT 0,
    total_ton REAL DEFAULT 0,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_nc_items_snap ON nc_items(snapshot_key);

  CREATE TABLE IF NOT EXISTS loo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    loo_type TEXT NOT NULL,
    no_urut INTEGER,
    gudang TEXT,
    gudangs TEXT,
    customer TEXT,
    ukuran TEXT,
    kode_material TEXT,
    material_type TEXT,
    grade TEXT,
    prime_ton REAL DEFAULT 0,
    grade_c_ton REAL DEFAULT 0,
    grade_e_ton REAL DEFAULT 0,
    fg_ton REAL DEFAULT 0,
    wip_ton REAL DEFAULT 0,
    total_stock_ton REAL DEFAULT 0,
    loo_ton REAL DEFAULT 0,
    persen_fulfillment REAL DEFAULT 0,
    prime_fulfillment REAL DEFAULT 0,
    fg_qty INTEGER DEFAULT 0,
    wip_qty INTEGER DEFAULT 0,
    total_qty INTEGER DEFAULT 0,
    loo_qty INTEGER DEFAULT 0,
    gudang_breakdown TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_loo_items_snap ON loo_items(snapshot_key, loo_type);

  CREATE TABLE IF NOT EXISTS unfifo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT,
    kode_material TEXT,
    ukuran TEXT,
    customer TEXT,
    batch_old TEXT,
    batch_new TEXT,
    date_old TEXT,
    date_new TEXT,
    qty_old INTEGER DEFAULT 0,
    tonase_old REAL DEFAULT 0,
    aging_days INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_unfifo_items_snap ON unfifo_items(snapshot_key);

  CREATE TABLE IF NOT EXISTS unfifo_coil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT,
    kode_material TEXT,
    specification TEXT,
    manufaktur TEXT,
    batch TEXT,
    tebal REAL DEFAULT 0,
    lebar REAL DEFAULT 0,
    qty_roll INTEGER DEFAULT 0,
    tonase REAL DEFAULT 0,
    inc_date TEXT,
    unfifo_status TEXT,
    issue_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_unfifo_coil_snap ON unfifo_coil(snapshot_key);

  CREATE TABLE IF NOT EXISTS unfifo_pipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT,
    kode_material TEXT,
    ukuran TEXT,
    customer TEXT,
    batch TEXT,
    prod_year TEXT,
    qty_btg INTEGER DEFAULT 0,
    tonase REAL DEFAULT 0,
    inc_date TEXT,
    unfifo_status TEXT,
    issue_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_unfifo_pipe_snap ON unfifo_pipe(snapshot_key);

  CREATE TABLE IF NOT EXISTS damaged_packaging (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    item_id TEXT,
    no_urut INTEGER,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_damaged_pkg_snap ON damaged_packaging(snapshot_key);

  CREATE TABLE IF NOT EXISTS nc_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
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
    qty_in_un_of_entry REAL DEFAULT 0,
    quantity REAL DEFAULT 0,
    amount_in_lc REAL DEFAULT 0,
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
    kg_gi REAL DEFAULT 0,
    kg_gr REAL DEFAULT 0,
    transaction_type TEXT,
    ncr_number TEXT,
    problem_remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_nc_progress_snap ON nc_progress(snapshot_key);

  CREATE TABLE IF NOT EXISTS stock_opname (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    data_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_stock_opname_snap ON stock_opname(snapshot_key);

  CREATE TABLE IF NOT EXISTS customer_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_key TEXT NOT NULL,
    gudang TEXT NOT NULL,
    customer TEXT NOT NULL,
    qty INTEGER DEFAULT 0,
    tonase REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_cust_breakdown_snap ON customer_breakdown(snapshot_key);
`);

console.log('Clean relational tables ready.');

// Check if warehouse_snapshots has any rows to migrate
const snapshots = db.prepare('SELECT * FROM warehouse_snapshots').all();
console.log(`Found ${snapshots.length} snapshots in warehouse_snapshots to migrate.`);

function safeParse(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (e) {
      return fallback;
    }
  }
  return val;
}

if (snapshots.length > 0) {
  const migrateTx = db.transaction((rows) => {
    for (const row of rows) {
      const key = row.snapshot_key;
      console.log(`Migrating snapshot: ${key}...`);

      db.prepare(`
        INSERT INTO snapshots (snapshot_key, last_updated, created_at)
        VALUES (?, ?, ?)
        ON CONFLICT(snapshot_key) DO UPDATE SET
          last_updated = excluded.last_updated,
          created_at = excluded.created_at
      `).run(key, row.last_updated, row.created_at);

      // Clean detail
      db.prepare('DELETE FROM pipe_capacities WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM fast_slow WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM coil_strip WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM nc_warehouse WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM nc_items WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM loo_items WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM unfifo_items WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM unfifo_coil WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM unfifo_pipe WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM damaged_packaging WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM nc_progress WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM stock_opname WHERE snapshot_key = ?').run(key);
      db.prepare('DELETE FROM customer_breakdown WHERE snapshot_key = ?').run(key);

      // Pipe
      const pipes = safeParse(row.pipe_capacities, []);
      const insertPipe = db.prepare(`
        INSERT INTO pipe_capacities (
          snapshot_key, gudang, kapasitas, stock, persen_terisi, selisih,
          wip_lt, fg_lt, wip_st, fg_st, customer_stock, free_stock, persen_free_stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of pipes) {
        insertPipe.run(
          key, p.gudang || '', p.kapasitas || 0, p.stock || 0, p.persenTerisi || 0, p.selisih || 0,
          p.wipLt || 0, p.fgLt || 0, p.wipSt || 0, p.fgSt || 0, p.customerStock || 0, p.freeStock || 0, p.persenFreeStock || 0
        );
      }

      // Fast Slow
      const fastSlow = safeParse(row.fast_slow_data, []);
      const insertFastSlow = db.prepare(`
        INSERT INTO fast_slow (
          snapshot_key, gudang, fast_ton, fast_persen, slow_ton, slow_persen,
          total_ton, fg_lt_slow, fg_st_slow, wip_lt_slow, wip_st_slow, yearly_slow_ton
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const fs of fastSlow) {
        insertFastSlow.run(
          key, fs.gudang || '', fs.fastTon || 0, fs.fastPersen || 0, fs.slowTon || 0, fs.slowPersen || 0,
          fs.totalTon || 0, fs.fgLtSlow || 0, fs.fgStSlow || 0, fs.wipLtSlow || 0, fs.wipStSlow || 0,
          fs.yearlySlowTon ? JSON.stringify(fs.yearlySlowTon) : null
        );
      }

      // Coil
      const coils = safeParse(row.coil_strip_data, []);
      const insertCoil = db.prepare(`
        INSERT INTO coil_strip (
          snapshot_key, gudang, area, coil_qty, coil_ton, strip_qty, strip_ton,
          total_qty, total_ton, kapasitas, persen_terisi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of coils) {
        insertCoil.run(
          key, c.gudang || '', c.area || '', c.coilQty || 0, c.coilTon || 0, c.stripQty || 0, c.stripTon || 0,
          c.totalQty || 0, c.totalTon || 0, c.kapasitas || 0, c.persenTerisi || 0
        );
      }

      // NC Warehouse
      const ncWh = safeParse(row.nc_warehouse_data, []);
      const insertNcWh = db.prepare(`
        INSERT INTO nc_warehouse (
          snapshot_key, gudang, prime, grade_e, grade_c, persen_grade_e
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const n of ncWh) {
        insertNcWh.run(key, n.gudang || '', n.prime || 0, n.gradeE || 0, n.gradeC || 0, n.persenGradeE || 0);
      }

      // NC Items
      const ncItems = safeParse(row.nc_items, []);
      const insertNcItem = db.prepare(`
        INSERT INTO nc_items (
          snapshot_key, item_id, no_nc, gudang, ukuran, customer,
          kode_material, type, grade, fg_ton, wip_ton, total_ton, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of ncItems) {
        insertNcItem.run(
          key, item.id || null, item.noNC || null, item.gudang || '', item.ukuran || '', item.customer || '',
          item.kodeMaterial || '', item.type || '', item.grade || '', item.fgTon || 0, item.wipTon || 0,
          item.totalTon || 0, item.remarks || ''
        );
      }

      // LOO
      const insertLoo = db.prepare(`
        INSERT INTO loo_items (
          snapshot_key, loo_type, no_urut, gudang, gudangs, customer, ukuran,
          kode_material, material_type, grade, prime_ton, grade_c_ton, grade_e_ton,
          fg_ton, wip_ton, total_stock_ton, loo_ton, persen_fulfillment, prime_fulfillment,
          fg_qty, wip_qty, total_qty, loo_qty, gudang_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const l of safeParse(row.loo_st_data, [])) {
        insertLoo.run(
          key, 'ST', l.no || null, l.gudang || '', l.gudangs ? JSON.stringify(l.gudangs) : null,
          l.customer || '', l.ukuran || '', l.kodeMaterial || '', l.type || '', l.grade || '',
          l.primeTon || 0, l.gradeCTon || 0, l.gradeETon || 0, l.fgTon || 0, l.wipTon || 0,
          l.totalStockTon || 0, l.looTon || 0, l.persenFulfillment || 0, l.primeFulfillment || 0,
          l.fgQty || 0, l.wipQty || 0, l.totalQty || 0, l.looQty || 0,
          l.gudangBreakdown ? JSON.stringify(l.gudangBreakdown) : null
        );
      }

      for (const l of safeParse(row.loo_lt_data, [])) {
        insertLoo.run(
          key, 'LT', l.no || null, l.gudang || '', l.gudangs ? JSON.stringify(l.gudangs) : null,
          l.customer || '', l.ukuran || '', l.kodeMaterial || '', l.type || '', l.grade || '',
          l.primeTon || 0, l.gradeCTon || 0, l.gradeETon || 0, l.fgTon || 0, l.wipTon || 0,
          l.totalStockTon || 0, l.looTon || 0, l.persenFulfillment || 0, l.primeFulfillment || 0,
          l.fgQty || 0, l.wipQty || 0, l.totalQty || 0, l.looQty || 0,
          l.gudangBreakdown ? JSON.stringify(l.gudangBreakdown) : null
        );
      }

      // UNFIFO
      const insertUnfifo = db.prepare(`
        INSERT INTO unfifo_items (
          snapshot_key, gudang, kode_material, ukuran, customer,
          batch_old, batch_new, date_old, date_new, qty_old, tonase_old, aging_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of safeParse(row.unfifo_data, [])) {
        insertUnfifo.run(
          key, u.gudang || '', u.kodeMaterial || '', u.ukuran || '', u.customer || '',
          u.batchOld || '', u.batchNew || '', u.dateOld || '', u.dateNew || '',
          u.qtyOld || 0, u.tonaseOld || 0, u.agingDays || 0
        );
      }

      // UNFIFO Coil
      const insertUnfifoCoil = db.prepare(`
        INSERT INTO unfifo_coil (
          snapshot_key, gudang, kode_material, specification, manufaktur,
          batch, tebal, lebar, qty_roll, tonase, inc_date, unfifo_status, issue_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const uc of safeParse(row.unfifo_coil_data, [])) {
        insertUnfifoCoil.run(
          key, uc.gudang || '', uc.kodeMaterial || '', uc.specification || '', uc.manufaktur || '',
          uc.batch || '', uc.tebal || 0, uc.lebar || 0, uc.qtyRoll || 0, uc.tonase || 0,
          uc.incDate || '', uc.unfifoStatus || '', uc.issueNote || ''
        );
      }

      // UNFIFO Pipe
      const insertUnfifoPipe = db.prepare(`
        INSERT INTO unfifo_pipe (
          snapshot_key, gudang, kode_material, ukuran, customer, batch,
          prod_year, qty_btg, tonase, inc_date, unfifo_status, issue_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const up of safeParse(row.unfifo_pipe_data, [])) {
        insertUnfifoPipe.run(
          key, up.gudang || '', up.kodeMaterial || '', up.ukuran || '', up.customer || '', up.batch || '',
          up.prodYear || '', up.qtyBtg || 0, up.tonase || 0, up.incDate || '', up.unfifoStatus || '', up.issueNote || ''
        );
      }

      // Damaged Packaging
      const insertDmg = db.prepare(`
        INSERT INTO damaged_packaging (
          snapshot_key, item_id, no_urut, package_no, serial_no, plant, customer,
          user_scan, tgl_scan_in, jam_scan_in, kondisi, slot, kaki, rangka,
          pengait, dinding, label_item, limbah, defect_category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of safeParse(row.damaged_packaging_data, [])) {
        insertDmg.run(
          key, d.id || null, d.no || null, d.packageNo || '', d.serialNo || '', d.plant || '', d.customer || '',
          d.userScan || '', d.tglScanIn || '', d.jamScanIn || '', d.kondisi || '', d.slot || '', d.kaki || '',
          d.rangka || '', d.pengait || '', d.dinding || '', d.labelItem || '', d.limbah || '', d.defectCategory || ''
        );
      }

      // NC Progress
      const insertNcProg = db.prepare(`
        INSERT INTO nc_progress (
          snapshot_key, item_id, entry_date, time_of_entry, plant, storage_location,
          posting_date, movement_type, customer, purchase_order, order_no, work_center,
          material, material_description, batch, qty_in_un_of_entry, quantity, amount_in_lc,
          document_header_text, material_document, material_doc_item, reference, gr_gi_slip,
          user_name, text, unloading_point, sales_order, sales_order_item, kg_gi, kg_gr,
          transaction_type, ncr_number, problem_remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const np of safeParse(row.nc_progress_data, [])) {
        insertNcProg.run(
          key, np.id || null, np.entryDate || '', np.timeOfEntry || '', np.plant || '', np.storageLocation || '',
          np.postingDate || '', np.movementType || '', np.customer || '', np.purchaseOrder || '', np.order || '',
          np.workCenter || '', np.material || '', np.materialDescription || '', np.batch || '',
          np.qtyInUnOfEntry || 0, np.quantity || 0, np.amountInLC || 0, np.documentHeaderText || '',
          np.materialDocument || '', np.materialDocItem || '', np.reference || '', np.grGiSlip || '',
          np.userName || '', np.text || '', np.unloadingPoint || '', np.salesOrder || '', np.salesOrderItem || '',
          np.kgGI || 0, np.kgGR || 0, np.transactionType || '', np.ncrNumber || '', np.problemRemark || ''
        );
      }

      // Stock Opname
      const sto = safeParse(row.sto_data, []);
      if (sto.length > 0) {
        db.prepare(`
          INSERT INTO stock_opname (snapshot_key, data_json)
          VALUES (?, ?)
        `).run(key, JSON.stringify(sto));
      }

      // Customer Breakdown
      const custBreakdown = safeParse(row.customer_breakdown, {});
      const insertCust = db.prepare(`
        INSERT INTO customer_breakdown (snapshot_key, gudang, customer, qty, tonase)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const [gudangName, custList] of Object.entries(custBreakdown)) {
        if (Array.isArray(custList)) {
          for (const item of custList) {
            insertCust.run(key, gudangName, item.customer || '', item.qty || 0, item.tonase || 0);
          }
        }
      }
    }
  });

  migrateTx(snapshots);
  console.log('Migration completed.');
}

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('\n--- Current SQLite Tables ---');
console.table(tables);
