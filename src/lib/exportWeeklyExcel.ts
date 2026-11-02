import * as XLSX from 'xlsx';
import {
  WeeklyReportData,
} from './weeklyAnalytics';

export function exportWeeklyAnalyticsToExcel(
  report: WeeklyReportData,
  filename?: string
) {
  const wb = XLSX.utils.book_new();
  const weekLabel = report.period.label;
  const safeFilename = filename || `Laporan_Mingguan_Spindo_${report.period.id}.xlsx`;

  // 1. Sheet Ringkasan Eksekutif & KPI
  const kpiRows = [
    { 'Parameter': 'Pekan', 'Nilai': weekLabel },
    { 'Parameter': 'Rentang Tanggal', 'Nilai': `${report.period.startDate} s/d ${report.period.endDate}` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== INDIKATOR PROGRES NC & REPAIR ===', 'Nilai': '' },
    { 'Parameter': 'NC Masuk (MVT 309)', 'Nilai': `${(report.ncSummary.total309Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total309Qty} Btg/Pcs)` },
    { 'Parameter': 'Kirim Repair (MVT 261)', 'Nilai': `${(report.ncSummary.total261Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total261Qty} Btg/Pcs)` },
    { 'Parameter': 'Return Repair (MVT 262)', 'Nilai': `${(report.ncSummary.total262Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total262Qty} Btg/Pcs)` },
    { 'Parameter': 'Net Repair Dikeluarkan', 'Nilai': `${(report.ncSummary.netRepairIssuedKg / 1000).toFixed(2)} Ton (${report.ncSummary.netRepairIssuedQty} Btg/Pcs)` },
    { 'Parameter': 'Selesai Repair OK/Prime (MVT 101)', 'Nilai': `${(report.ncSummary.total101Kg / 1000).toFixed(2)} Ton (${report.ncSummary.total101Qty} Btg/Pcs)` },
    { 'Parameter': 'Tingkat Pemulihan (Recovery Rate)', 'Nilai': `${report.ncSummary.recoveryRate}%` },
    { 'Parameter': 'Sisa Antrean NC (Outstanding)', 'Nilai': `${(report.ncSummary.netOutstandingKg / 1000).toFixed(2)} Ton (${report.ncSummary.netOutstandingQty} Btg/Pcs)` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== INDIKATOR PRODUKTIVITAS GUDANG (MB51) ===', 'Nilai': '' },
    { 'Parameter': 'Total Tonase Handled', 'Nilai': `${(report.productivitySummary.totalTonase / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Total Ritase / Transaksi Handled', 'Nilai': `${report.productivitySummary.totalTransaksi} Transaksi` },
    { 'Parameter': 'Rata-rata Kg / Man', 'Nilai': `${report.productivitySummary.avgKgPerMan.toLocaleString('id-ID')} Kg/Man` },
    { 'Parameter': 'Rata-rata Tx / Man', 'Nilai': `${report.productivitySummary.avgTxPerMan} Tx/Man` },
    { 'Parameter': '', 'Nilai': '' },
    { 'Parameter': '=== INDIKATOR PERGERAKAN STOK & KAPASITAS ===', 'Nilai': '' },
    { 'Parameter': 'Stok Pipa Awal Pekan', 'Nilai': `${(report.capacitySummary.startPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Stok Pipa Akhir Pekan', 'Nilai': `${(report.capacitySummary.endPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Perubahan Stok Pipa (Net Delta)', 'Nilai': `${(report.capacitySummary.deltaPipeStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Rata-rata Okupansi Pipa Akhir Pekan', 'Nilai': `${report.capacitySummary.avgPipeOccupancy}%` },
    { 'Parameter': 'Stok Coil Awal Pekan', 'Nilai': `${(report.capacitySummary.startCoilStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Stok Coil Akhir Pekan', 'Nilai': `${(report.capacitySummary.endCoilStock / 1000).toFixed(2)} Ton` },
    { 'Parameter': 'Perubahan Stok Coil (Net Delta)', 'Nilai': `${(report.capacitySummary.deltaCoilStock / 1000).toFixed(2)} Ton` },
  ];
  const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
  XLSX.utils.book_append_sheet(wb, wsKpi, 'Ringkasan Eksekutif');

  // 2. Sheet NC Tren Harian & Work Center
  const ncDailyRows = report.ncSummary.dailyBreakdown.map((d) => ({
    'Tanggal': d.date,
    'Hari': d.dayName,
    'NC Masuk 309 (KG)': d.inNcKg,
    'NC Masuk 309 (Btg)': d.inNcQty,
    'Kirim Repair 261 (KG)': d.issuedRepairKg,
    'Kirim Repair 261 (Btg)': d.issuedRepairQty,
    'Selesai Repair 101 (KG)': d.completedPrimeKg,
    'Selesai Repair 101 (Btg)': d.completedPrimeQty,
  }));
  const wsNcDaily = XLSX.utils.json_to_sheet(ncDailyRows);
  XLSX.utils.book_append_sheet(wb, wsNcDaily, 'NC Tren Harian');

  const ncWcRows = report.ncSummary.workCenterBreakdown.map((wc, idx) => ({
    'Rank': idx + 1,
    'Work Center / Mesin': wc.workCenter,
    'Dikerjakan Repair (KG)': wc.issuedKg,
    'Dikerjakan Repair (Btg)': wc.issuedQty,
    'Selesai OK Prime (KG)': wc.completedKg,
    'Selesai OK Prime (Btg)': wc.completedQty,
    'Recovery Rate (%)': Number(wc.recoveryRate.toFixed(1)),
  }));
  const wsNcWc = XLSX.utils.json_to_sheet(ncWcRows);
  XLSX.utils.book_append_sheet(wb, wsNcWc, 'NC Work Center');

  // 3. Sheet Produktivitas Gudang
  const prodWhRows = report.productivitySummary.warehouseBreakdown.map((w, idx) => ({
    'Rank': idx + 1,
    'Gudang': w.warehouse,
    'Total Tonase (KG)': w.tonase,
    'Total Tonase (Ton)': Number((w.tonase / 1000).toFixed(2)),
    'Total Transaksi': w.transaksi,
    'Rata-rata Kg/Man': w.avgKgPerMan,
    'Share Volume (%)': w.sharePercent,
  }));
  const wsProdWh = XLSX.utils.json_to_sheet(prodWhRows);
  XLSX.utils.book_append_sheet(wb, wsProdWh, 'Produktivitas Gudang');

  // 4. Sheet Kapasitas & Pergerakan Gudang
  const capRows = report.capacitySummary.warehouseMovement.map((c) => ({
    'Gudang': c.gudang,
    'Kapasitas Maks (KG)': c.kapasitas,
    'Stok Awal Pekan (KG)': c.stockStart,
    'Stok Akhir Pekan (KG)': c.stockEnd,
    'Perubahan Stok Delta (KG)': c.deltaStock,
    'Okupansi Akhir (%)': c.occupancyEnd,
  }));
  const wsCap = XLSX.utils.json_to_sheet(capRows);
  XLSX.utils.book_append_sheet(wb, wsCap, 'Pergerakan Kapasitas');

  // Simpan file
  XLSX.writeFile(wb, safeFilename);
}
