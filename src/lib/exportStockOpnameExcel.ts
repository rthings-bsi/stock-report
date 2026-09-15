import * as XLSX from 'xlsx';
import { StockOpnameItem, StockOpnameSummary, StockOpnameGudangRecap } from '../types/warehouse';

export function exportStockOpnameToExcel(
  items: StockOpnameItem[],
  summary: StockOpnameSummary,
  gudangRecap: StockOpnameGudangRecap[],
  filename = 'Report_Stock_Opname_Spindo.xlsx'
) {
  const wb = XLSX.utils.book_new();

  const mapItemToRow = (item: StockOpnameItem, idx: number) => ({
    'No': idx + 1,
    'Label ID': item.labelId,
    'Plant': item.plant,
    'Gudang': item.gudang,
    'SLoc': item.sloc,
    'Material Number': item.material,
    'Deskripsi Material': item.materialDescription || '-',
    'Ukuran Pipa': item.ukuran || '-',
    'Batch': item.batch,
    'Stock SAP Awal': item.sapInitialQty,
    'UoM': item.uom,
    'Qty STO Actual': item.qtySTO,
    'KG STO': item.kgSTO,
    'Additional STO': item.additionalSTO,
    'KG Additional STO': item.kgAdditionalSTO,
    'KG Difference Awal': item.kgDifference,
    'Differences Awal': item.differencesQty,
    'Mutasi IN': item.qtyIn,
    'Berat IN (KG)': item.kgIn,
    'Mutasi OUT': item.qtyOut,
    'Berat OUT (KG)': item.kgOut,
    'Stock SAP Final': item.sapFinalQty,
    'Actual Final': item.actualFinalQty,
    'Differences Final': item.differencesFinalQty,
    'Diff Sign': item.diffSign,
    'Selisih KG Final': Number(item.kgDiffFinal.toFixed(3)),
    'Selisih Ton Final': Number(item.tonDiffFinal.toFixed(3)),
    'Status Hasil STO': item.status === 'SESUAI' ? 'SESUAI (0)' : item.status === 'SELISIH_MINUS' ? 'SELISIH MINUS (-)' : 'SELISIH PLUS (+)',
    'Remarks / Catatan': item.remarks || '-'
  });

  // Sheet 1: Semua Data
  const allRows = items.map(mapItemToRow);
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Data STO');

  // Sheet 2: Sesuai (Diff = 0)
  const sesuaiRows = items.filter(i => i.status === 'SESUAI').map(mapItemToRow);
  const wsSesuai = XLSX.utils.json_to_sheet(sesuaiRows);
  XLSX.utils.book_append_sheet(wb, wsSesuai, 'Sesuai');

  // Sheet 3: Selisih Minus (-)
  const minusRows = items.filter(i => i.status === 'SELISIH_MINUS').map(mapItemToRow);
  const wsMinus = XLSX.utils.json_to_sheet(minusRows);
  XLSX.utils.book_append_sheet(wb, wsMinus, 'Selisih Minus (-)');

  // Sheet 4: Selisih Plus (+)
  const plusRows = items.filter(i => i.status === 'SELISIH_PLUS').map(mapItemToRow);
  const wsPlus = XLSX.utils.json_to_sheet(plusRows);
  XLSX.utils.book_append_sheet(wb, wsPlus, 'Selisih Plus (+)');

  // Sheet 5: Rekap per Gudang
  const recapRows = gudangRecap.map(r => ({
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
