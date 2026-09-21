import { SupabaseClient } from '@supabase/supabase-js';

// Chunk size for bulk inserts to avoid HTTP payload limits in PostgREST
const CHUNK_SIZE = 400;

async function chunkInsert(supabase: SupabaseClient, table: string, rows: any[]) {
  if (!rows || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.warn(`[Supabase Normalized] Error inserting into ${table}:`, error);
      throw error;
    }
  }
}

export async function getNormalizedSnapshotsListFromSupabase(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('snapshots')
    .select('snapshot_key, last_updated, created_at')
    .like('snapshot_key', 'snap_%')
    .order('snapshot_key', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getNormalizedSnapshotFromSupabase(supabase: SupabaseClient, key: string) {
  let headerQuery = supabase
    .from('snapshots')
    .select('snapshot_key, last_updated, created_at')
    .like('snapshot_key', 'snap_%');

  if (key === 'latest') {
    headerQuery = headerQuery.order('snapshot_key', { ascending: false }).limit(1);
  } else {
    headerQuery = headerQuery.eq('snapshot_key', key).limit(1);
  }

  const { data: headerRows, error: headerErr } = await headerQuery;
  if (headerErr) throw headerErr;

  const header = headerRows && headerRows.length > 0 ? headerRows[0] : null;
  if (!header) return null;

  const snapshotKey = header.snapshot_key;

  // Fetch all 13 child tables concurrently
  const [
    pipeRes,
    fsRes,
    coilRes,
    ncWhRes,
    ncItemsRes,
    looRes,
    unfifoRes,
    unfifoCoilRes,
    unfifoPipeRes,
    damagedRes,
    ncProgRes,
    stoRes,
    custRes,
  ] = await Promise.all([
    supabase.from('pipe_capacities').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('fast_slow').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('coil_strip').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('nc_warehouse').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('nc_items').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('loo_items').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('unfifo_items').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('unfifo_coil').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('unfifo_pipe').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('damaged_packaging').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('nc_progress').select('*').eq('snapshot_key', snapshotKey),
    supabase.from('stock_opname').select('*').eq('snapshot_key', snapshotKey).limit(1),
    supabase.from('customer_breakdown').select('*').eq('snapshot_key', snapshotKey),
  ]);

  // Helper untuk fallback mundur jika suatu modul belum ada data di snapshot ini
  const fetchTableWithFallback = async (table: string, currentRows: any[] | null | undefined, isSingle = false) => {
    if (currentRows && currentRows.length > 0) return currentRows;
    try {
      const { data: latestRow } = await supabase
        .from(table)
        .select('snapshot_key')
        .neq('snapshot_key', snapshotKey)
        .order('snapshot_key', { ascending: false })
        .limit(1);

      if (latestRow && latestRow.length > 0) {
        const query = supabase.from(table).select('*').eq('snapshot_key', latestRow[0].snapshot_key);
        const { data: fbData } = isSingle ? await query.limit(1) : await query;
        if (fbData && fbData.length > 0) return fbData;
      }
    } catch (e) {
      console.warn(`[Supabase Normalized] Fallback query failed for ${table}:`, e);
    }
    return currentRows || [];
  };

  const [
    pipeDataRows,
    fsDataRows,
    coilDataRows,
    ncWhDataRows,
    ncItemsDataRows,
    looDataRows,
    unfifoDataRows,
    unfifoCoilDataRows,
    unfifoPipeDataRows,
    damagedDataRows,
    ncProgDataRows,
    stoDataRows,
    custDataRows,
  ] = await Promise.all([
    fetchTableWithFallback('pipe_capacities', pipeRes.data),
    fetchTableWithFallback('fast_slow', fsRes.data),
    fetchTableWithFallback('coil_strip', coilRes.data),
    fetchTableWithFallback('nc_warehouse', ncWhRes.data),
    fetchTableWithFallback('nc_items', ncItemsRes.data),
    fetchTableWithFallback('loo_items', looRes.data),
    fetchTableWithFallback('unfifo_items', unfifoRes.data),
    fetchTableWithFallback('unfifo_coil', unfifoCoilRes.data),
    fetchTableWithFallback('unfifo_pipe', unfifoPipeRes.data),
    fetchTableWithFallback('damaged_packaging', damagedRes.data),
    fetchTableWithFallback('nc_progress', ncProgRes.data),
    fetchTableWithFallback('stock_opname', stoRes.data, true),
    fetchTableWithFallback('customer_breakdown', custRes.data),
  ]);

  // 1. Pipe Capacities
  const pipeCapacities = pipeDataRows.map((r: any) => ({
    gudang: r.gudang,
    kapasitas: Number(r.kapasitas) || 0,
    stock: Number(r.stock) || 0,
    persenTerisi: Number(r.persen_terisi) || 0,
    selisih: Number(r.selisih) || 0,
    wipLt: Number(r.wip_lt) || 0,
    fgLt: Number(r.fg_lt) || 0,
    wipSt: Number(r.wip_st) || 0,
    fgSt: Number(r.fg_st) || 0,
    customerStock: Number(r.customer_stock) || 0,
    freeStock: Number(r.free_stock) || 0,
    persenFreeStock: Number(r.persen_free_stock) || 0,
  }));

  // 2. Fast Slow
  const fastSlowData = fsDataRows.map((r: any) => ({
    gudang: r.gudang,
    fastTon: Number(r.fast_ton) || 0,
    fastPersen: Number(r.fast_persen) || 0,
    slowTon: Number(r.slow_ton) || 0,
    slowPersen: Number(r.slow_persen) || 0,
    totalTon: Number(r.total_ton) || 0,
    fgLtSlow: Number(r.fg_lt_slow) || 0,
    fgStSlow: Number(r.fg_st_slow) || 0,
    wipLtSlow: Number(r.wip_lt_slow) || 0,
    wipStSlow: Number(r.wip_st_slow) || 0,
    yearlySlowTon: typeof r.yearly_slow_ton === 'string' ? JSON.parse(r.yearly_slow_ton) : (r.yearly_slow_ton || {}),
  }));

  // 3. Coil Strip
  const coilStripData = coilDataRows.map((r: any) => ({
    gudang: r.gudang,
    area: r.area,
    coilQty: Number(r.coil_qty) || 0,
    coilTon: Number(r.coil_ton) || 0,
    stripQty: Number(r.strip_qty) || 0,
    stripTon: Number(r.strip_ton) || 0,
    totalQty: Number(r.total_qty) || 0,
    totalTon: Number(r.total_ton) || 0,
    kapasitas: Number(r.kapasitas) || 0,
    persenTerisi: Number(r.persen_terisi) || 0,
  }));

  // 4. NC Warehouse
  const ncWarehouseData = ncWhDataRows.map((r: any) => ({
    gudang: r.gudang,
    prime: Number(r.prime) || 0,
    gradeE: Number(r.grade_e) || 0,
    gradeC: Number(r.grade_c) || 0,
    persenGradeE: Number(r.persen_grade_e) || 0,
  }));

  // 5. NC Items
  const ncItems = ncItemsDataRows.map((r: any) => ({
    id: r.item_id || String(r.id),
    noNC: r.no_nc || undefined,
    gudang: r.gudang,
    ukuran: r.ukuran,
    customer: r.customer,
    kodeMaterial: r.kode_material,
    type: r.type,
    grade: r.grade,
    fgTon: Number(r.fg_ton) || 0,
    wipTon: Number(r.wip_ton) || 0,
    totalTon: Number(r.total_ton) || 0,
    remarks: r.remarks,
  }));

  // 6. LOO Items (ST & LT)
  const looSTData: any[] = [];
  const looLTData: any[] = [];
  for (const r of looDataRows) {
    const item = {
      no: r.no_urut,
      gudang: r.gudang,
      gudangs: typeof r.gudangs === 'string' ? JSON.parse(r.gudangs) : r.gudangs,
      customer: r.customer,
      ukuran: r.ukuran,
      kodeMaterial: r.kode_material,
      type: r.material_type,
      grade: r.grade,
      primeTon: Number(r.prime_ton) || 0,
      gradeCTon: Number(r.grade_c_ton) || 0,
      gradeETon: Number(r.grade_e_ton) || 0,
      fgTon: Number(r.fg_ton) || 0,
      wipTon: Number(r.wip_ton) || 0,
      totalStockTon: Number(r.total_stock_ton) || 0,
      looTon: Number(r.loo_ton) || 0,
      persenFulfillment: Number(r.persen_fulfillment) || 0,
      primeFulfillment: Number(r.prime_fulfillment) || 0,
      fgQty: Number(r.fg_qty) || 0,
      wipQty: Number(r.wip_qty) || 0,
      totalQty: Number(r.total_qty) || 0,
      looQty: Number(r.loo_qty) || 0,
      gudangBreakdown: typeof r.gudang_breakdown === 'string' ? JSON.parse(r.gudang_breakdown) : r.gudang_breakdown,
    };
    if (r.loo_type === 'ST') {
      looSTData.push(item);
    } else {
      looLTData.push(item);
    }
  }

  // 7. UNFIFO Items
  const unfifoData = unfifoDataRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    ukuran: r.ukuran,
    customer: r.customer,
    batchOld: r.batch_old,
    batchNew: r.batch_new,
    dateOld: r.date_old,
    dateNew: r.date_new,
    qtyOld: Number(r.qty_old) || 0,
    tonaseOld: Number(r.tonase_old) || 0,
    agingDays: Number(r.aging_days) || 0,
  }));

  // 8. UNFIFO Coil
  const unfifoCoilData = unfifoCoilDataRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    specification: r.specification,
    manufaktur: r.manufaktur,
    batch: r.batch,
    tebal: Number(r.tebal) || 0,
    lebar: Number(r.lebar) || 0,
    qtyRoll: Number(r.qty_roll) || 0,
    tonase: Number(r.tonase) || 0,
    incDate: r.inc_date,
    unfifoStatus: r.unfifo_status,
    issueNote: r.issue_note,
  }));

  // 9. UNFIFO Pipe
  const unfifoPipeData = unfifoPipeDataRows.map((r: any) => ({
    gudang: r.gudang,
    kodeMaterial: r.kode_material,
    ukuran: r.ukuran,
    customer: r.customer,
    batch: r.batch,
    prodYear: r.prod_year,
    qtyBtg: Number(r.qty_btg) || 0,
    tonase: Number(r.tonase) || 0,
    incDate: r.inc_date,
    unfifoStatus: r.unfifo_status,
    issueNote: r.issue_note,
  }));

  // 10. Damaged Packaging
  const damagedPackagingData = damagedDataRows.map((r: any) => ({
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
  const ncProgressData = (ncProgRes.data || []).map((r: any) => ({
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
    qtyInUnOfEntry: Number(r.qty_in_un_of_entry) || 0,
    quantity: Number(r.quantity) || 0,
    amountInLC: Number(r.amount_in_lc) || 0,
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
    kgGI: Number(r.kg_gi) || 0,
    kgGR: Number(r.kg_gr) || 0,
    transactionType: r.transaction_type,
    ncrNumber: r.ncr_number,
    problemRemark: r.problem_remark,
  }));

  // 12. Stock Opname
  const stoRow = stoDataRows && stoDataRows.length > 0 ? stoDataRows[0] : null;
  const stoData = stoRow?.data_json
    ? (typeof stoRow.data_json === 'string' ? JSON.parse(stoRow.data_json) : stoRow.data_json)
    : [];

  // 13. Customer Breakdown
  let customerBreakdown: Record<string, Array<{ customer: string; qty: number; tonase: number }>> = {};
  const custRows = custDataRows && custDataRows.length > 0 ? custDataRows : [];
  if (custRows.length > 0) {
    for (const r of custRows) {
      if (!customerBreakdown[r.gudang]) {
        customerBreakdown[r.gudang] = [];
      }
      customerBreakdown[r.gudang].push({
        customer: r.customer,
        qty: Number(r.qty) || 0,
        tonase: Number(r.tonase) || 0,
      });
    }
  } else {
    try {
      const { data: legRows } = await supabase
        .from('warehouse_snapshots')
        .select('customer_breakdown')
        .not('customer_breakdown', 'is', null)
        .order('snapshot_key', { ascending: false });
      if (legRows) {
        for (const lr of legRows) {
          const cb = typeof lr.customer_breakdown === 'string' ? JSON.parse(lr.customer_breakdown) : lr.customer_breakdown;
          if (cb && typeof cb === 'object' && Object.keys(cb).length > 0) {
            customerBreakdown = cb;
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase Normalized] Fallback customer_breakdown failed:', e);
    }
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

export async function saveNormalizedSnapshotToSupabase(
  supabase: SupabaseClient,
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

  // 1. Header snapshots table
  const { error: headerErr } = await supabase
    .from('snapshots')
    .upsert({ snapshot_key: snapshotKey, last_updated: lastUpdated }, { onConflict: 'snapshot_key' });
  if (headerErr) throw headerErr;

  // 2. Pipe Capacities
  if (data.pipeCapacities !== undefined && data.pipeCapacities.length > 0) {
    await supabase.from('pipe_capacities').delete().eq('snapshot_key', snapshotKey);
    const rows = data.pipeCapacities.map((p: any) => ({
      snapshot_key: snapshotKey,
      gudang: p.gudang || '',
      kapasitas: p.kapasitas || 0,
      stock: p.stock || 0,
      persen_terisi: p.persenTerisi || 0,
      selisih: p.selisih || 0,
      wip_lt: p.wipLt || 0,
      fg_lt: p.fgLt || 0,
      wip_st: p.wipSt || 0,
      fg_st: p.fgSt || 0,
      customer_stock: p.customerStock || 0,
      free_stock: p.freeStock || 0,
      persen_free_stock: p.persenFreeStock || 0,
    }));
    await chunkInsert(supabase, 'pipe_capacities', rows);
  }

  // 3. Fast Slow
  if (data.fastSlowData !== undefined && data.fastSlowData.length > 0) {
    await supabase.from('fast_slow').delete().eq('snapshot_key', snapshotKey);
    const rows = data.fastSlowData.map((fs: any) => ({
      snapshot_key: snapshotKey,
      gudang: fs.gudang || '',
      fast_ton: fs.fastTon || 0,
      fast_persen: fs.fastPersen || 0,
      slow_ton: fs.slowTon || 0,
      slow_persen: fs.slowPersen || 0,
      total_ton: fs.totalTon || 0,
      fg_lt_slow: fs.fgLtSlow || 0,
      fg_st_slow: fs.fgStSlow || 0,
      wip_lt_slow: fs.wipLtSlow || 0,
      wip_st_slow: fs.wipStSlow || 0,
      yearly_slow_ton: fs.yearlySlowTon || {},
    }));
    await chunkInsert(supabase, 'fast_slow', rows);
  }

  // 4. Coil Strip
  if (data.coilStripData !== undefined && data.coilStripData.length > 0) {
    await supabase.from('coil_strip').delete().eq('snapshot_key', snapshotKey);
    const rows = data.coilStripData.map((c: any) => ({
      snapshot_key: snapshotKey,
      gudang: c.gudang || '',
      area: c.area || '',
      coil_qty: c.coilQty || 0,
      coil_ton: c.coilTon || 0,
      strip_qty: c.stripQty || 0,
      strip_ton: c.stripTon || 0,
      total_qty: c.totalQty || 0,
      total_ton: c.totalTon || 0,
      kapasitas: c.kapasitas || 0,
      persen_terisi: c.persenTerisi || 0,
    }));
    await chunkInsert(supabase, 'coil_strip', rows);
  }

  // 5. NC Warehouse
  if (data.ncWarehouseData !== undefined && data.ncWarehouseData.length > 0) {
    await supabase.from('nc_warehouse').delete().eq('snapshot_key', snapshotKey);
    const rows = data.ncWarehouseData.map((n: any) => ({
      snapshot_key: snapshotKey,
      gudang: n.gudang || '',
      prime: n.prime || 0,
      grade_e: n.gradeE || 0,
      grade_c: n.gradeC || 0,
      persen_grade_e: n.persenGradeE || 0,
    }));
    await chunkInsert(supabase, 'nc_warehouse', rows);
  }

  // 6. NC Items
  if (data.ncItems !== undefined && data.ncItems.length > 0) {
    await supabase.from('nc_items').delete().eq('snapshot_key', snapshotKey);
    const rows = data.ncItems.map((item: any) => ({
      snapshot_key: snapshotKey,
      item_id: item.id || null,
      no_nc: item.noNC || null,
      gudang: item.gudang || '',
      ukuran: item.ukuran || '',
      customer: item.customer || '',
      kode_material: item.kodeMaterial || '',
      type: item.type || '',
      grade: item.grade || '',
      fg_ton: item.fgTon || 0,
      wip_ton: item.wipTon || 0,
      total_ton: item.totalTon || 0,
      remarks: item.remarks || '',
    }));
    await chunkInsert(supabase, 'nc_items', rows);
  }

  // 7. LOO Items (ST & LT)
  const hasLooST = data.looSTData !== undefined && data.looSTData.length > 0;
  const hasLooLT = data.looLTData !== undefined && data.looLTData.length > 0;
  if (hasLooST || hasLooLT) {
    if (hasLooST) {
      await supabase.from('loo_items').delete().eq('snapshot_key', snapshotKey).eq('loo_type', 'ST');
    }
    if (hasLooLT) {
      await supabase.from('loo_items').delete().eq('snapshot_key', snapshotKey).eq('loo_type', 'LT');
    }

    const looRows: any[] = [];
    if (hasLooST && data.looSTData) {
      for (const l of data.looSTData) {
        looRows.push({
          snapshot_key: snapshotKey,
          loo_type: 'ST',
          no_urut: l.no || null,
          gudang: l.gudang || '',
          gudangs: l.gudangs || [],
          customer: l.customer || '',
          ukuran: l.ukuran || '',
          kode_material: l.kodeMaterial || '',
          material_type: l.type || '',
          grade: l.grade || '',
          prime_ton: l.primeTon || 0,
          grade_c_ton: l.gradeCTon || 0,
          grade_e_ton: l.gradeETon || 0,
          fg_ton: l.fgTon || 0,
          wip_ton: l.wipTon || 0,
          total_stock_ton: l.totalStockTon || 0,
          loo_ton: l.looTon || 0,
          persen_fulfillment: l.persenFulfillment || 0,
          prime_fulfillment: l.primeFulfillment || 0,
          fg_qty: l.fgQty || 0,
          wip_qty: l.wipQty || 0,
          total_qty: l.totalQty || 0,
          loo_qty: l.looQty || 0,
          gudang_breakdown: l.gudangBreakdown || {},
        });
      }
    }
    if (hasLooLT && data.looLTData) {
      for (const l of data.looLTData) {
        looRows.push({
          snapshot_key: snapshotKey,
          loo_type: 'LT',
          no_urut: l.no || null,
          gudang: l.gudang || '',
          gudangs: l.gudangs || [],
          customer: l.customer || '',
          ukuran: l.ukuran || '',
          kode_material: l.kodeMaterial || '',
          material_type: l.type || '',
          grade: l.grade || '',
          prime_ton: l.primeTon || 0,
          grade_c_ton: l.gradeCTon || 0,
          grade_e_ton: l.gradeETon || 0,
          fg_ton: l.fgTon || 0,
          wip_ton: l.wipTon || 0,
          total_stock_ton: l.totalStockTon || 0,
          loo_ton: l.looTon || 0,
          persen_fulfillment: l.persenFulfillment || 0,
          prime_fulfillment: l.primeFulfillment || 0,
          fg_qty: l.fgQty || 0,
          wip_qty: l.wipQty || 0,
          total_qty: l.totalQty || 0,
          loo_qty: l.looQty || 0,
          gudang_breakdown: l.gudangBreakdown || {},
        });
      }
    }
    if (looRows.length > 0) {
      await chunkInsert(supabase, 'loo_items', looRows);
    }
  }

  // 8. UNFIFO Items
  if (data.unfifoData !== undefined && data.unfifoData.length > 0) {
    await supabase.from('unfifo_items').delete().eq('snapshot_key', snapshotKey);
    const rows = data.unfifoData.map((u: any) => ({
      snapshot_key: snapshotKey,
      gudang: u.gudang || '',
      kode_material: u.kodeMaterial || '',
      ukuran: u.ukuran || '',
      customer: u.customer || '',
      batch_old: u.batchOld || '',
      batch_new: u.batchNew || '',
      date_old: u.dateOld || '',
      date_new: u.dateNew || '',
      qty_old: u.qtyOld || 0,
      tonase_old: u.tonaseOld || 0,
      aging_days: u.agingDays || 0,
    }));
    await chunkInsert(supabase, 'unfifo_items', rows);
  }

  // 9. UNFIFO Coil
  if (data.unfifoCoilData !== undefined && data.unfifoCoilData.length > 0) {
    await supabase.from('unfifo_coil').delete().eq('snapshot_key', snapshotKey);
    const rows = data.unfifoCoilData.map((uc: any) => ({
      snapshot_key: snapshotKey,
      gudang: uc.gudang || '',
      kode_material: uc.kodeMaterial || '',
      specification: uc.specification || '',
      manufaktur: uc.manufaktur || '',
      batch: uc.batch || '',
      tebal: uc.tebal || 0,
      lebar: uc.lebar || 0,
      qty_roll: uc.qtyRoll || 0,
      tonase: uc.tonase || 0,
      inc_date: uc.incDate || '',
      unfifo_status: uc.unfifoStatus || '',
      issue_note: uc.issueNote || '',
    }));
    await chunkInsert(supabase, 'unfifo_coil', rows);
  }

  // 10. UNFIFO Pipe
  if (data.unfifoPipeData !== undefined && data.unfifoPipeData.length > 0) {
    await supabase.from('unfifo_pipe').delete().eq('snapshot_key', snapshotKey);
    const rows = data.unfifoPipeData.map((up: any) => ({
      snapshot_key: snapshotKey,
      gudang: up.gudang || '',
      kode_material: up.kodeMaterial || '',
      ukuran: up.ukuran || '',
      customer: up.customer || '',
      batch: up.batch || '',
      prod_year: up.prodYear || '',
      qty_btg: up.qtyBtg || 0,
      tonase: up.tonase || 0,
      inc_date: up.incDate || '',
      unfifo_status: up.unfifoStatus || '',
      issue_note: up.issueNote || '',
    }));
    await chunkInsert(supabase, 'unfifo_pipe', rows);
  }

  // 11. Damaged Packaging
  if (data.damagedPackagingData !== undefined && data.damagedPackagingData.length > 0) {
    await supabase.from('damaged_packaging').delete().eq('snapshot_key', snapshotKey);
    const rows = data.damagedPackagingData.map((d: any) => ({
      snapshot_key: snapshotKey,
      item_id: d.id || null,
      no_urut: d.no || null,
      package_no: d.packageNo || '',
      serial_no: d.serialNo || '',
      plant: d.plant || '',
      customer: d.customer || '',
      user_scan: d.userScan || '',
      tgl_scan_in: d.tglScanIn || '',
      jam_scan_in: d.jamScanIn || '',
      kondisi: d.kondisi || '',
      slot: d.slot || '',
      kaki: d.kaki || '',
      rangka: d.rangka || '',
      pengait: d.pengait || '',
      dinding: d.dinding || '',
      label_item: d.labelItem || '',
      limbah: d.limbah || '',
      defect_category: d.defectCategory || '',
    }));
    await chunkInsert(supabase, 'damaged_packaging', rows);
  }

  // 12. NC Progress
  if (data.ncProgressData !== undefined && data.ncProgressData.length > 0) {
    await supabase.from('nc_progress').delete().eq('snapshot_key', snapshotKey);
    const rows = data.ncProgressData.map((np: any) => ({
      snapshot_key: snapshotKey,
      item_id: np.id || null,
      entry_date: np.entryDate || '',
      time_of_entry: np.timeOfEntry || '',
      plant: np.plant || '',
      storage_location: np.storageLocation || '',
      posting_date: np.postingDate || '',
      movement_type: np.movementType || '',
      customer: np.customer || '',
      purchase_order: np.purchaseOrder || '',
      order_no: np.order || '',
      work_center: np.workCenter || '',
      material: np.material || '',
      material_description: np.materialDescription || '',
      batch: np.batch || '',
      qty_in_un_of_entry: np.qtyInUnOfEntry || 0,
      quantity: np.quantity || 0,
      amount_in_lc: np.amountInLC || 0,
      document_header_text: np.documentHeaderText || '',
      material_document: np.materialDocument || '',
      material_doc_item: np.materialDocItem || '',
      reference: np.reference || '',
      gr_gi_slip: np.grGiSlip || '',
      user_name: np.userName || '',
      text: np.text || '',
      unloading_point: np.unloadingPoint || '',
      sales_order: np.salesOrder || '',
      sales_order_item: np.salesOrderItem || '',
      kg_gi: np.kgGI || 0,
      kg_gr: np.kgGR || 0,
      transaction_type: np.transactionType || '',
      ncr_number: np.ncrNumber || '',
      problem_remark: np.problemRemark || '',
    }));
    await chunkInsert(supabase, 'nc_progress', rows);
  }

  // 13. Stock Opname
  if (data.stoData !== undefined) {
    const stoList = typeof data.stoData === 'string'
      ? JSON.parse(data.stoData)
      : data.stoData;
    if (Array.isArray(stoList) && stoList.length > 0) {
      await supabase.from('stock_opname').delete().eq('snapshot_key', snapshotKey);
      await chunkInsert(supabase, 'stock_opname', [
        {
          snapshot_key: snapshotKey,
          data_json: stoList,
        },
      ]);
    }
  }

  // 14. Customer Breakdown
  if (data.customerBreakdown !== undefined) {
    const custObj = typeof data.customerBreakdown === 'string'
      ? JSON.parse(data.customerBreakdown)
      : data.customerBreakdown;
    if (custObj && typeof custObj === 'object' && Object.keys(custObj).length > 0) {
      const rows: any[] = [];
      for (const [gudangName, custList] of Object.entries(custObj)) {
        if (Array.isArray(custList)) {
          for (const item of custList) {
            rows.push({
              snapshot_key: snapshotKey,
              gudang: gudangName,
              customer: (item as any).customer || '',
              qty: Math.round(Number((item as any).qty) || 0),
              tonase: Number((item as any).tonase) || 0,
            });
          }
        }
      }
      if (rows.length > 0) {
        await supabase.from('customer_breakdown').delete().eq('snapshot_key', snapshotKey);
        await chunkInsert(supabase, 'customer_breakdown', rows);
      }
    }
  }
}

export async function deleteNormalizedSnapshotFromSupabase(supabase: SupabaseClient, snapshotKey: string | string[]) {
  const rawKeys = Array.isArray(snapshotKey) ? snapshotKey : [snapshotKey];
  const keys = Array.from(
    new Set(
      rawKeys.flatMap((k) => [
        k,
        k.startsWith('snap_') ? k.replace('snap_', '') : `snap_${k}`,
      ])
    )
  );

  const tables = [
    'pipe_capacities', 'fast_slow', 'coil_strip', 'nc_warehouse',
    'nc_items', 'loo_items', 'unfifo_items', 'unfifo_coil', 'unfifo_pipe',
    'damaged_packaging', 'nc_progress', 'stock_opname', 'customer_breakdown'
  ];

  for (const t of tables) {
    try {
      const { error } = await supabase.from(t).delete().in('snapshot_key', keys);
      if (error) {
        console.warn(`[Supabase Normalized] Error deleting from ${t}:`, error);
      }
    } catch (err) {
      console.warn(`[Supabase Normalized] Exception deleting from ${t}:`, err);
    }
  }

  try {
    const { error } = await supabase.from('snapshots').delete().in('snapshot_key', keys);
    if (error) {
      console.warn(`[Supabase Normalized] Error deleting from snapshots:`, error);
    }
  } catch (err) {
    console.warn(`[Supabase Normalized] Exception deleting from snapshots:`, err);
  }
}

export async function deleteAllNormalizedSnapshotsFromSupabase(supabase: SupabaseClient) {
  const childTables = [
    'pipe_capacities', 'fast_slow', 'coil_strip', 'nc_warehouse',
    'nc_items', 'loo_items', 'unfifo_items', 'unfifo_coil', 'unfifo_pipe',
    'damaged_packaging', 'nc_progress', 'stock_opname', 'customer_breakdown'
  ];

  for (const t of childTables) {
    try {
      const { error } = await supabase.from(t).delete().like('snapshot_key', '%');
      if (error) {
        console.warn(`[Supabase Normalized] Error deleting all from ${t}:`, error);
      }
    } catch (err) {
      console.warn(`[Supabase Normalized] Exception deleting all from ${t}:`, err);
    }
  }

  try {
    const { error } = await supabase.from('snapshots').delete().like('snapshot_key', '%');
    if (error) {
      console.warn(`[Supabase Normalized] Error deleting all from snapshots:`, error);
    }
  } catch (err) {
    console.warn(`[Supabase Normalized] Exception deleting all from snapshots:`, err);
  }
}
