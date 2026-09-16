/* eslint-disable @typescript-eslint/no-explicit-any */

export function initNormalizedSchema(db: any) {
  if (!db) return;

  // Drop legacy norm_ prefix tables if they exist
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

  // Drop old 0-row damaged_packaging stub if old column structure
  try {
    const cols = (db.pragma('table_info(damaged_packaging)') as any[]).map((c) => c.name);
    if (cols.length > 0 && !cols.includes('snapshot_key')) {
      db.exec('DROP TABLE IF EXISTS damaged_packaging;');
    }
  } catch {}

  db.exec(`
    -- 1. Snapshot Header
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_key TEXT UNIQUE NOT NULL,
      last_updated TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_key ON snapshots(snapshot_key);

    -- 2. Pipe Capacity Detail
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

    -- 3. Fast Slow Detail
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

    -- 4. Coil & Strip Detail
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

    -- 5. NC Warehouse Recap Detail
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

    -- 6. NC Items Detail
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

    -- 7. LOO Fulfillment Items (ST & LT)
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

    -- 8. UNFIFO Recap Items
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

    -- 9. UNFIFO Coil Detail
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

    -- 10. UNFIFO Pipe Detail
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

    -- 11. Damaged Packaging Detail
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

    -- 12. NC Progress Detail
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

    -- 13. Stock Opname Detail
    CREATE TABLE IF NOT EXISTS stock_opname (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_key TEXT NOT NULL,
      data_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_stock_opname_snap ON stock_opname(snapshot_key);

    -- 14. Customer Breakdown Detail
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
}

export function getNormalizedSnapshotsList(db: any) {
  return db
    .prepare(`
      SELECT snapshot_key, last_updated, created_at
      FROM snapshots
      WHERE snapshot_key LIKE 'snap_%'
      ORDER BY snapshot_key DESC
    `)
    .all();
}

export function getNormalizedSnapshot(db: any, key: string) {
  let header: any = null;
  if (key === 'latest') {
    header = db
      .prepare(`
        SELECT * FROM snapshots
        WHERE snapshot_key LIKE 'snap_%'
        ORDER BY snapshot_key DESC
        LIMIT 1
      `)
      .get();
  } else {
    header = db
      .prepare('SELECT * FROM snapshots WHERE snapshot_key = ?')
      .get(key);
  }

  if (!header) return null;
  const snapshotKey = header.snapshot_key;

  // 1. Pipe Capacities
  const pipeRows = db
    .prepare('SELECT * FROM pipe_capacities WHERE snapshot_key = ?')
    .all(snapshotKey);
  const pipeCapacities = pipeRows.map((r: any) => ({
    gudang: r.gudang,
    kapasitas: r.kapasitas,
    stock: r.stock,
    persenTerisi: r.persen_terisi,
    selisih: r.selisih,
    wipLt: r.wip_lt,
    fgLt: r.fg_lt,
    wipSt: r.wip_st,
    fgSt: r.fg_st,
    customerStock: r.customer_stock,
    freeStock: r.free_stock,
    persenFreeStock: r.persen_free_stock,
  }));

  // 2. Fast Slow
  const fsRows = db
    .prepare('SELECT * FROM fast_slow WHERE snapshot_key = ?')
    .all(snapshotKey);
  const fastSlowData = fsRows.map((r: any) => ({
    gudang: r.gudang,
    fastTon: r.fast_ton,
    fastPersen: r.fast_persen,
    slowTon: r.slow_ton,
    slowPersen: r.slow_persen,
    totalTon: r.total_ton,
    fgLtSlow: r.fg_lt_slow,
    fgStSlow: r.fg_st_slow,
    wipLtSlow: r.wip_lt_slow,
    wipStSlow: r.wip_st_slow,
    yearlySlowTon: r.yearly_slow_ton ? JSON.parse(r.yearly_slow_ton) : {},
  }));

  // 3. Coil Strip
  const coilRows = db
    .prepare('SELECT * FROM coil_strip WHERE snapshot_key = ?')
    .all(snapshotKey);
  const coilStripData = coilRows.map((r: any) => ({
    gudang: r.gudang,
    area: r.area,
    coilQty: r.coil_qty,
    coilTon: r.coil_ton,
    stripQty: r.strip_qty,
    stripTon: r.strip_ton,
    totalQty: r.total_qty,
    totalTon: r.total_ton,
    kapasitas: r.kapasitas,
    persenTerisi: r.persen_terisi,
  }));

  // 4. NC Warehouse Recap
  const ncWhRows = db
    .prepare('SELECT * FROM nc_warehouse WHERE snapshot_key = ?')
    .all(snapshotKey);
  const ncWarehouseData = ncWhRows.map((r: any) => ({
    gudang: r.gudang,
    prime: r.prime,
    gradeE: r.grade_e,
    gradeC: r.grade_c,
    persenGradeE: r.persen_grade_e,
  }));

  // 5. NC Items
  const ncItemRows = db
    .prepare('SELECT * FROM nc_items WHERE snapshot_key = ?')
    .all(snapshotKey);
  const ncItems = ncItemRows.map((r: any) => ({
    id: r.item_id || String(r.id),
    noNC: r.no_nc || undefined,
    gudang: r.gudang,
    ukuran: r.ukuran,
    customer: r.customer,
    kodeMaterial: r.kode_material,
    type: r.type,
    grade: r.grade,
    fgTon: r.fg_ton,
    wipTon: r.wip_ton,
    totalTon: r.total_ton,
    remarks: r.remarks,
  }));

  // 6. LOO ST & LT
  const looRows = db
    .prepare('SELECT * FROM loo_items WHERE snapshot_key = ?')
    .all(snapshotKey);
  const looSTData: any[] = [];
  const looLTData: any[] = [];

  for (const r of looRows) {
    const item = {
      no: r.no_urut,
      gudang: r.gudang,
      gudangs: r.gudangs ? JSON.parse(r.gudangs) : undefined,
      customer: r.customer,
      ukuran: r.ukuran,
      kodeMaterial: r.kode_material,
      type: r.material_type,
      grade: r.grade,
      primeTon: r.prime_ton,
      gradeCTon: r.grade_c_ton,
      gradeETon: r.grade_e_ton,
      fgTon: r.fg_ton,
      wipTon: r.wip_ton,
      totalStockTon: r.total_stock_ton,
      looTon: r.loo_ton,
      persenFulfillment: r.persen_fulfillment,
      primeFulfillment: r.prime_fulfillment,
      fgQty: r.fg_qty,
      wipQty: r.wip_qty,
      totalQty: r.total_qty,
      looQty: r.loo_qty,
      gudangBreakdown: r.gudang_breakdown ? JSON.parse(r.gudang_breakdown) : undefined,
    };
    if (r.loo_type === 'ST') looSTData.push(item);
    else looLTData.push(item);
  }

  // 7. UNFIFO items
  const unfifoRows = db
    .prepare('SELECT * FROM unfifo_items WHERE snapshot_key = ?')
    .all(snapshotKey);
  const unfifoData = unfifoRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    ukuran: r.ukuran,
    customer: r.customer,
    batchOld: r.batch_old,
    batchNew: r.batch_new,
    dateOld: r.date_old,
    dateNew: r.date_new,
    qtyOld: r.qty_old,
    tonaseOld: r.tonase_old,
    agingDays: r.aging_days,
  }));

  // 8. UNFIFO Coil
  const coilUnfifoRows = db
    .prepare('SELECT * FROM unfifo_coil WHERE snapshot_key = ?')
    .all(snapshotKey);
  const unfifoCoilData = coilUnfifoRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    specification: r.specification,
    manufaktur: r.manufaktur,
    batch: r.batch,
    tebal: r.tebal,
    lebar: r.lebar,
    qtyRoll: r.qty_roll,
    tonase: r.tonase,
    incDate: r.inc_date,
    unfifoStatus: r.unfifo_status,
    issueNote: r.issue_note,
  }));

  // 9. UNFIFO Pipe
  const pipeUnfifoRows = db
    .prepare('SELECT * FROM unfifo_pipe WHERE snapshot_key = ?')
    .all(snapshotKey);
  const unfifoPipeData = pipeUnfifoRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    ukuran: r.ukuran,
    customer: r.customer,
    batch: r.batch,
    prodYear: r.prod_year,
    qtyBtg: r.qty_btg,
    tonase: r.tonase,
    incDate: r.inc_date,
    unfifoStatus: r.unfifo_status,
    issueNote: r.issue_note,
  }));

  // 10. Damaged Packaging
  const dmgRows = db
    .prepare('SELECT * FROM damaged_packaging WHERE snapshot_key = ?')
    .all(snapshotKey);
  const damagedPackagingData = dmgRows.map((r: any) => ({
    id: r.item_id || String(r.id),
    no: r.no_urut,
    packageNo: r.package_no,
    serialNo: r.serial_no,
    plant: r.plant,
    customer: r.customer,
    userScan: r.user_scan,
    tglScanIn: r.tgl_scan_in,
    jamScanIn: r.jam_scan_in,
    kondisi: r.kondisi,
    slot: r.slot,
    kaki: r.kaki,
    rangka: r.rangka,
    pengait: r.pengait,
    dinding: r.dinding,
    labelItem: r.label_item,
    limbah: r.limbah,
    defectCategory: r.defect_category,
  }));

  // 11. NC Progress
  const ncProgRows = db
    .prepare('SELECT * FROM nc_progress WHERE snapshot_key = ?')
    .all(snapshotKey);
  const ncProgressData = ncProgRows.map((r: any) => ({
    id: r.item_id || String(r.id),
    entryDate: r.entry_date,
    timeOfEntry: r.time_of_entry,
    plant: r.plant,
    storageLocation: r.storage_location,
    postingDate: r.posting_date,
    movementType: r.movement_type,
    customer: r.customer,
    purchaseOrder: r.purchase_order,
    order: r.order_no,
    workCenter: r.work_center,
    material: r.material,
    materialDescription: r.material_description,
    batch: r.batch,
    qtyInUnOfEntry: r.qty_in_un_of_entry,
    quantity: r.quantity,
    amountInLC: r.amount_in_lc,
    documentHeaderText: r.document_header_text,
    materialDocument: r.material_document,
    materialDocItem: r.material_doc_item,
    reference: r.reference,
    grGiSlip: r.gr_gi_slip,
    userName: r.user_name,
    text: r.text,
    unloadingPoint: r.unloading_point,
    salesOrder: r.sales_order,
    salesOrderItem: r.sales_order_item,
    kgGI: r.kg_gi,
    kgGR: r.kg_gr,
    transactionType: r.transaction_type,
    ncrNumber: r.ncr_number,
    problemRemark: r.problem_remark,
  }));

  // 12. Stock Opname
  const stoRow = db
    .prepare('SELECT data_json FROM stock_opname WHERE snapshot_key = ? LIMIT 1')
    .get(snapshotKey);
  const stoData = stoRow && stoRow.data_json ? JSON.parse(stoRow.data_json) : [];

  // 13. Customer Breakdown
  const custRows = db
    .prepare('SELECT * FROM customer_breakdown WHERE snapshot_key = ?')
    .all(snapshotKey);
  const customerBreakdown: Record<string, Array<{ customer: string; qty: number; tonase: number }>> = {};
  for (const r of custRows) {
    if (!customerBreakdown[r.gudang]) {
      customerBreakdown[r.gudang] = [];
    }
    customerBreakdown[r.gudang].push({
      customer: r.customer,
      qty: r.qty,
      tonase: r.tonase,
    });
  }

  return {
    snapshotKey,
    lastUpdated: header.last_updated,
    pipeCapacities,
    fastSlowData,
    coilStripData,
    ncWarehouseData,
    ncItems,
    looSTData,
    looLTData,
    unfifoData,
    unfifoCoilData,
    unfifoPipeData,
    damagedPackagingData,
    incomingPackagingData: [],
    ncProgressData,
    stoData,
    customerBreakdown,
    createdAt: header.created_at,
  };
}

export function saveNormalizedSnapshot(
  db: any,
  data: {
    snapshotKey: string;
    lastUpdated: string;
    pipeCapacities?: any[];
    fastSlowData?: any[];
    coilStripData?: any[];
    ncWarehouseData?: any[];
    ncItems?: any[];
    looSTData?: any[];
    looLTData?: any[];
    unfifoData?: any[];
    unfifoCoilData?: any[];
    unfifoPipeData?: any[];
    damagedPackagingData?: any[];
    ncProgressData?: any[];
    stoData?: any[];
    customerBreakdown?: Record<string, any[]>;
  }
) {
  const { snapshotKey, lastUpdated } = data;

  const tx = db.transaction(() => {
    // Header
    db.prepare(`
      INSERT INTO snapshots (snapshot_key, last_updated)
      VALUES (?, ?)
      ON CONFLICT(snapshot_key) DO UPDATE SET
        last_updated = excluded.last_updated
    `).run(snapshotKey, lastUpdated);

    // Pipe Capacities
    if (data.pipeCapacities !== undefined) {
      db.prepare('DELETE FROM pipe_capacities WHERE snapshot_key = ?').run(snapshotKey);
      const insertPipe = db.prepare(`
        INSERT INTO pipe_capacities (
          snapshot_key, gudang, kapasitas, stock, persen_terisi, selisih,
          wip_lt, fg_lt, wip_st, fg_st, customer_stock, free_stock, persen_free_stock
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of data.pipeCapacities) {
        insertPipe.run(
          snapshotKey, p.gudang || '', p.kapasitas || 0, p.stock || 0, p.persenTerisi || 0, p.selisih || 0,
          p.wipLt || 0, p.fgLt || 0, p.wipSt || 0, p.fgSt || 0, p.customerStock || 0, p.freeStock || 0, p.persenFreeStock || 0
        );
      }
    }

    // Fast Slow
    if (data.fastSlowData !== undefined) {
      db.prepare('DELETE FROM fast_slow WHERE snapshot_key = ?').run(snapshotKey);
      const insertFastSlow = db.prepare(`
        INSERT INTO fast_slow (
          snapshot_key, gudang, fast_ton, fast_persen, slow_ton, slow_persen,
          total_ton, fg_lt_slow, fg_st_slow, wip_lt_slow, wip_st_slow, yearly_slow_ton
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const fs of data.fastSlowData) {
        insertFastSlow.run(
          snapshotKey, fs.gudang || '', fs.fastTon || 0, fs.fastPersen || 0, fs.slowTon || 0, fs.slowPersen || 0,
          fs.totalTon || 0, fs.fgLtSlow || 0, fs.fgStSlow || 0, fs.wipLtSlow || 0, fs.wipStSlow || 0,
          fs.yearlySlowTon ? JSON.stringify(fs.yearlySlowTon) : null
        );
      }
    }

    // Coil Strip
    if (data.coilStripData !== undefined) {
      db.prepare('DELETE FROM coil_strip WHERE snapshot_key = ?').run(snapshotKey);
      const insertCoil = db.prepare(`
        INSERT INTO coil_strip (
          snapshot_key, gudang, area, coil_qty, coil_ton, strip_qty, strip_ton,
          total_qty, total_ton, kapasitas, persen_terisi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of data.coilStripData) {
        insertCoil.run(
          snapshotKey, c.gudang || '', c.area || '', c.coilQty || 0, c.coilTon || 0, c.stripQty || 0, c.stripTon || 0,
          c.totalQty || 0, c.totalTon || 0, c.kapasitas || 0, c.persenTerisi || 0
        );
      }
    }

    // NC Warehouse
    if (data.ncWarehouseData !== undefined) {
      db.prepare('DELETE FROM nc_warehouse WHERE snapshot_key = ?').run(snapshotKey);
      const insertNcWh = db.prepare(`
        INSERT INTO nc_warehouse (
          snapshot_key, gudang, prime, grade_e, grade_c, persen_grade_e
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const n of data.ncWarehouseData) {
        insertNcWh.run(snapshotKey, n.gudang || '', n.prime || 0, n.gradeE || 0, n.gradeC || 0, n.persenGradeE || 0);
      }
    }

    // NC Items
    if (data.ncItems !== undefined) {
      db.prepare('DELETE FROM nc_items WHERE snapshot_key = ?').run(snapshotKey);
      const insertNcItem = db.prepare(`
        INSERT INTO nc_items (
          snapshot_key, item_id, no_nc, gudang, ukuran, customer,
          kode_material, type, grade, fg_ton, wip_ton, total_ton, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of data.ncItems) {
        insertNcItem.run(
          snapshotKey, item.id || null, item.noNC || null, item.gudang || '', item.ukuran || '', item.customer || '',
          item.kodeMaterial || '', item.type || '', item.grade || '', item.fgTon || 0, item.wipTon || 0,
          item.totalTon || 0, item.remarks || ''
        );
      }
    }

    // LOO ST & LT
    if (data.looSTData !== undefined || data.looLTData !== undefined) {
      if (data.looSTData !== undefined) {
        db.prepare("DELETE FROM loo_items WHERE snapshot_key = ? AND loo_type = 'ST'").run(snapshotKey);
      }
      if (data.looLTData !== undefined) {
        db.prepare("DELETE FROM loo_items WHERE snapshot_key = ? AND loo_type = 'LT'").run(snapshotKey);
      }
      const insertLoo = db.prepare(`
        INSERT INTO loo_items (
          snapshot_key, loo_type, no_urut, gudang, gudangs, customer, ukuran,
          kode_material, material_type, grade, prime_ton, grade_c_ton, grade_e_ton,
          fg_ton, wip_ton, total_stock_ton, loo_ton, persen_fulfillment, prime_fulfillment,
          fg_qty, wip_qty, total_qty, loo_qty, gudang_breakdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      if (data.looSTData) {
        for (const l of data.looSTData) {
          insertLoo.run(
            snapshotKey, 'ST', l.no || null, l.gudang || '', l.gudangs ? JSON.stringify(l.gudangs) : null,
            l.customer || '', l.ukuran || '', l.kodeMaterial || '', l.type || '', l.grade || '',
            l.primeTon || 0, l.gradeCTon || 0, l.gradeETon || 0, l.fgTon || 0, l.wipTon || 0,
            l.totalStockTon || 0, l.looTon || 0, l.persenFulfillment || 0, l.primeFulfillment || 0,
            l.fgQty || 0, l.wipQty || 0, l.totalQty || 0, l.looQty || 0,
            l.gudangBreakdown ? JSON.stringify(l.gudangBreakdown) : null
          );
        }
      }

      if (data.looLTData) {
        for (const l of data.looLTData) {
          insertLoo.run(
            snapshotKey, 'LT', l.no || null, l.gudang || '', l.gudangs ? JSON.stringify(l.gudangs) : null,
            l.customer || '', l.ukuran || '', l.kodeMaterial || '', l.type || '', l.grade || '',
            l.primeTon || 0, l.gradeCTon || 0, l.gradeETon || 0, l.fgTon || 0, l.wipTon || 0,
            l.totalStockTon || 0, l.looTon || 0, l.persenFulfillment || 0, l.primeFulfillment || 0,
            l.fgQty || 0, l.wipQty || 0, l.totalQty || 0, l.looQty || 0,
            l.gudangBreakdown ? JSON.stringify(l.gudangBreakdown) : null
          );
        }
      }
    }

    // UNFIFO Items
    if (data.unfifoData !== undefined) {
      db.prepare('DELETE FROM unfifo_items WHERE snapshot_key = ?').run(snapshotKey);
      const insertUnfifo = db.prepare(`
        INSERT INTO unfifo_items (
          snapshot_key, gudang, kode_material, ukuran, customer,
          batch_old, batch_new, date_old, date_new, qty_old, tonase_old, aging_days
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of data.unfifoData) {
        insertUnfifo.run(
          snapshotKey, u.gudang || '', u.kodeMaterial || '', u.ukuran || '', u.customer || '',
          u.batchOld || '', u.batchNew || '', u.dateOld || '', u.dateNew || '',
          u.qtyOld || 0, u.tonaseOld || 0, u.agingDays || 0
        );
      }
    }

    // UNFIFO Coil
    if (data.unfifoCoilData !== undefined) {
      db.prepare('DELETE FROM unfifo_coil WHERE snapshot_key = ?').run(snapshotKey);
      const insertUnfifoCoil = db.prepare(`
        INSERT INTO unfifo_coil (
          snapshot_key, gudang, kode_material, specification, manufaktur,
          batch, tebal, lebar, qty_roll, tonase, inc_date, unfifo_status, issue_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const uc of data.unfifoCoilData) {
        insertUnfifoCoil.run(
          snapshotKey, uc.gudang || '', uc.kodeMaterial || '', uc.specification || '', uc.manufaktur || '',
          uc.batch || '', uc.tebal || 0, uc.lebar || 0, uc.qtyRoll || 0, uc.tonase || 0,
          uc.incDate || '', uc.unfifoStatus || '', uc.issueNote || ''
        );
      }
    }

    // UNFIFO Pipe
    if (data.unfifoPipeData !== undefined) {
      db.prepare('DELETE FROM unfifo_pipe WHERE snapshot_key = ?').run(snapshotKey);
      const insertUnfifoPipe = db.prepare(`
        INSERT INTO unfifo_pipe (
          snapshot_key, gudang, kode_material, ukuran, customer, batch,
          prod_year, qty_btg, tonase, inc_date, unfifo_status, issue_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const up of data.unfifoPipeData) {
        insertUnfifoPipe.run(
          snapshotKey, up.gudang || '', up.kodeMaterial || '', up.ukuran || '', up.customer || '', up.batch || '',
          up.prodYear || '', up.qtyBtg || 0, up.tonase || 0, up.incDate || '', up.unfifoStatus || '', up.issueNote || ''
        );
      }
    }

    // Damaged Packaging
    if (data.damagedPackagingData !== undefined) {
      db.prepare('DELETE FROM damaged_packaging WHERE snapshot_key = ?').run(snapshotKey);
      const insertDmg = db.prepare(`
        INSERT INTO damaged_packaging (
          snapshot_key, item_id, no_urut, package_no, serial_no, plant, customer,
          user_scan, tgl_scan_in, jam_scan_in, kondisi, slot, kaki, rangka,
          pengait, dinding, label_item, limbah, defect_category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of data.damagedPackagingData) {
        insertDmg.run(
          snapshotKey, d.id || null, d.no || null, d.packageNo || '', d.serialNo || '', d.plant || '', d.customer || '',
          d.userScan || '', d.tglScanIn || '', d.jamScanIn || '', d.kondisi || '', d.slot || '', d.kaki || '',
          d.rangka || '', d.pengait || '', d.dinding || '', d.labelItem || '', d.limbah || '', d.defectCategory || ''
        );
      }
    }

    // NC Progress
    if (data.ncProgressData !== undefined) {
      db.prepare('DELETE FROM nc_progress WHERE snapshot_key = ?').run(snapshotKey);
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
      for (const np of data.ncProgressData) {
        insertNcProg.run(
          snapshotKey, np.id || null, np.entryDate || '', np.timeOfEntry || '', np.plant || '', np.storageLocation || '',
          np.postingDate || '', np.movementType || '', np.customer || '', np.purchaseOrder || '', np.order || '',
          np.workCenter || '', np.material || '', np.materialDescription || '', np.batch || '',
          np.qtyInUnOfEntry || 0, np.quantity || 0, np.amountInLC || 0, np.documentHeaderText || '',
          np.materialDocument || '', np.materialDocItem || '', np.reference || '', np.grGiSlip || '',
          np.userName || '', np.text || '', np.unloadingPoint || '', np.salesOrder || '', np.salesOrderItem || '',
          np.kgGI || 0, np.kgGR || 0, np.transactionType || '', np.ncrNumber || '', np.problemRemark || ''
        );
      }
    }

    // Stock Opname
    if (data.stoData !== undefined) {
      db.prepare('DELETE FROM stock_opname WHERE snapshot_key = ?').run(snapshotKey);
      if (Array.isArray(data.stoData) && data.stoData.length > 0) {
        db.prepare('INSERT INTO stock_opname (snapshot_key, data_json) VALUES (?, ?)').run(
          snapshotKey,
          JSON.stringify(data.stoData)
        );
      }
    }

    // Customer Breakdown
    if (data.customerBreakdown !== undefined) {
      db.prepare('DELETE FROM customer_breakdown WHERE snapshot_key = ?').run(snapshotKey);
      const insertCust = db.prepare(`
        INSERT INTO customer_breakdown (snapshot_key, gudang, customer, qty, tonase)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const [gudangName, custList] of Object.entries(data.customerBreakdown)) {
        if (Array.isArray(custList)) {
          for (const item of custList) {
            insertCust.run(snapshotKey, gudangName, item.customer || '', item.qty || 0, item.tonase || 0);
          }
        }
      }
    }
  });

  tx();
}

export function deleteNormalizedSnapshot(db: any, snapshotKey: string) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM snapshots WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM pipe_capacities WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM fast_slow WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM coil_strip WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM nc_warehouse WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM nc_items WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM loo_items WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM unfifo_items WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM unfifo_coil WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM unfifo_pipe WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM damaged_packaging WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM nc_progress WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM stock_opname WHERE snapshot_key = ?').run(snapshotKey);
    db.prepare('DELETE FROM customer_breakdown WHERE snapshot_key = ?').run(snapshotKey);
  });
  tx();
}

export function deleteAllNormalizedSnapshots(db: any) {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM snapshots').run();
    db.prepare('DELETE FROM pipe_capacities').run();
    db.prepare('DELETE FROM fast_slow').run();
    db.prepare('DELETE FROM coil_strip').run();
    db.prepare('DELETE FROM nc_warehouse').run();
    db.prepare('DELETE FROM nc_items').run();
    db.prepare('DELETE FROM loo_items').run();
    db.prepare('DELETE FROM unfifo_items').run();
    db.prepare('DELETE FROM unfifo_coil').run();
    db.prepare('DELETE FROM unfifo_pipe').run();
    db.prepare('DELETE FROM damaged_packaging').run();
    db.prepare('DELETE FROM nc_progress').run();
    db.prepare('DELETE FROM stock_opname').run();
    db.prepare('DELETE FROM customer_breakdown').run();
  });
  tx();
}
