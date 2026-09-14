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
    'Batch Reject / DG': item.batchReject || '-',
    'SLoc NC': item.slocNC || '-',
    'SLoc Prime': item.slocPrime || '-',
    'SLoc Reject': item.slocReject || '-',
    'NC Masuk (Btg)': item.qtyNCIn,
    'NC Masuk (KG)': item.kgNCIn,
    'Issue Repair (Btg)': item.qtyOutRepair,
    'Issue Repair (KG)': item.kgOutRepair,
    'Hasil OK Prime (Btg)': item.qtyInPrime,
    'Hasil OK Prime (KG)': item.kgInPrime,
    'Reject / DG (Btg)': item.qtyReject,
    'Reject / DG (KG)': item.kgReject,
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

  // 3. Sheet OUT Repair (MVT 261 & Return 262)
  const outRepairRows = transactions
    .filter((t) => t.transactionType === 'OUT_REPAIR' || t.transactionType === 'OUT_REPAIR_RETURN')
    .map((t, idx) => ({
      'No': idx + 1,
      'Posting Date': formatExcelDate(t.postingDate),
      'Time': formatExcelTime(t.timeOfEntry) || '-',
      'SLoc': t.storageLocation,
      'Mvt': t.movementType,
      'Tipe Transaksi': t.transactionType === 'OUT_REPAIR_RETURN' ? 'RETURN REPAIR (262)' : 'ISSUE REPAIR (261)',
      'No Order': t.order || '-',
      'Work Center': t.workCenter || '-',
      'Customer': t.customer || '-',
      'Ukuran': parseMaterialUkuran(t.material, t.materialDescription),
      'Material': t.material,
      'Material Description': t.materialDescription,
      'Batch': t.batch,
      'Qty (Btg)': t.transactionType === 'OUT_REPAIR_RETURN' ? -t.qtyInUnOfEntry : t.qtyInUnOfEntry,
      'KG GI': t.transactionType === 'OUT_REPAIR_RETURN' ? -(t.kgGI || t.quantity) : (t.kgGI || t.quantity),
      'Mat. Document': t.materialDocument,
      'User': t.userName,
      'Unloading Point': t.unloadingPoint || '-'
    }));

  const wsOutRepair = XLSX.utils.json_to_sheet(outRepairRows);
  XLSX.utils.book_append_sheet(wb, wsOutRepair, 'OUT Repair (MVT 261 & 262)');

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

  // 5. Sheet Reject / DG Repair (Hasil Rumus MVT 261 - 262 - 101)
  const rejectRows = pipeline
    .filter((item) => {
      const hasRepairActivity =
        (item.qty261 ?? 0) > 0 ||
        (item.qty262 ?? 0) > 0 ||
        item.qtyOutRepair > 0 ||
        item.qtyInPrime > 0 ||
        item.qtyReject > 0;
      if (!hasRepairActivity) return false;
      if (item.order === '0' && !hasRepairActivity) return false;
      return true;
    })
    .map((item, idx) => ({
      'No': idx + 1,
      'No SPK Repair': item.order && item.order !== '0' ? item.order : '-',
      'Work Center': item.workCenter || '-',
      'Customer': item.customer || '-',
      'Ukuran': parseMaterialUkuran(item.material, item.materialDescription),
      'Kode Material': item.material,
      'Deskripsi Material': item.materialDescription,
      'Batch NC': item.batchNC || '-',
      'Batch Prime': item.batchPrime || '-',
      'SLoc NC': item.slocNC || '-',
      'SLoc Prime': item.slocPrime || '-',
      'GI Repair (261) (Btg)': item.qty261 ?? item.qtyOutRepair,
      'GI Repair (261) (KG)': item.kg261 ?? item.kgOutRepair,
      'Return (262) (Btg)': item.qty262 ?? 0,
      'Return (262) (KG)': item.kg262 ?? 0,
      'Net GI Repair (Btg)': item.qtyOutRepair,
      'Net GI Repair (KG)': item.kgOutRepair,
      'Prime OK (101) (Btg)': item.qtyInPrime,
      'Prime OK (101) (KG)': item.kgInPrime,
      'Reject / DG (261-262-101) (Btg)': item.qtyReject,
      'Reject / DG (261-262-101) (KG)': item.kgReject,
      'Status': item.status,
      'Recovery Rate (%)': `${item.recoveryRate.toFixed(1)}%`,
      'Tgl Terakhir': formatExcelDate(item.lastDate) || '-'
    }));

  const wsReject = XLSX.utils.json_to_sheet(rejectRows);
  XLSX.utils.book_append_sheet(wb, wsReject, 'Reject - DG Repair');

  // 6. Sheet Raw Log
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
