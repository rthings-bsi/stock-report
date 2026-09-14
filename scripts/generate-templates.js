const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'templates');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const wb = XLSX.utils.book_new();

const guideRows = [
  {
    'No': 1,
    'Kategori': 'Stock Pipa (Termasuk NC, Slow & UNFIFO)',
    'Transaksi SAP': 'MB52 / ZPPSHSTOCK',
    'Kolom Wajib': 'SLOC, MATERIAL NUMBER, DESCRIPTION, TTL STOCK EOM / Berat, Unrestricted / Qty',
    'Catatan / Format Data': 'Data mencakup Pipa Normal, Slow Moving, Pipa NC, dan UNFIFO. (1) Penanda NC: PASG (GRADE C/E), BATCH akhiran 0C/0E, NO NC, CUST.REMARK. (2) Penanda Slow: PASM = SLOW. (3) Penanda UNFIFO: kolom UNFIFO diisi "UNFIFO" atau PASM = SLOW, serta deteksi otomatis selisih umur batch >= 90 hari.'
  },
  {
    'No': 2,
    'Kategori': 'Stock Coil & Strip (Termasuk UNFIFO Coil)',
    'Transaksi SAP': 'MB52 / ZMM_COIL',
    'Kolom Wajib': 'Material, Description, SLoc, Weight / Berat, Tebal, Lebar',
    'Catatan / Format Data': 'Kapasitas area penyimpanan bahan baku induk dan strip slitting. UNFIFO Coil terdeteksi jika kolom UNFIFO diisi "UNFIFO" atau PASM diisi "SLOW".'
  },
  {
    'No': 3,
    'Kategori': 'LOO Delivery Order',
    'Transaksi SAP': 'ZSD_LOO / VL06O',
    'Kolom Wajib': 'Material, Description, Kurang (KG) / Order (KG), Customer',
    'Catatan / Format Data': 'Menghitung fulfillment rate Short Term dan Long Term.'
  },
  {
    'No': 4,
    'Kategori': 'Packaging Rusak (RTP)',
    'Transaksi SAP': 'Sistem Scanner RTP',
    'Kolom Wajib': 'Package No., Serial No., Customer, Tgl Scan In, Kondisi',
    'Catatan / Format Data': 'Mendata temuan fisik kerusakan: Slot, Kaki, Rangka, Pengait, Dinding.'
  },
  {
    'No': 5,
    'Kategori': 'Incoming Packaging',
    'Transaksi SAP': 'Logbook Penerimaan',
    'Kolom Wajib': 'Tgl Incoming, Customer, Type, Stock Aktual Internal, IN, OUT',
    'Catatan / Format Data': 'Melacak pergerakan mutasi keluar-masuk dan sisa stok fisik kemasan returnable.'
  },
  {
    'No': 6,
    'Kategori': 'Progres NC & Repair',
    'Transaksi SAP': 'MB51 (Mvt 309, 261, 101)',
    'Kolom Wajib': 'Mat. Document, Movement Type, Posting Date, Material, Batch, Qty, Text',
    'Catatan / Format Data': 'Movement 309 = Masuk NC, 261 = Issue Repair (SPK), 101 = Hasil OK Prime.'
  }
];

const wsGuide = XLSX.utils.json_to_sheet(guideRows);
wsGuide['!cols'] = [{ wch: 6 }, { wch: 26 }, { wch: 24 }, { wch: 45 }, { wch: 70 }];
XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_Pengisian');

