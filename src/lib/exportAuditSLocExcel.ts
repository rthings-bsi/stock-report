import * as XLSX from 'xlsx';
import {
  AuditSLocItem,
  AuditSLocGudangRecap,
  AuditSLocSummary,
} from '@/types/warehouse';
import { calculateAuditSLocGudangRecap } from './parseAuditSLoc';

export async function exportAuditSLocToExcel(
  items: AuditSLocItem[],
  filename = 'Report_Audit_SLoc_Spindo.xlsx',
  _summary?: AuditSLocSummary,
  customGudangRecap?: AuditSLocGudangRecap[]
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const mapItemToRow = (item: AuditSLocItem, idx: number) => ({
    'No': idx + 1,
    'Label': item.label || item.labelId || '-',
    'Plant': item.plant,
    'Gudang': item.gudang,
    'SLoc': item.sloc,
    'Material Number': item.material,
    'Deskripsi Material': item.materialDescription || '-',
    'Ukuran Pipa': item.ukuran || '-',
    'Batch': item.batch,
    'SAP (Awal)': item.sapInitialQty,
    'Eom (KG EOM)': Number(item.eomWeight.toFixed(3)),
    'Qty Audit': item.qtyAudit,
    'KG Audit': Number(item.kgAudit.toFixed(3)),
    'Diff KG Audit': Number(item.diffKgAudit.toFixed(3)),
    'Diff (Qty Diff Awal)': item.diffQtyInitial,
    'SAP (Final)': item.sapFinalQty,
    'Actual (Final)': item.actualFinalQty,
    'Diff Audit (Final Qty)': item.diffAuditFinalQty,
    'Diff Sign': item.diffSign,
    'Selisih KG Final': Number(item.kgDiffFinal.toFixed(3)),
    'Selisih Ton Final': Number(item.tonDiffFinal.toFixed(3)),
    'Status Hasil Audit': item.status === 'SESUAI'
      ? 'SESUAI (0)'
      : item.status === 'SELISIH_MINUS'
      ? 'SELISIH MINUS (-)'
      : 'SELISIH PLUS (+)',
    'Remarks / Catatan': item.remarks || '-'
  });

  // Sheet 1: Semua Data (14 Kolom SAP + Status & Selisih)
  const allRows = items.map(mapItemToRow);
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Data');

  // Sheet 2: Sesuai (Diff = 0)
  const sesuaiRows = items.filter((i) => i.status === 'SESUAI').map(mapItemToRow);
  const wsSesuai = XLSX.utils.json_to_sheet(sesuaiRows);
  XLSX.utils.book_append_sheet(wb, wsSesuai, 'Sesuai');

  // Sheet 3: Selisih Minus (-)
  const minusRows = items.filter((i) => i.status === 'SELISIH_MINUS').map(mapItemToRow);
  const wsMinus = XLSX.utils.json_to_sheet(minusRows);
  XLSX.utils.book_append_sheet(wb, wsMinus, 'Selisih Minus (-)');

  // Sheet 4: Selisih Plus (+)
  const plusRows = items.filter((i) => i.status === 'SELISIH_PLUS').map(mapItemToRow);
  const wsPlus = XLSX.utils.json_to_sheet(plusRows);
  XLSX.utils.book_append_sheet(wb, wsPlus, 'Selisih Plus (+)');

  // Sheet 5: Rekap per Gudang
  const recap = customGudangRecap || calculateAuditSLocGudangRecap(items);
  const recapRows = recap.map((r) => ({
    'Gudang': r.gudang,
    'Total Item': r.itemCount,
    'Item Sesuai': r.matchingCount,
    'Item Minus': r.minusCount,
    'Item Plus': r.plusCount,
    'Akurasi (%)': `${r.accuracyRate.toFixed(1)}%`,
    'Stock SAP (Btg)': r.sapQty,
    'Actual (Btg)': r.actualQty,
    'Selisih (Btg)': r.varianceQty,
    'Stock SAP (Ton)': Number(r.sapTon.toFixed(2)),
    'Actual (Ton)': Number(r.actualTon.toFixed(2)),
    'Selisih Ton': Number(r.varianceTon.toFixed(2))
  }));
  const wsRecap = XLSX.utils.json_to_sheet(recapRows);
  XLSX.utils.book_append_sheet(wb, wsRecap, 'Rekap per Gudang');

  XLSX.writeFile(wb, filename);
}
