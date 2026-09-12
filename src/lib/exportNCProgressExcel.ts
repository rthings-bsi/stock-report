import * as XLSX from 'xlsx';
import { NCProgressTransaction, NCProgressPipelineItem, NCProgressSummary } from '../types/warehouse';
import { formatExcelDate, formatExcelTime, parseMaterialUkuran } from './parseNCProgress';

export function exportNCProgressToExcel(
  transactions: NCProgressTransaction[],
  pipeline: NCProgressPipelineItem[],
  summary: NCProgressSummary,
  filename = 'Report_Progres_NC_Spindo.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Ringkasan & Tracking Alur
  const trackingRows = pipeline.map((item, idx) => ({
    'No': idx + 1,
    'Status': item.status,
    'No NCR': item.ncrNumber || '-',
    'Keterangan Masalah': item.problemRemark || '-',
    'Customer': item.customer || '-',
    'Ukuran': parseMaterialUkuran(item.material, item.materialDescription),
    'Kode Material': item.material,
    'Deskripsi Material': item.materialDescription,
    'No SPK Repair': item.order || '-',
    'Work Center': item.workCenter || '-',
    'Batch NC (Awal)': item.batchNC || '-',
    'Batch Prime (Hasil)': item.batchPrime || '-',
    'SLoc NC': item.slocNC || '-',
    'SLoc Hasil': item.slocPrime || '-',
    'NC Masuk (Btg)': item.qtyNCIn,
    'NC Masuk (KG)': item.kgNCIn,
    'Issue Repair (Btg)': item.qtyOutRepair,
    'Issue Repair (KG)': item.kgOutRepair,
    'Hasil OK Prime (Btg)': item.qtyInPrime,
    'Hasil OK Prime (KG)': item.kgInPrime,
    'Recovery Rate (%)': `${item.recoveryRate.toFixed(1)}%`,
    'Tgl Update Terakhir': formatExcelDate(item.lastDate) || '-'
  }));

  const wsTracking = XLSX.utils.json_to_sheet(trackingRows);
  XLSX.utils.book_append_sheet(wb, wsTracking, 'Tracking Alur NC');

  // 2. Sheet IN NC (MVT 309)
  const inNCRows = transactions
    .filter((t) => t.transactionType === 'IN_NC')
    .map((t, idx) => ({
      'No': idx + 1,
      'Posting Date': formatExcelDate(t.postingDate),
      'Time': formatExcelTime(t.timeOfEntry) || '-',
      'SLoc': t.storageLocation,
      'Mvt': t.movementType,
      'No NCR': t.ncrNumber || '-',
      'Keterangan / Defect': t.problemRemark || t.text || '-',
      'Customer': t.customer || '-',
      'Ukuran': parseMaterialUkuran(t.material, t.materialDescription),
      'Material': t.material,
      'Material Description': t.materialDescription,
      'Batch': t.batch,
      'Qty (Btg)': t.qtyInUnOfEntry,
      'Quantity (KG)': t.quantity,
      'Mat. Document': t.materialDocument,
      'Item': t.materialDocItem,
      'User': t.userName,
      'Unloading Point': t.unloadingPoint || '-',
      'Sales Order': t.salesOrder || '-'
    }));

  const wsInNC = XLSX.utils.json_to_sheet(inNCRows);
  XLSX.utils.book_append_sheet(wb, wsInNC, 'IN NC (MVT 309)');

  // 3. Sheet OUT Repair (MVT 261 REP)
  const outRepairRows = transactions
    .filter((t) => t.transactionType === 'OUT_REPAIR')
    .map((t, idx) => ({
      'No': idx + 1,
      'Posting Date': formatExcelDate(t.postingDate),
      'Time': formatExcelTime(t.timeOfEntry) || '-',
      'SLoc': t.storageLocation,
      'Mvt': t.movementType,
      'No Order': t.order || '-',
      'Work Center': t.workCenter || '-',
      'Customer': t.customer || '-',
      'Ukuran': parseMaterialUkuran(t.material, t.materialDescription),
      'Material': t.material,
      'Material Description': t.materialDescription,
      'Batch': t.batch,
      'Qty (Btg)': t.qtyInUnOfEntry,
      'KG GI': t.kgGI || t.quantity,
      'Mat. Document': t.materialDocument,
      'User': t.userName,
      'Unloading Point': t.unloadingPoint || '-'
    }));

  const wsOutRepair = XLSX.utils.json_to_sheet(outRepairRows);
  XLSX.utils.book_append_sheet(wb, wsOutRepair, 'OUT Repair (MVT 261)');

  // 4. Sheet IN OK Prime (MVT 101 REP)
  const inPrimeRows = transactions
    .filter((t) => t.transactionType === 'IN_OK_PRIME')
    .map((t, idx) => ({
      'No': idx + 1,
      'Posting Date': formatExcelDate(t.postingDate),
      'Time': formatExcelTime(t.timeOfEntry) || '-',
      'SLoc': t.storageLocation,
      'Mvt': t.movementType,
      'No Order': t.order || '-',
      'Work Center': t.workCenter || '-',
      'Customer': t.customer || '-',
      'Ukuran': parseMaterialUkuran(t.material, t.materialDescription),
      'Material': t.material,
      'Material Description': t.materialDescription,
      'Batch Prime': t.batch,
      'Qty GR (Btg)': t.qtyInUnOfEntry,
      'KG GR': t.kgGR || t.quantity,
      'Mat. Document': t.materialDocument,
      'User': t.userName,
      'Sales Order': t.salesOrder || '-'
    }));

  const wsInPrime = XLSX.utils.json_to_sheet(inPrimeRows);
  XLSX.utils.book_append_sheet(wb, wsInPrime, 'IN OK Prime (MVT 101)');

  // 5. Sheet Raw Log
  const allRows = transactions.map((t, idx) => ({
    'No': idx + 1,
    'Tipe': t.transactionType,
    'Entry Date': formatExcelDate(t.entryDate),
    'Posting Date': formatExcelDate(t.postingDate),
    'Plant': t.plant,
    'SLoc': t.storageLocation,
    'Mvt': t.movementType,
    'Customer': t.customer,
    'Order': t.order,
    'Work Center': t.workCenter,
    'Ukuran': parseMaterialUkuran(t.material, t.materialDescription),
    'Material': t.material,
    'Material Description': t.materialDescription,
    'Batch': t.batch,
    'Qty': t.qtyInUnOfEntry,
    'Quantity (KG)': t.quantity,
    'KG GI': t.kgGI,
    'KG GR': t.kgGR,
    'Mat. Document': t.materialDocument,
    'User': t.userName,
    'Text / NCR': t.text,
    'Unloading Point': t.unloadingPoint,
    'Sales Order': t.salesOrder
  }));

  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Raw Transaksi SAP');

  // Trigger download
  XLSX.writeFile(wb, filename);
}