// Sheet 1: Stock Pipa (Memuat contoh Pipa Prime, NC Grade C, NC Grade E, Slow Moving, dan UNFIFO)
const pipeRows = [
  {
    'SLOC': '5A01',
    'MATERIAL NUMBER': 'X1B00AMA0220+60000',
    'DESCRIPTION': 'PIPA BULAT 19.1 x 2.2 x 6000',
    'PANJANG': 6000,
    'TTL STOCK EOM': 1250.50,
    'Unrestricted': 340,
    'BATCH': '5262911G0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'PT. CIPTA PERDANA LANCAR',
    'Inc.Date': '11.09.2026'
  },
  {
    'SLOC': '5K05',
    'MATERIAL NUMBER': 'X1B00AMA0220+60000',
    'DESCRIPTION': 'PIPA BULAT 19.1 x 2.2 x 6000',
    'PANJANG': 6000,
    'TTL STOCK EOM': 363.06,
    'Unrestricted': 66,
    'BATCH': '5262911G0E',
    'STATUS': 'WIP',
    'GRADE': 'Grade E',
    'PASG': 'GRADE E',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '227/NCR-SKF/VIII/2026',
    'CUST.REMARK': 'CACAT MATERIAL (OPEN)',
    'CUSTOMER': 'PT. CIPTA PERDANA LANCAR',
    'Inc.Date': '11.08.2026'
  },
  {
    'SLOC': '5K05',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000',
    'PANJANG': 6000,
    'TTL STOCK EOM': 450.00,
    'Unrestricted': 20,
    'BATCH': '5261820L0C',
    'STATUS': 'WIP',
    'GRADE': 'Grade C',
    'PASG': 'GRADE C',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '134/NCR-SKF/IX/2026',
    'CUST.REMARK': 'REPAIR BENGKOK CUTTING',
    'CUSTOMER': 'PT. ASTRA OTOPARTS',
    'Inc.Date': '01.09.2026'
  },
  {
    'SLOC': '5B02',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000',
    'PANJANG': 6000,
    'TTL STOCK EOM': 5420.00,
    'Unrestricted': 240,
    'BATCH': '4241020A0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'SLOW',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'FREE STOCK',
    'Inc.Date': '15.01.2024'
  },
  {
    'SLOC': '5C01',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000',
    'PANJANG': 6000,
    'TTL STOCK EOM': 1850.00,
    'Unrestricted': 80,
    'BATCH': '4231105A0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': 'UNFIFO',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'PT. TOYOTA MOTOR',
    'Inc.Date': '10.05.2025'
  }
];
const wsPipe = XLSX.utils.json_to_sheet(pipeRows);
wsPipe['!cols'] = [10, 24, 34, 12, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsPipe, 'Stock_Pipa');

// Sheet 2: Coil Strip (Termasuk penanda PASM dan UNFIFO)
const coilRows = [
  { 'SLOC': '5A01', 'Material': 'C00123901', 'Description': 'SPHC 2.00 x 1219 COIL RAW', 'Batch': '5261011A0B', 'Tebal': 2.00, 'Lebar': 1219, 'Weight': 4500.00, 'Kategori': 'Coil', 'PASM': 'FAST', 'UNFIFO': '' },
  { 'SLOC': '5B01', 'Material': 'S00123902', 'Description': 'SPHC 2.00 x 185 STRIP SLITTING', 'Batch': '5261011A0C', 'Tebal': 2.00, 'Lebar': 185, 'Weight': 1200.00, 'Kategori': 'Strip', 'PASM': 'FAST', 'UNFIFO': '' },
  { 'SLOC': '5A01', 'Material': 'C00123905', 'Description': 'SPHC 3.20 x 1219 COIL RAW', 'Batch': '4230815A01', 'Tebal': 3.20, 'Lebar': 1219, 'Weight': 7850.00, 'Kategori': 'Coil', 'PASM': 'SLOW', 'UNFIFO': 'UNFIFO' }
];
const wsCoil = XLSX.utils.json_to_sheet(coilRows);
wsCoil['!cols'] = [10, 18, 36, 16, 10, 10, 16, 12, 10, 12].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsCoil, 'Coil_Strip');

// Sheet 3: LOO
const looRows = [
  { 'Material': 'X1B00AMA0220+60000', 'Description': 'PIPA BULAT 19.1 x 2.2 x 6000', 'Kurang (KG)': 8500.00, 'Kurang (Btg)': 230, 'Customer': 'PT. ASTRA OTOPARTS', 'No LOO': 'LOO-2026-0891', 'Status': 'Open' },
  { 'Material': 'P1A00BOK0300+60000', 'Description': 'PIPA BULAT 48.6 x 3.0 x 6000', 'Kurang (KG)': 4200.00, 'Kurang (Btg)': 180, 'Customer': 'PT. INDOMOBIL SUKSES', 'No LOO': 'LOO-2026-0902', 'Status': 'Open' }
];
const wsLoo = XLSX.utils.json_to_sheet(looRows);
wsLoo['!cols'] = [24, 34, 16, 14, 28, 18, 12].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsLoo, 'LOO_Delivery');

