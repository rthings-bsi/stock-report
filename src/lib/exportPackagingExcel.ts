import * as ExcelJS from 'exceljs';
import { IncomingPackagingItem } from '../types/warehouse';
import {
  getStandarBuffer,
  getPackagingBufferStatus
} from './packagingMaster';

/**
 * Export Check Sheet Stock Packaging Internal to styled Excel (.xlsx)
 * Matching the exact visual style of SPINDO Check Sheet standard with Status indicator columns.
 */
export async function exportPackagingCheckSheet(
  items: IncomingPackagingItem[],
  customDateLabel?: string,
  bufferConfig?: Record<string, number>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPINDO Unit 5 Karawang';
  workbook.lastModifiedBy = 'Warehouse Audit System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Check Sheet Packaging', {
    views: [{ showGridLines: true }]
  });

  // Set Column Definitions & Widths (16 Columns)
  worksheet.columns = [
    { key: 'no', width: 6 },                   // Col A: No
    { key: 'tglIncoming', width: 14 },          // Col B: Tgl Incoming
    { key: 'customer', width: 34 },             // Col C: Customer
    { key: 'type', width: 16 },                 // Col D: Type Box
    { key: 'stockAktual', width: 16 },          // Col E: Stock Aktual Internal
    { key: 'outQty', width: 11 },               // Col F: OUT
    { key: 'inQty', width: 11 },                // Col G: IN
    { key: 'stockSaatIni', width: 16 },         // Col H: Stock Saat Ini
    { key: 'statusSurplus', width: 15 },        // Col I: ≥30% Dari Kebutuhan / Hari
    { key: 'statusSesuai', width: 15 },         // Col J: Qty Sesuai Kebutuhan / Hari
    { key: 'statusKurang', width: 15 },         // Col K: < Qty Kebutuhan / Hari
    { key: 'ngSlot', width: 9 },                // Col L: NG Slot
    { key: 'ngKaki', width: 9 },                // Col M: NG Kaki
    { key: 'ngDinding', width: 9 },             // Col N: NG Dinding
    { key: 'ngRangka', width: 9 },              // Col O: NG Rangka
    { key: 'keterangan', width: 26 },           // Col P: Keterangan
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

  worksheet.mergeCells('E1:P2');
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
    worksheet.mergeCells('E3:P3');
    const filterMetaCell = worksheet.getCell('E3');
    filterMetaCell.value = `Periode Audit: ${customDateLabel}`;
    filterMetaCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
    filterMetaCell.alignment = { vertical: 'middle', horizontal: 'right' };
  }

  // Row 4: Blank spacer
  worksheet.getRow(4).height = 8;

  // =========================================================================
  // 2. TABLE HEADERS (ROWS 5 & 6)
  // =========================================================================
  const HEADER_ROW_1 = 5;
  const HEADER_ROW_2 = 6;

  worksheet.getRow(HEADER_ROW_1).height = 24;
  worksheet.getRow(HEADER_ROW_2).height = 26;

  // Define Header Merges
  worksheet.mergeCells('A5:A6'); // No
  worksheet.mergeCells('B5:B6'); // Tgl Incoming
  worksheet.mergeCells('C5:C6'); // Customer
  worksheet.mergeCells('D5:D6'); // Type
  worksheet.mergeCells('E5:E6'); // Stock Aktual Internal
  worksheet.mergeCells('F5:F6'); // OUT
  worksheet.mergeCells('G5:G6'); // IN
  worksheet.mergeCells('H5:H6'); // Stock Saat Ini

  // Status Group Merge (Col I..K)
  worksheet.mergeCells('I5:K5'); // Status (Group)

  // Detail NG Group Merge (Col L..O)
  worksheet.mergeCells('L5:O5'); // Detail NG (Group)

  worksheet.mergeCells('P5:P6'); // Keterangan

  // Set Header Values
  worksheet.getCell('A5').value = 'No';
  worksheet.getCell('B5').value = 'Tgl Incoming';
  worksheet.getCell('C5').value = 'Customer';
  worksheet.getCell('D5').value = 'Type';
  worksheet.getCell('E5').value = 'Stock Aktual Internal';
  worksheet.getCell('F5').value = 'OUT';
  worksheet.getCell('G5').value = 'IN';
  worksheet.getCell('H5').value = 'Stock Saat ini';

  // Status Group & Sub-headers matching user spreadsheet
  worksheet.getCell('I5').value = 'Status';
  worksheet.getCell('I6').value = '≥30% Dari\nKebutuhan / Hari';
  worksheet.getCell('J6').value = 'Qty Sesuai\nKebutuhan / Hari';
  worksheet.getCell('K6').value = '< Qty Kebutuhan /\nHari';

  // Detail NG Group & Sub-headers
  worksheet.getCell('L5').value = 'Detail Temuan NG (Unit)';
  worksheet.getCell('L6').value = 'Slot';
  worksheet.getCell('M6').value = 'Kaki';
  worksheet.getCell('N6').value = 'Dinding';
  worksheet.getCell('O6').value = 'Rangka';

  worksheet.getCell('P5').value = 'Keterangan';

  // Color Palette Definitions
  const NAVY_DARK = 'FF0F2B48';     // Primary Dark Navy for standard headers
  const NAVY_SUB = 'FF1E3A8A';      // Navy for sub-headers
  const YELLOW_BG = 'FFFDE047';     // Bright Yellow for Stock Aktual
  const RED_BG = 'FFDC2626';        // Strong Red for OUT
  const BLUE_BG = 'FF0284C7';       // Cyan/Sky Blue for IN
  const GREEN_BG = 'FF059669';      // Emerald Green for Stock Saat Ini

  // Status Colors from user spreadsheet
  const STATUS_GREEN = 'FF00A859';  // Kelly Green (≥30% / Surplus)
  const STATUS_YELLOW = 'FFFACC15'; // Bright Lemon Yellow (Sesuai)
  const STATUS_RED = 'FFDC2626';    // Bright Red (< Qty)

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // Helper to style header cell
  const styleHeader = (cellRef: string, bgColor: string, fontColor: string = 'FFFFFFFF', isBold: boolean = true) => {
    const cell = worksheet.getCell(cellRef);
    cell.font = { name: 'Arial', size: 9.5, bold: isBold, color: { argb: fontColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.border = thinBorder;
  };

  // Apply styles to headers
  styleHeader('A5', NAVY_DARK);
  styleHeader('B5', NAVY_DARK);
  styleHeader('C5', NAVY_DARK);
  styleHeader('D5', NAVY_DARK);
  styleHeader('E5', YELLOW_BG, 'FF000000', true);
  styleHeader('F5', RED_BG);
  styleHeader('G5', BLUE_BG);
  styleHeader('H5', GREEN_BG);

  // Status Group Header & Sub-headers
  styleHeader('I5', NAVY_DARK);
  styleHeader('I6', STATUS_GREEN, 'FFFFFFFF', true);
  styleHeader('J6', STATUS_YELLOW, 'FF000000', true);
  styleHeader('K6', STATUS_RED, 'FFFFFFFF', true);

  // Detail NG Group Header & Sub-headers
  styleHeader('L5', NAVY_DARK);
  styleHeader('L6', NAVY_SUB);
  styleHeader('M6', NAVY_SUB);
  styleHeader('N6', NAVY_SUB);
  styleHeader('O6', NAVY_SUB);

  styleHeader('P5', NAVY_DARK);

  // =========================================================================
  // 3. POPULATE DATA ROWS
  // =========================================================================
  let currentRow = 7;
  let totalStockAwal = 0;
  let totalOut = 0;
  let totalIn = 0;
  let totalStockSaatIni = 0;
  let countSurplus = 0;
  let countSesuai = 0;
  let countDefisit = 0;

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
      fgColor: { argb: 'FFF0FDF4' }
    };

    // Calculate Buffer Status
    const std = getStandarBuffer(bufferConfig, item.customer, item.type);
    const status = getPackagingBufferStatus(stockSaatIni, std);

    // Reset status cells initially to blank
    for (let c = 9; c <= 11; c++) {
      row.getCell(c).value = '';
      row.getCell(c).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Col I (9): ≥30% / Surplus (Solid Kelly Green)
    if (status === 'SURPLUS') {
      countSurplus++;
      const cell = row.getCell(9);
      cell.value = '✓';
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_GREEN } };
    }

    // Col J (10): Sesuai / Pas (Solid Lemon Yellow)
    if (status === 'SESUAI') {
      countSesuai++;
      const cell = row.getCell(10);
      cell.value = '=';
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_YELLOW } };
    }

    // Col K (11): < Qty / Kurang (Solid Red)
    if (status === 'DEFISIT') {
      countDefisit++;
      const cell = row.getCell(11);
      cell.value = '✕';
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_RED } };
    }

    // NG Detail Helper
    const formatNG = (val: any) => (!val || val === '0' || val === '-' ? '-' : String(val));

    // Col L (12): Slot
    row.getCell(12).value = formatNG(item.detailNG?.slot);
    row.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col M (13): Kaki
    row.getCell(13).value = formatNG(item.detailNG?.kaki);
    row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col N (14): Dinding
    row.getCell(14).value = formatNG(item.detailNG?.dinding);
    row.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col O (15): Rangka
    row.getCell(15).value = formatNG(item.detailNG?.rangka);
    row.getCell(15).alignment = { vertical: 'middle', horizontal: 'center' };

    // Style NG cells with alert red if filled
    for (let c = 12; c <= 15; c++) {
      const cell = row.getCell(c);
      if (cell.value && cell.value !== '-') {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF991B1B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      } else {
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF94A3B8' } };
      }
    }

    // Col P (16): Keterangan
    row.getCell(16).value = item.keterangan || '-';
    row.getCell(16).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(16).font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

    // Apply borders to all 16 columns in current row
    for (let c = 1; c <= 16; c++) {
      const cell = row.getCell(c);
      cell.border = {
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

  // Status Summary Badges in Total Row
  totalRow.getCell(9).value = `${countSurplus} Box`;
  totalRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };

  totalRow.getCell(10).value = `${countSesuai} Box`;
  totalRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(10).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF854D0E' } };

  totalRow.getCell(11).value = `${countDefisit} Box`;
  totalRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
  totalRow.getCell(11).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF991B1B' } };

  // Detail NG Summary & Keterangan Merge (Col L..P)
  worksheet.mergeCells(`L${currentRow}:P${currentRow}`);
  const ngSummaryCell = worksheet.getCell(`L${currentRow}`);
  ngSummaryCell.value = `Rekapitulasi Audit Fisik Packaging Unit 5 Karawang`;
  ngSummaryCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  ngSummaryCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Apply Total Row Styling & Double Bottom Border
  for (let c = 1; c <= 16; c++) {
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

  worksheet.mergeCells(`M${signStartRow}:O${signStartRow}`);
  worksheet.getCell(`M${signStartRow}`).value = 'Diketahui Oleh (Section Head):';
  worksheet.getCell(`M${signStartRow}`).font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF334155' } };
  worksheet.getCell(`M${signStartRow}`).alignment = { horizontal: 'center' };

  const signNameRow = signStartRow + 4;
  worksheet.mergeCells(`B${signNameRow}:D${signNameRow}`);
  worksheet.getCell(`B${signNameRow}`).value = '( ............................................ )';
  worksheet.getCell(`B${signNameRow}`).font = { name: 'Arial', size: 9.5 };
  worksheet.getCell(`B${signNameRow}`).alignment = { horizontal: 'center' };

  worksheet.mergeCells(`M${signNameRow}:O${signNameRow}`);
  worksheet.getCell(`M${signNameRow}`).value = '( Ricky Satria )';
  worksheet.getCell(`M${signNameRow}`).font = { name: 'Arial', size: 9.5, bold: true };
  worksheet.getCell(`M${signNameRow}`).alignment = { horizontal: 'center' };

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
