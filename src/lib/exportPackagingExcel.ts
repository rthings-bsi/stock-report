import * as ExcelJS from 'exceljs';
import { IncomingPackagingItem } from '../types/warehouse';

/**
 * Export Check Sheet Stock Packaging Internal to styled Excel (.xlsx)
 * Matching the exact visual style of SPINDO Check Sheet standard.
 */
export async function exportPackagingCheckSheet(
  items: IncomingPackagingItem[],
  customDateLabel?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPINDO Unit 5 Karawang';
  workbook.lastModifiedBy = 'Warehouse Audit System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Check Sheet Packaging', {
    views: [{ showGridLines: true }]
  });

  // Set Column Definitions & Widths
  worksheet.columns = [
    { key: 'no', width: 6 },                   // Col A: No
    { key: 'tglIncoming', width: 14 },          // Col B: Tgl Incoming
    { key: 'customer', width: 34 },             // Col C: Customer
    { key: 'type', width: 16 },                 // Col D: Type Box
    { key: 'stockAktual', width: 18 },          // Col E: Stock Aktual Internal
    { key: 'outQty', width: 12 },               // Col F: OUT
    { key: 'inQty', width: 12 },                // Col G: IN
    { key: 'stockSaatIni', width: 18 },         // Col H: Stock Saat Ini
    { key: 'ngSlot', width: 10 },               // Col I: NG Slot
    { key: 'ngKaki', width: 10 },               // Col J: NG Kaki
    { key: 'ngDinding', width: 10 },            // Col K: NG Dinding
    { key: 'ngRangka', width: 10 },             // Col L: NG Rangka
    { key: 'keterangan', width: 28 },           // Col M: Keterangan
  ];

  // =========================================================================
  // 1. TOP HEADER & TITLE BLOCK
  // =========================================================================
  worksheet.mergeCells('A1:D1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'PT STEEL PIPE INDUSTRY OF INDONESIA, Tbk';
  titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF064E3B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('A2:D2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = 'PLANT 1105 - UNIT 5 KARAWANG | WAREHOUSE SECTION';
  subtitleCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF475569' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  worksheet.mergeCells('E1:M2');
  const sheetTitleCell = worksheet.getCell('E1');
  sheetTitleCell.value = 'CHECK SHEET STOCK PACKAGING INTERNAL (RTP)';
  sheetTitleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0F172A' } };
  sheetTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheetTitleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }
  };
  sheetTitleCell.border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  // Row 3: Meta Info (Export Date & Filter)
  worksheet.mergeCells('A3:D3');
  const metaDateCell = worksheet.getCell('A3');
  metaDateCell.value = `Tanggal Export: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`;
  metaDateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  metaDateCell.alignment = { vertical: 'middle', horizontal: 'left' };

  if (customDateLabel) {
    worksheet.mergeCells('E3:M3');
    const filterMetaCell = worksheet.getCell('E3');
    filterMetaCell.value = `Periode Audit: ${customDateLabel}`;
    filterMetaCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
    filterMetaCell.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // Row 4: Blank spacer
  worksheet.getRow(4).height = 8;

  // =========================================================================
  // 2. TABLE HEADERS (ROWS 5 & 6) WITH DISTINCT THEMED COLORS
  // =========================================================================
  const HEADER_ROW_1 = 5;
  const HEADER_ROW_2 = 6;

  worksheet.getRow(HEADER_ROW_1).height = 24;
  worksheet.getRow(HEADER_ROW_2).height = 22;

  // Define Header Merges
  worksheet.mergeCells('A5:A6'); // No
  worksheet.mergeCells('B5:B6'); // Tgl Incoming
  worksheet.mergeCells('C5:C6'); // Customer
  worksheet.mergeCells('D5:D6'); // Type
  worksheet.mergeCells('E5:E6'); // Stock Aktual Internal
  worksheet.mergeCells('F5:F6'); // OUT
  worksheet.mergeCells('G5:G6'); // IN
  worksheet.mergeCells('H5:H6'); // Stock Saat Ini
  worksheet.mergeCells('I5:L5'); // Detail NG (Group)
  worksheet.mergeCells('M5:M6'); // Keterangan

  // Set Values
  worksheet.getCell('A5').value = 'No';
  worksheet.getCell('B5').value = 'Tgl Incoming';
  worksheet.getCell('C5').value = 'Customer';
  worksheet.getCell('D5').value = 'Type';
  worksheet.getCell('E5').value = 'Stock Aktual Internal';
  worksheet.getCell('F5').value = 'OUT';
  worksheet.getCell('G5').value = 'IN';
  worksheet.getCell('H5').value = 'Stock Saat ini';
  worksheet.getCell('I5').value = 'Detail NG';
  worksheet.getCell('I6').value = 'Slot';
  worksheet.getCell('J6').value = 'Kaki';
  worksheet.getCell('K6').value = 'Dinding';
  worksheet.getCell('L6').value = 'Rangka';
  worksheet.getCell('M5').value = 'Keterangan';

  // Color Palette Definitions
  const NAVY_DARK = 'FF0F2B48';     // Primary Dark Navy for standard headers
  const NAVY_SUB = 'FF1E3A8A';      // Navy for sub-headers
  const YELLOW_BG = 'FFFDE047';     // Bright Yellow for Stock Aktual
  const RED_BG = 'FFDC2626';        // Strong Red for OUT
  const BLUE_BG = 'FF0284C7';       // Cyan/Sky Blue for IN
  const GREEN_BG = 'FF059669';      // Emerald Green for Stock Saat Ini

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // Helper to style header cell
  const styleHeader = (cellRef: string, bgColor: string, fontColor: string = 'FFFFFFFF', isBold: boolean = true) => {
    const cell = worksheet.getCell(cellRef);
    cell.font = { name: 'Arial', size: 10, bold: isBold, color: { argb: fontColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.border = thinBorder;
  };

  // Apply styles to headers
  styleHeader('A5', NAVY_DARK);
  styleHeader('B5', NAVY_DARK);
  styleHeader('C5', NAVY_DARK);
  styleHeader('D5', NAVY_DARK);
  styleHeader('E5', YELLOW_BG, 'FF000000', true); // Yellow with Black text
  styleHeader('F5', RED_BG);                      // Red with White text
  styleHeader('G5', BLUE_BG);                     // Blue with White text
  styleHeader('H5', GREEN_BG);                    // Green with White text
  styleHeader('I5', NAVY_DARK);                   // Detail NG Header
  styleHeader('I6', NAVY_SUB);                    // Slot
  styleHeader('J6', NAVY_SUB);                    // Kaki
  styleHeader('K6', NAVY_SUB);                    // Dinding
  styleHeader('L6', NAVY_SUB);                    // Rangka
  styleHeader('M5', NAVY_DARK);                   // Keterangan

  // =========================================================================
  // 3. POPULATE DATA ROWS
  // =========================================================================
  let currentRow = 7;
  let totalStockAwal = 0;
  let totalOut = 0;
  let totalIn = 0;
  let totalStockSaatIni = 0;

  items.forEach((item, index) => {
    const row = worksheet.getRow(currentRow);
    row.height = 20;

    const stockAwal = Number(item.stockAktualInternal || 0);
    const outQty = Number(item.outQty || 0);
    const inQty = Number(item.inQty || 0);
    const stockSaatIni = Number(item.stockSaatIni || (stockAwal - outQty + inQty));

    totalStockAwal += stockAwal;
    totalOut += outQty;
    totalIn += inQty;
    totalStockSaatIni += stockSaatIni;

    // Col A: No
    row.getCell(1).value = index + 1;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col B: Tgl Incoming
    row.getCell(2).value = item.tglIncoming || '-';
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col C: Customer
    row.getCell(3).value = item.customer;
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(3).font = { name: 'Arial', size: 9.5, bold: true };

    // Col D: Type Box
    row.getCell(4).value = item.type;
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(4).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF065F46' } };

    // Col E: Stock Aktual Internal
    row.getCell(5).value = stockAwal;
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(5).numFmt = '#,##0';
    row.getCell(5).font = { name: 'Arial', size: 9.5, bold: true };

    // Col F: OUT (Red text if > 0)
    row.getCell(6).value = outQty > 0 ? outQty : '-';
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
    if (outQty > 0) {
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
    } else {
      row.getCell(6).font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } };
    }

    // Col G: IN (Blue text if > 0)
    row.getCell(7).value = inQty > 0 ? inQty : '-';
    row.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    if (inQty > 0) {
      row.getCell(7).numFmt = '#,##0';
      row.getCell(7).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF0284C7' } };
    } else {
      row.getCell(7).font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } };
    }

    // Col H: Stock Saat Ini (Emerald Bold)
    row.getCell(8).value = stockSaatIni;
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(8).numFmt = '#,##0';
    row.getCell(8).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF064E3B' } };
    row.getCell(8).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0FDF4' } // Light emerald tint
    };

    // NG Detail Helper
    const formatNG = (val: any) => (!val || val === '0' || val === '-' ? '-' : String(val));

    // Col I: Slot
    const slotVal = formatNG(item.detailNG?.slot);
    row.getCell(9).value = slotVal;
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    if (slotVal !== '-') row.getCell(9).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Col J: Kaki
    const kakiVal = formatNG(item.detailNG?.kaki);
    row.getCell(10).value = kakiVal;
    row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
    if (kakiVal !== '-') row.getCell(10).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Col K: Dinding
    const dindingVal = formatNG(item.detailNG?.dinding);
    row.getCell(11).value = dindingVal;
    row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
    if (dindingVal !== '-') row.getCell(11).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Col L: Rangka
    const rangkaVal = formatNG(item.detailNG?.rangka);
    row.getCell(12).value = rangkaVal;
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
    if (rangkaVal !== '-') row.getCell(12).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Col M: Keterangan
    row.getCell(13).value = item.keterangan || '-';
    row.getCell(13).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(13).font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

    // Apply borders to all columns in current row
    for (let c = 1; c <= 13; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    currentRow++;
  });

  // =========================================================================
  // 4. TOTAL SUMMARY ROW
  // =========================================================================
  worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
  const totalLabelCell = worksheet.getCell(`A${currentRow}`);
  totalLabelCell.value = `TOTAL KESELURUHAN (${items.length} ITEM)`;
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'center' };

  const totalRow = worksheet.getRow(currentRow);
  totalRow.height = 24;

  // Stock Awal Total
  totalRow.getCell(5).value = totalStockAwal;
  totalRow.getCell(5).numFmt = '#,##0';
  totalRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  totalRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

  // OUT Total
  totalRow.getCell(6).value = totalOut;
  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.getCell(6).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
  totalRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

  // IN Total
  totalRow.getCell(7).value = totalIn;
  totalRow.getCell(7).numFmt = '#,##0';
  totalRow.getCell(7).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0284C7' } };
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

  // Stock Saat Ini Total
  totalRow.getCell(8).value = totalStockSaatIni;
  totalRow.getCell(8).numFmt = '#,##0';
  totalRow.getCell(8).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF064E3B' } };
  totalRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };

  // Detail NG Summary & Keterangan
  worksheet.mergeCells(`I${currentRow}:M${currentRow}`);
  const ngSummaryCell = worksheet.getCell(`I${currentRow}`);
  ngSummaryCell.value = `Rekapitulasi Audit Fisik Packaging Unit 5 Karawang`;
  ngSummaryCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  ngSummaryCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Apply Total Row Styling & Double Bottom Border
  for (let c = 1; c <= 13; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F2B48' } },
      bottom: { style: 'double', color: { argb: 'FF0F2B48' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  }

  // =========================================================================
  // 5. SIGNATURE / APPROVAL SECTION AT BOTTOM
  // =========================================================================
  const signStartRow = currentRow + 3;
  worksheet.mergeCells(`B${signStartRow}:D${signStartRow}`);
  worksheet.getCell(`B${signStartRow}`).value = 'Dibuat Oleh (Auditor):';
  worksheet.getCell(`B${signStartRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
  worksheet.getCell(`B${signStartRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`J${signStartRow}:L${signStartRow}`);
  worksheet.getCell(`J${signStartRow}`).value = 'Diketahui Oleh (Section Head):';
  worksheet.getCell(`J${signStartRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
  worksheet.getCell(`J${signStartRow}`).alignment = { horizontal: 'center' };

  const signNameRow = signStartRow + 4;
  worksheet.mergeCells(`B${signNameRow}:D${signNameRow}`);
  worksheet.getCell(`B${signNameRow}`).value = '( ............................................ )';
  worksheet.getCell(`B${signNameRow}`).font = { name: 'Arial', size: 9.5 };
  worksheet.getCell(`B${signNameRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`J${signNameRow}:L${signNameRow}`);
  worksheet.getCell(`J${signNameRow}`).value = '( Ricky Satria )';
  worksheet.getCell(`J${signNameRow}`).font = { name: 'Arial', size: 9.5, bold: true };
  worksheet.getCell(`J${signNameRow}`).alignment = { horizontal: 'center' };

  // Generate and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const fileName = `Check_Sheet_Packaging_${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