// Sheet 4: Damaged Pkg
const damagedRows = [
  { 'Package No.': 'PKG-RTP-0012', 'Serial No.': 'SR-88219', 'Plant': '1105', 'Customer': 'PT. INDOMOBIL', 'Tgl Scan In': '11/09/2026', 'Jam Scan In': '08:30:00', 'Kondisi': 'NG', 'Slot': 'Rusak', 'Kaki': '-', 'Rangka': 'Bengkok', 'Pengait': '-', 'Dinding': 'Pecah', 'User Scan': 'GUDANGRTP01', 'Keterangan': 'Dinding retak terbentur forklift saat loading' }
];
const wsDamaged = XLSX.utils.json_to_sheet(damagedRows);
wsDamaged['!cols'] = [18, 16, 10, 26, 14, 14, 10, 10, 10, 12, 10, 12, 16, 36].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsDamaged, 'Packaging_Rusak');

// Sheet 5: Incoming Pkg
const incomingRows = [
  { 'Tgl Incoming': '11/09/2026', 'Customer': 'PT. ASTRA OTOPARTS', 'Type': 'BOX BESAR', 'Stock Aktual Internal': 150, 'OUT': 20, 'IN': 50, 'Stock Saat Ini': 180, 'Slot': 2, 'Kaki': 0, 'Dinding': 1, 'Rangka': 0, 'Keterangan': 'Penerimaan return dari customer' }
];
const wsIncoming = XLSX.utils.json_to_sheet(incomingRows);
wsIncoming['!cols'] = [14, 26, 16, 22, 10, 10, 16, 10, 10, 10, 10, 30].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsIncoming, 'Incoming_Packaging');

// Sheet 6: Progress NC
const ncRows = [
  { 'Mat. Document': '4912297808', 'Material Doc. Item': 1, 'Movement Type': 309, 'Posting Date': '11.09.2026', 'Entry Time': '07:55:39', 'Material': 'X1B00AMA0220+60000', 'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000', 'Storage Location': '5K05', 'Batch': '5262911G0E', 'Qty in Un. of Entry': 33, 'Quantity': 181.533, 'User Name': 'GUDANG11B', 'Order': '', 'Text': '227/NCR-SKF/VIII/2026 CACAT MATERIAL (OPEN)' },
  { 'Mat. Document': '4912300123', 'Material Doc. Item': 1, 'Movement Type': 261, 'Posting Date': '12.09.2026', 'Entry Time': '09:15:00', 'Material': 'X1B00AMA0220+60000', 'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000', 'Storage Location': '5K05', 'Batch': '5262911G0E', 'Qty in Un. of Entry': 33, 'Quantity': 181.533, 'User Name': 'REPAIR01', 'Order': '7001928', 'Text': 'PROSES REPAIR CUTTING ULANG' },
  { 'Mat. Document': '4912305541', 'Material Doc. Item': 1, 'Movement Type': 101, 'Posting Date': '13.09.2026', 'Entry Time': '14:20:10', 'Material': 'X1B00AMA0220+60000', 'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000', 'Storage Location': '5A01', 'Batch': '5262911G0E', 'Qty in Un. of Entry': 31, 'Quantity': 170.500, 'User Name': 'QC_FINAL', 'Order': '7001928', 'Text': 'SELESAI REPAIR PRIME OK' }
];
const wsNC = XLSX.utils.json_to_sheet(ncRows);
wsNC['!cols'] = [16, 18, 15, 14, 12, 24, 34, 16, 16, 18, 16, 16, 14, 38].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wb, wsNC, 'Progres_NC_MB51');

const fullPath = path.join(dir, 'Template_Upload_Data_Spindo_Full.xlsx');
try {
  XLSX.writeFile(wb, fullPath);
  console.log('Template created at:', fullPath);
} catch (err) {
  if (err.code === 'EBUSY') {
    const fallbackPath = path.join(dir, 'Template_Upload_Data_Spindo_Full_v2.xlsx');
    XLSX.writeFile(wb, fallbackPath);
    console.log('Original file locked in Excel. Template created at fallback:', fallbackPath);
  } else {
    throw err;
  }
}

