import * as XLSX from 'xlsx';
import { WeeklyReportData } from './weeklyAnalytics';
import { sanitizeTableData } from './sanitizeFormula';

export function exportWeeklyAnalyticsToExcel(
  report: WeeklyReportData,
  filename?: string
) {
  const wb = XLSX.utils.book_new();
  const weekLabel = report.period.label;
  const safeFilename = filename || `Laporan_Mingguan_Spindo_${report.period.id}.xlsx`;

  // ============================================================================
  // 1. SHEET: RINGKASAN EKSEKUTIF & MASTER KPI LEDGER
  // ============================================================================
  const kpiRows = sanitizeTableData([
    { 'Parameter': 'Pekan Operasional', 'Nilai': weekLabel },
    { 'Parameter': 'Rentang Tanggal', 'Nilai': `${report.period.startDate} s/d ${report.period.endDate}` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 1. KAPASITAS & STOK PIPA ===', 'Nilai': '' },
    { 'Parameter': 'Stok Pipa Awal Pekan', 'Nilai': `${(report.capacitySummary.startPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Stok Pipa Akhir Pekan', 'Nilai': `${(report.capacitySummary.endPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Perubahan Stok Pipa (Net Delta)', 'Nilai': `${(report.capacitySummary.deltaPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Rata-rata Okupansi Gudang Pipa', 'Nilai': `${report.capacitySummary.avgPipeOccupancy}%` },
    { 'Parameter': 'Komposisi Akhir WIP Pipa', 'Nilai': `${(report.capacitySummary.composition.endWip / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Komposisi Akhir FG Pipa', 'Nilai': `${(report.capacitySummary.composition.endFg / 1000).toFixed(2)} Ton` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 2. FAST VS SLOW MOVING (PASM) ===', 'Nilai': '' },
    { 'Parameter': 'Stok Fast Moving Akhir', 'Nilai': `${(report.fastSlowSummary.endFastTon / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Stok Slow Moving Akhir', 'Nilai': `${(report.fastSlowSummary.endSlowTon / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Persentase Slow Moving', 'Nilai': `${report.fastSlowSummary.endSlowPct}%` },
    { 'Parameter': 'Perubahan Slow Moving', 'Nilai': `${(report.fastSlowSummary.deltaSlowTon / 1000).toFixed(2)} Ton` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 3. BAHAN BAKU COIL & STRIP ===', 'Nilai': '' },
    { 'Parameter': 'Total Stok Bahan Baku Akhir', 'Nilai': `${(report.coilStripSummary.endTotalTon / 1000).toFixed(2)} Ton (${report.coilStripSummary.endTotalQty} Roll)` },
    { 'Parameter': 'Stok Coil Induk Akhir', 'Nilai': `${(report.coilStripSummary.endCoilTon / 1000).toFixed(2)} Ton (${report.coilStripSummary.endCoilQty} Roll)` },
    { 'Parameter': 'Stok Strip Slitting Akhir', 'Nilai': `${(report.coilStripSummary.endStripTon / 1000).toFixed(2)} Ton (${report.coilStripSummary.endStripQty} Roll)` },
    { 'Parameter': 'Net Perubahan Stok Bahan Baku', 'Nilai': `${(report.coilStripSummary.deltaTotalTon / 1000).toFixed(2)} Ton` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 4. STOK NC TERTARIK DI GUDANG ===', 'Nilai': '' },
    { 'Parameter': 'Total Stok NC Gudang Akhir', 'Nilai': `${report.ncStockSummary.endTotalNcTon.toLocaleString('id-ID')} Ton` },
    { 'Parameter': 'Stok Pipa Grade C', 'Nilai': `${report.ncStockSummary.endGradeCTon.toLocaleString('id-ID')} Ton (${report.ncStockSummary.endGradeCPct}%)` },
    { 'Parameter': 'Stok Pipa Grade E', 'Nilai': `${report.ncStockSummary.endGradeETon.toLocaleString('id-ID')} Ton (${report.ncStockSummary.endGradeEPct}%)` },
    { 'Parameter': 'Perubahan Stok NC Sepekan', 'Nilai': `${report.ncStockSummary.deltaNcTon.toLocaleString('id-ID')} Ton` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 5. PROGRES NC & REPAIR (MVT) ===', 'Nilai': '' },
    { 'Parameter': 'NC Masuk (MVT 309)', 'Nilai': `${(report.ncSummary.total309Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total309Qty} Btg/Pcs)` },
    { 'Parameter': 'Kirim Repair (MVT 261)', 'Nilai': `${(report.ncSummary.total261Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total261Qty} Btg/Pcs)` },
    { 'Parameter': 'Return Repair (MVT 262)', 'Nilai': `${(report.ncSummary.total262Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total262Qty} Btg/Pcs)` },
    { 'Parameter': 'Net Repair Dikeluarkan', 'Nilai': `${(report.ncSummary.netRepairIssuedKg / 1000).toFixed(2)} Ton (${report.ncSummary.netRepairIssuedQty} Btg/Pcs)` },
    { 'Parameter': 'Selesai Repair OK/Prime (MVT 101)', 'Nilai': `${(report.ncSummary.total101Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total101Qty} Btg/Pcs)` },
    { 'Parameter': 'Tingkat Pemulihan (Recovery Rate)', 'Nilai': `${report.ncSummary.recoveryRate}%` },
    { 'Parameter': 'Sisa Antrean NC (Outstanding)', 'Nilai': `${(report.ncSummary.netOutstandingKg / 1000).toFixed(2)} Ton (${report.ncSummary.netOutstandingQty} Btg/Pcs)` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 6. PEMENUHAN TARGET DELIVERY LOO ===', 'Nilai': '' },
    { 'Parameter': 'Target Delivery LOO', 'Nilai': `${report.looSummary.totalLooTon.toLocaleString('id-ID')} Ton (${report.looSummary.totalLooQty} Btg)` },
    { 'Parameter': 'Stok Ready Alokasi', 'Nilai': `${report.looSummary.totalStockTon.toLocaleString('id-ID')} Ton (${report.looSummary.totalStockQty} Btg)` },
    { 'Parameter': 'Overall Fulfillment Rate', 'Nilai': `${report.looSummary.overallFulfillment}%` },
    { 'Parameter': 'Customer Exposed (Defisit)', 'Nilai': `${report.looSummary.topExposedCustomers.length} Customer` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 7. TEMUAN KASUS UNFIFO ===', 'Nilai': '' },
    { 'Parameter': 'Total Kasus UNFIFO', 'Nilai': `${report.unfifoSummary.totalCases} Kasus (${report.unfifoSummary.totalTon} Ton)` },
    { 'Parameter': 'Kasus UNFIFO Pipa', 'Nilai': `${report.unfifoSummary.pipeCases} Kasus (${report.unfifoSummary.pipeTon} Ton, ${report.unfifoSummary.pipeQty} Btg)` },
    { 'Parameter': 'Kasus UNFIFO Coil', 'Nilai': `${report.unfifoSummary.coilCases} Kasus (${report.unfifoSummary.coilTon} Ton, ${report.unfifoSummary.coilQty} Roll)` },
    { 'Parameter': 'Aging Tertua Batch', 'Nilai': `${report.unfifoSummary.maxAgingDays} Hari` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 8. SIRKULASI PACKAGING & BUFFER RTP ===', 'Nilai': '' },
    { 'Parameter': 'Box Masuk / Inbound (RTP)', 'Nilai': `${report.packagingSummary.totalInQty} Box` },
    { 'Parameter': 'Box Keluar / Outbound (Kirim)', 'Nilai': `${report.packagingSummary.totalOutQty} Box` },
    { 'Parameter': 'Mutasi Bersih Box', 'Nilai': `${report.packagingSummary.netMutation} Box` },
    { 'Parameter': 'Total Temuan Packaging Rusak', 'Nilai': `${report.packagingSummary.damagedPackaging.totalDamagedQty} Box (${report.packagingSummary.damagedPackaging.limbahQty} Limbah/Scrap)` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== 9. PRODUKTIVITAS TENAGA KERJA (MB51) ===', 'Nilai': '' },
    { 'Parameter': 'Total Tonase Handled', 'Nilai': `${(report.productivitySummary.totalTonase / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Total Ritase / Transaksi Handled', 'Nilai': `${report.productivitySummary.totalTransaksi.toLocaleString('id-ID')} Transaksi` },
    { 'Parameter': 'Rata-rata Kg / Man', 'Nilai': `${report.productivitySummary.avgKgPerMan.toLocaleString('id-ID')} Kg/Man` },
    { 'Parameter': 'Rata-rata Tx / Man', 'Nilai': `${report.productivitySummary.avgTxPerMan} Tx/Man` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== EXECUTIVE KEY INSIGHTS ===', 'Nilai': '' },
    ...report.keyInsights.map((ins, idx) => ({
      'Parameter': `Insight ${idx + 1}`,
      'Nilai': ins,
    })),
  ]);
  const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Ringkasan Eksekutif');

  // ============================================================================
  // 2. SHEET: STOK PIPA & KAPASITAS GUDANG
  // ============================================================================
  const capRows = sanitizeTableData(report.capacitySummary.warehouseMovement.map((c) => ({
    'Gudang': c.gudang,
    'Kapasitas (Ton)': c.kapasitas,
    'Stok Awal (Ton)': Number((c.stockStart / 1000).toFixed(2)),
    'Stok Akhir (Ton)': Number((c.stockEnd / 1000).toFixed(2)),
    'Delta Stok (Ton)': Number((c.deltaStock / 1000).toFixed(2)),
    'Okupansi Akhir (%)': c.occupancyEnd,
    'WIP Awal (Ton)': Number((c.wipStart / 1000).toFixed(2)),
    'WIP Akhir (Ton)': Number((c.wipEnd / 1000).toFixed(2)),
    'FG Awal (Ton)': Number((c.fgStart / 1000).toFixed(2)),
    'FG Akhir (Ton)': Number((c.fgEnd / 1000).toFixed(2)),
    'WIP LT Akhir (Ton)': Number((c.wipLtEnd / 1000).toFixed(2)),
    'FG LT Akhir (Ton)': Number((c.fgLtEnd / 1000).toFixed(2)),
    'WIP ST Akhir (Ton)': Number((c.wipStEnd / 1000).toFixed(2)),
    'FG ST Akhir (Ton)': Number((c.fgStEnd / 1000).toFixed(2)),
  })));
  const wsCap = XLSX.utils.json_to_sheet(capRows);
  XLSX.utils.book_append_sheet(wb, wsCap, 'Stok Pipa & Kapasitas');

  // ============================================================================
  // 3. SHEET: FAST VS SLOW MOVING
  // ============================================================================
  const fsRows = sanitizeTableData(report.fastSlowSummary.warehouseMovement.map((f) => ({
    'Gudang': f.gudang,
    'Fast Awal (Ton)': Number((f.startFastTon / 1000).toFixed(2)),
    'Fast Akhir (Ton)': Number((f.endFastTon / 1000).toFixed(2)),
    'Delta Fast (Ton)': Number((f.deltaFastTon / 1000).toFixed(2)),
    'Slow Awal (Ton)': Number((f.startSlowTon / 1000).toFixed(2)),
    'Slow Akhir (Ton)': Number((f.endSlowTon / 1000).toFixed(2)),
    'Delta Slow (Ton)': Number((f.deltaSlowTon / 1000).toFixed(2)),
    'Slow Moving Akhir (%)': f.endSlowPct,
    'FG Slow (Ton)': Number((f.fgSlowTon / 1000).toFixed(2)),
    'WIP Slow (Ton)': Number((f.wipSlowTon / 1000).toFixed(2)),
  })));
  const wsFs = XLSX.utils.json_to_sheet(fsRows);
  XLSX.utils.book_append_sheet(wb, wsFs, 'Fast vs Slow Moving');

  // ============================================================================
  // 4. SHEET: BAHAN BAKU COIL & STRIP
  // ============================================================================
  const csRows = sanitizeTableData(report.coilStripSummary.areaMovement.map((a) => ({
    'Gudang': a.gudang,
    'Area Penempatan': a.area,
    'Stok Awal (Ton)': Number((a.startTon / 1000).toFixed(2)),
    'Stok Akhir (Ton)': Number((a.endTon / 1000).toFixed(2)),
    'Delta Tonase (Ton)': Number((a.deltaTon / 1000).toFixed(2)),
    'Stok Awal (Roll)': a.startQty,
    'Stok Akhir (Roll)': a.endQty,
    'Delta Qty (Roll)': a.deltaQty,
    'Kapasitas (Ton)': a.kapasitas,
    'Okupansi (%)': a.occupancyEnd,
    'Coil Akhir (Ton)': Number((a.coilTonEnd / 1000).toFixed(2)),
    'Strip Akhir (Ton)': Number((a.stripTonEnd / 1000).toFixed(2)),
  })));
  const wsCs = XLSX.utils.json_to_sheet(csRows);
  XLSX.utils.book_append_sheet(wb, wsCs, 'Bahan Baku Coil & Strip');

  // ============================================================================
  // 5. SHEET: STOK NC GUDANG
  // ============================================================================
  const ncStockRows = sanitizeTableData(report.ncStockSummary.warehouseMovement.map((n) => ({
    'Gudang': n.gudang,
    'Stok Prime (Ton)': Number((n.endPrimeTon / 1000).toFixed(2)),
    'Grade C Awal (Ton)': Number((n.startGradeCTon / 1000).toFixed(2)),
    'Grade C Akhir (Ton)': Number((n.endGradeCTon / 1000).toFixed(2)),
    'Grade E Awal (Ton)': Number((n.startGradeETon / 1000).toFixed(2)),
    'Grade E Akhir (Ton)': Number((n.endGradeETon / 1000).toFixed(2)),
    'Total NC Awal (Ton)': Number((n.startTotalNcTon / 1000).toFixed(2)),
    'Total NC Akhir (Ton)': Number((n.endTotalNcTon / 1000).toFixed(2)),
    'Delta NC (Ton)': Number((n.deltaNcTon / 1000).toFixed(2)),
    'Proporsi Grade E (%)': n.persenGradeE,
    'Total Batang NC': n.endQty,
  })));
  const wsNcStock = XLSX.utils.json_to_sheet(ncStockRows);
  XLSX.utils.book_append_sheet(wb, wsNcStock, 'Stok NC Gudang');

  // ============================================================================
  // 6. SHEET: PROGRES NC & REPAIR
  // ============================================================================
  const ncDailyRows = sanitizeTableData(report.ncSummary.dailyBreakdown.map((d) => ({
    'Tanggal': d.date,
    'Hari': d.dayName,
    'NC Masuk 309 (KG)': d.inNcKg,
    'NC Masuk 309 (Btg)': d.inNcQty,
    'Kirim Repair 261 (KG)': d.issuedRepairKg,
    'Kirim Repair 261 (Btg)': d.issuedRepairQty,
    'Selesai Repair 101 (KG)': d.completedPrimeKg,
    'Selesai Repair 101 (Btg)': d.completedPrimeQty,
  })));
  const wsNcDaily = XLSX.utils.json_to_sheet(ncDailyRows);
  XLSX.utils.book_append_sheet(wb, wsNcDaily, 'Progres NC Harian');

  const ncWcRows = sanitizeTableData(report.ncSummary.workCenterBreakdown.map((wc, idx) => ({
    'Rank': idx + 1,
    'Work Center / Mesin': wc.workCenter,
    'Dikerjakan Repair (KG)': wc.issuedKg,
    'Dikerjakan Repair (Btg)': wc.issuedQty,
    'Selesai OK Prime (KG)': wc.completedKg,
    'Selesai OK Prime (Btg)': wc.completedQty,
    'Recovery Rate (%)': Number(wc.recoveryRate.toFixed(1)),
  })));
  const wsNcWc = XLSX.utils.json_to_sheet(ncWcRows);
  XLSX.utils.book_append_sheet(wb, wsNcWc, 'Progres NC Work Center');

  // ============================================================================
  // 7. SHEET: PEMENUHAN DELIVERY LOO
  // ============================================================================
  const looCustRows = sanitizeTableData(report.looSummary.topExposedCustomers.map((c, idx) => ({
    'Rank': idx + 1,
    'Customer Exposed': c.customer,
    'Target LOO (Ton)': Number((c.looTon / 1000).toFixed(2)),
    'Stok Ready (Ton)': Number((c.stockTon / 1000).toFixed(2)),
    'Defisit Stok (Ton)': Number((c.deficitTon / 1000).toFixed(2)),
    'Fulfillment Rate (%)': c.fulfillmentRate,
    'Jumlah Item Order': c.itemsCount,
    'Gudang Terkait': c.gudangs.join(', '),
  })));
  const wsLooCust = XLSX.utils.json_to_sheet(looCustRows);
  XLSX.utils.book_append_sheet(wb, wsLooCust, 'Pemenuhan LOO Customer');

  // ============================================================================
  // 8. SHEET: TEMUAN UNFIFO
  // ============================================================================
  const unfifoRows = sanitizeTableData(report.unfifoSummary.criticalItems.map((u, idx) => ({
    'No': idx + 1,
    'Tipe Material': u.type,
    'Gudang': u.gudang,
    'Kode Material': u.kodeMaterial,
    'Ukuran / Spec': u.ukuran,
    'Customer / Manufaktur': u.customer,
    'Batch': u.batch,
    'Tonase (Ton)': Number((u.tonase / 1000).toFixed(2)),
    'Aging Batch (Hari)': u.agingDays,
    'Status UNFIFO': u.unfifoStatus,
    'Catatan Issue': u.issueNote || '-',
  })));
  const wsUnfifo = XLSX.utils.json_to_sheet(unfifoRows.length > 0 ? unfifoRows : [{ 'Keterangan': 'Tidak ada temuan pengeluaran material non-FIFO.' }]);
  XLSX.utils.book_append_sheet(wb, wsUnfifo, 'Temuan UNFIFO');

  // ============================================================================
  // 9. SHEET: PACKAGING & BUFFER RTP
  // ============================================================================
  const pkgRows = sanitizeTableData(report.packagingSummary.customerMovement.map((p) => ({
    'Customer': p.customer,
    'Tipe Box': p.type,
    'Box Masuk Inbound': p.inQty,
    'Box Keluar Outbound': p.outQty,
    'Mutasi Bersih': p.netMutation,
    'Saldo Akhir Box': p.stockSaatIni,
    'Status Buffer': p.status,
    'NG Slot': p.detailNG.slot,
    'NG Kaki': p.detailNG.kaki,
    'NG Dinding': p.detailNG.dinding,
    'NG Rangka': p.detailNG.rangka,
  })));
  const wsPkg = XLSX.utils.json_to_sheet(pkgRows);
  XLSX.utils.book_append_sheet(wb, wsPkg, 'Packaging & RTP');

  // ============================================================================
  // 10. SHEET: PRODUKTIVITAS TENAGA KERJA (MB51)
  // ============================================================================
  const prodWhRows = sanitizeTableData(report.productivitySummary.warehouseBreakdown.map((w, idx) => ({
    'Rank': idx + 1,
    'Gudang': w.warehouse,
    'Total Tonase (KG)': w.tonase,
    'Total Tonase (Ton)': Number((w.tonase / 1000).toFixed(2)),
    'Total Transaksi / Ritase': w.transaksi,
    'Rata-rata Kg/Man': w.avgKgPerMan,
    'Share Volume (%)': w.sharePercent,
  })));
  const wsProdWh = XLSX.utils.json_to_sheet(prodWhRows);
  XLSX.utils.book_append_sheet(wb, wsProdWh, 'Produktivitas Gudang');

  // Simpan file
  XLSX.writeFile(wb, safeFilename);
}