// Dedicated single MB52 Workbook (Stock Pipa + Coil & Strip + UNFIFO + NC)
const wbMB52 = XLSX.utils.book_new();
const mb52GuideRows = [
  {
    'No': 1,
    'Transaksi SAP': 'MB52 / ZPPSHSTOCK',
    'Kategori Data': 'Stock Pipa (Prime, NC Grade C/E, Slow, & UNFIFO)',
    'Nama Sheet': 'Stock_Pipa',
    'Kolom Wajib': 'SLOC, MATERIAL NUMBER, DESCRIPTION, TTL STOCK EOM / Berat, Unrestricted / Qty',
    'Keterangan & Penanda': 'Satu file MB52 ini mencakup: (1) Normal Prime, (2) NC Grade C & E (kolom PASG / No NC / Remark), (3) Slow Moving (PASM = SLOW), (4) UNFIFO (kolom UNFIFO = "UNFIFO" atau PASM = SLOW).'
  },
  {
    'No': 2,
    'Transaksi SAP': 'MB52 / ZMM_COIL',
    'Kategori Data': 'Stock Coil & Strip Slitting (Termasuk UNFIFO Coil)',
    'Nama Sheet': 'Coil_Strip',
    'Kolom Wajib': 'Material, Description, SLoc, Weight / Berat, Tebal, Lebar',
    'Keterangan & Penanda': 'Bahan baku induk Coil dan Strip Slitting. UNFIFO Coil terdeteksi jika kolom UNFIFO = "UNFIFO" atau kolom PASM = "SLOW".'
  }
];
const wsMB52Guide = XLSX.utils.json_to_sheet(mb52GuideRows);
wsMB52Guide['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 38 }, { wch: 16 }, { wch: 45 }, { wch: 70 }];
XLSX.utils.book_append_sheet(wbMB52, wsMB52Guide, 'Petunjuk_MB52');

const wsMB52Pipe = XLSX.utils.json_to_sheet(pipeRows);
wsMB52Pipe['!cols'] = [10, 24, 34, 12, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wbMB52, wsMB52Pipe, 'Stock_Pipa');

const wsMB52Coil = XLSX.utils.json_to_sheet(coilRows);
wsMB52Coil['!cols'] = [10, 18, 36, 16, 10, 10, 16, 12, 10, 12].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wbMB52, wsMB52Coil, 'Coil_Strip');

const mb52Path = path.join(dir, 'Template_Upload_Stock_MB52.xlsx');
try {
  XLSX.writeFile(wbMB52, mb52Path);
  console.log('MB52 Template created at:', mb52Path);
} catch (err) {
  if (err.code === 'EBUSY') {
    const fallbackPath = path.join(dir, 'Template_Upload_Stock_MB52_v2.xlsx');
    XLSX.writeFile(wbMB52, fallbackPath);
    console.log('MB52 template fallback created at:', fallbackPath);
  } else {
    throw err;
  }
}

// 3. Dedicated 1-File 1-Sheet SAP zppshstock Workbook
const wbZppsh = XLSX.utils.book_new();
const zppshRows = [
  {
    'SLOC': '5A01',
    'MATERIAL NUMBER': 'X1B00AMA0220+60000',
    'DESCRIPTION': 'PIPA BULAT 19.1 x 2.2 x 6000 MP',
    'PANJANG': 6000,
    'TEBAL': 2.2,
    'LEBAR': '',
    'TTL STOCK EOM': 1250.50,
    'Unrestricted': 340,
    'BATCH': '5262911G0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'PT. CIPTA PERDANA LANCAR',
    'Inc.Date': '11.09.2026'
  },
  {
    'SLOC': '5K05',
    'MATERIAL NUMBER': 'X1B00AMA0220+60000',
    'DESCRIPTION': 'PIPA BULAT 19.1 x 2.2 x 6000',
    'PANJANG': 6000,
    'TEBAL': 2.2,
    'LEBAR': '',
    'TTL STOCK EOM': 363.06,
    'Unrestricted': 66,
    'BATCH': '5262911G0E',
    'STATUS': 'WIP',
    'GRADE': 'Grade E',
    'PASG': 'GRADE E',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '227/NCR-SKF/VIII/2026',
    'CUST.REMARK': 'CACAT MATERIAL (OPEN)',
    'CUSTOMER': 'PT. CIPTA PERDANA LANCAR',
    'Inc.Date': '11.08.2026'
  },
  {
    'SLOC': '5K05',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000',
    'PANJANG': 6000,
    'TEBAL': 3.0,
    'LEBAR': '',
    'TTL STOCK EOM': 450.00,
    'Unrestricted': 20,
    'BATCH': '5261820L0C',
    'STATUS': 'WIP',
    'GRADE': 'Grade C',
    'PASG': 'GRADE C',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '134/NCR-SKF/IX/2026',
    'CUST.REMARK': 'REPAIR BENGKOK CUTTING',
    'CUSTOMER': 'PT. ASTRA OTOPARTS',
    'Inc.Date': '01.09.2026'
  },
  {
    'SLOC': '5B02',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000 MP',
    'PANJANG': 6000,
    'TEBAL': 3.0,
    'LEBAR': '',
    'TTL STOCK EOM': 5420.00,
    'Unrestricted': 240,
    'BATCH': '4241020A0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'SLOW',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'FREE STOCK',
    'Inc.Date': '15.01.2024'
  },
  {
    'SLOC': '5C01',
    'MATERIAL NUMBER': 'P1A00BOK0300+60000',
    'DESCRIPTION': 'PIPA BULAT 48.6 x 3.0 x 6000 MP',
    'PANJANG': 6000,
    'TEBAL': 3.0,
    'LEBAR': '',
    'TTL STOCK EOM': 1850.00,
    'Unrestricted': 80,
    'BATCH': '4231105A0A',
    'STATUS': 'FG',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': 'UNFIFO',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'PT. TOYOTA MOTOR',
    'Inc.Date': '10.05.2025'
  },
  {
    'SLOC': '5A01',
    'MATERIAL NUMBER': 'C00123901',
    'DESCRIPTION': 'SPHC 2.00 x 1219 COIL RAW',
    'PANJANG': '',
    'TEBAL': 2.00,
    'LEBAR': 1219,
    'TTL STOCK EOM': 4500.00,
    'Unrestricted': 1,
    'BATCH': '5261011A0B',
    'STATUS': 'RAW',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'BAHAN BAKU',
    'Inc.Date': '11.09.2026'
  },
  {
    'SLOC': '5B01',
    'MATERIAL NUMBER': 'S00123902',
    'DESCRIPTION': 'SPHC 2.00 x 185 STRIP SLITTING',
    'PANJANG': '',
    'TEBAL': 2.00,
    'LEBAR': 185,
    'TTL STOCK EOM': 1200.00,
    'Unrestricted': 1,
    'BATCH': '5261011A0C',
    'STATUS': 'WIP',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'FAST',
    'UNFIFO': '',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'SLITTING',
    'Inc.Date': '11.09.2026'
  },
  {
    'SLOC': '5A01',
    'MATERIAL NUMBER': 'C00123905',
    'DESCRIPTION': 'SPHC 3.20 x 1219 COIL RAW',
    'PANJANG': '',
    'TEBAL': 3.20,
    'LEBAR': 1219,
    'TTL STOCK EOM': 7850.00,
    'Unrestricted': 1,
    'BATCH': '4230815A01',
    'STATUS': 'RAW',
    'GRADE': 'Prime',
    'PASG': 'PRIME',
    'PASM': 'SLOW',
    'UNFIFO': 'UNFIFO',
    'NO NC': '',
    'CUST.REMARK': '',
    'CUSTOMER': 'BAHAN BAKU',
    'Inc.Date': '15.08.2023'
  }
];

const wsZppsh = XLSX.utils.json_to_sheet(zppshRows);
wsZppsh['!cols'] = [10, 24, 34, 12, 10, 10, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14].map(w => ({ wch: w }));
XLSX.utils.book_append_sheet(wbZppsh, wsZppsh, 'zppshstock');

const zppshPath = path.join(dir, 'Template_Upload_Stock_zppshstock.xlsx');
try {
  XLSX.writeFile(wbZppsh, zppshPath);
  console.log('zppshstock Template created at:', zppshPath);
} catch (err) {
  if (err.code === 'EBUSY') {
    const fallbackPath = path.join(dir, 'Template_Upload_Stock_zppshstock_v2.xlsx');
    XLSX.writeFile(wbZppsh, fallbackPath);
    console.log('zppshstock template fallback created at:', fallbackPath);
  } else {
    throw err;
  }
}
