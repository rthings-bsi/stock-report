import * as XLSX from 'xlsx';

export type TemplateCategory =
  | 'zppshstock'
  | 'pipe'
  | 'coil'
  | 'stock_mb52'
  | 'loo'
  | 'damaged_pkg'
  | 'incoming_pkg'
  | 'progress_nc';

export interface TemplateDefinition {
  id: TemplateCategory;
  sheetName: string;
  filename: string;
  title: string;
  sourceTx: string;
  description: string;
  headers: string[];
  samples: Record<string, unknown>[];
  columnWidths: number[];
}

export const TEMPLATE_DEFINITIONS: Record<TemplateCategory, TemplateDefinition> = {
  zppshstock: {
    id: 'zppshstock',
    sheetName: 'zppshstock',
    filename: 'Template_Upload_Stock_zppshstock.xlsx',
    title: 'Template Raw Stock SAP (zppshstock)',
    sourceTx: 'SAP zppshstock',
    description: 'Format data inventory terpadu 1 file zppshstock (Pipa Finish Goods, WIP, Pipa NC, Slow Moving, UNFIFO Pipa & Bahan Baku Coil/Strip)',
    headers: [
      'SLOC',
      'MATERIAL NUMBER',
      'DESCRIPTION',
      'PANJANG',
      'TEBAL',
      'LEBAR',
      'TTL STOCK EOM',
      'Unrestricted',
      'BATCH',
      'STATUS',
      'GRADE',
      'PASG',
      'PASM',
      'UNFIFO',
      'NO NC',
      'CUST.REMARK',
      'CUSTOMER',
      'Inc.Date'
    ],
    samples: [
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
    ],
    columnWidths: [10, 24, 34, 12, 10, 10, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14]
  },
  pipe: {
    id: 'pipe',
    sheetName: 'Stock_Pipa',
    filename: 'Template_Upload_Stock_Pipa.xlsx',
    title: 'Template Data Stock Pipa (Termasuk Pipa NC, Slow Moving & UNFIFO)',
    sourceTx: 'SAP MB52 / ZPPSHSTOCK',
    description: 'Format data inventory pipa finish goods, WIP, pipa NC, slow moving, serta status UNFIFO per gudang',
    headers: [
      'SLOC',
      'MATERIAL NUMBER',
      'DESCRIPTION',
      'PANJANG',
      'TTL STOCK EOM',
      'Unrestricted',
      'BATCH',
      'STATUS',
      'GRADE',
      'PASG',
      'PASM',
      'UNFIFO',
      'NO NC',
      'CUST.REMARK',
      'CUSTOMER',
      'Inc.Date'
    ],
    samples: [
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
    ],
    columnWidths: [10, 24, 34, 12, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14]
  },

  coil: {
    id: 'coil',
    sheetName: 'Coil_Strip',
    filename: 'Template_Upload_Coil_Strip.xlsx',
    title: 'Template Data Stock Coil & Strip (Termasuk UNFIFO Coil)',
    sourceTx: 'SAP MB52 / ZMM_COIL',
    description: 'Format data inventory bahan baku induk coil, strip slitting, dan status UNFIFO/PASM',
    headers: [
      'SLOC',
      'Material',
      'Description',
      'Batch',
      'Tebal',
      'Lebar',
      'Weight',
      'Kategori',
      'PASM',
      'UNFIFO'
    ],
    samples: [
      {
        'SLOC': '5A01',
        'Material': 'C00123901',
        'Description': 'SPHC 2.00 x 1219 COIL RAW',
        'Batch': '5261011A0B',
        'Tebal': 2.00,
        'Lebar': 1219,
        'Weight': 4500.00,
        'Kategori': 'Coil',
        'PASM': 'FAST',
        'UNFIFO': ''
      },
      {
        'SLOC': '5B01',
        'Material': 'S00123902',
        'Description': 'SPHC 2.00 x 185 STRIP SLITTING',
        'Batch': '5261011A0C',
        'Tebal': 2.00,
        'Lebar': 185,
        'Weight': 1200.00,
        'Kategori': 'Strip',
        'PASM': 'FAST',
        'UNFIFO': ''
      },
      {
        'SLOC': '5A01',
        'Material': 'C00123905',
        'Description': 'SPHC 3.20 x 1219 COIL RAW',
        'Batch': '4230815A01',
        'Tebal': 3.20,
        'Lebar': 1219,
        'Weight': 7850.00,
        'Kategori': 'Coil',
        'PASM': 'SLOW',
        'UNFIFO': 'UNFIFO'
      }
    ],
    columnWidths: [10, 18, 36, 16, 10, 10, 16, 12, 10, 12]
  },

  loo: {
    id: 'loo',
    sheetName: 'LOO_Delivery',
    filename: 'Template_Upload_LOO_Delivery.xlsx',
    title: 'Template Data LOO & Delivery Order',
    sourceTx: 'SAP ZSD_LOO / VL06O',
    description: 'Format data outstanding order pemesanan pipa (Short Term & Long Term)',
    headers: [
      'Material',
      'Description',
      'Kurang (KG)',
      'Kurang (Btg)',
      'Customer',
      'No LOO',
      'Status'
    ],
    samples: [
      {
        'Material': 'X1B00AMA0220+60000',
        'Description': 'PIPA BULAT 19.1 x 2.2 x 6000',
        'Kurang (KG)': 8500.00,
        'Kurang (Btg)': 230,
        'Customer': 'PT. ASTRA OTOPARTS',
        'No LOO': 'LOO-2026-0891',
        'Status': 'Open'
      },
      {
        'Material': 'P1A00BOK0300+60000',
        'Description': 'PIPA BULAT 48.6 x 3.0 x 6000',
        'Kurang (KG)': 4200.00,
        'Kurang (Btg)': 180,
        'Customer': 'PT. INDOMOBIL SUKSES',
        'No LOO': 'LOO-2026-0902',
        'Status': 'Open'
      }
    ],
    columnWidths: [24, 34, 16, 14, 28, 18, 12]
  },

  damaged_pkg: {
    id: 'damaged_pkg',
    sheetName: 'Packaging_Rusak',
    filename: 'Template_Upload_Packaging_Rusak.xlsx',
    title: 'Template Data Packaging Rusak (RTP)',
    sourceTx: 'Sistem RTP / Form Afkir',
    description: 'Format rekap data identifikasi dan scan packaging/RTP yang rusak',
    headers: [
      'Package No.',
      'Serial No.',
      'Plant',
      'Customer',
      'Tgl Scan In',
      'Jam Scan In',
      'Kondisi',
      'Slot',
      'Kaki',
      'Rangka',
      'Pengait',
      'Dinding',
      'User Scan',
      'Keterangan'
    ],
    samples: [
      {
        'Package No.': 'PKG-RTP-0012',
        'Serial No.': 'SR-88219',
        'Plant': '1105',
        'Customer': 'PT. INDOMOBIL',
        'Tgl Scan In': '11/09/2026',
        'Jam Scan In': '08:30:00',
        'Kondisi': 'NG',
        'Slot': 'Rusak',
        'Kaki': '-',
        'Rangka': 'Bengkok',
        'Pengait': '-',
        'Dinding': 'Pecah',
        'User Scan': 'GUDANGRTP01',
        'Keterangan': 'Dinding retak terbentur forklift saat loading'
      }
    ],
    columnWidths: [18, 16, 10, 26, 14, 14, 10, 10, 10, 12, 10, 12, 16, 36]
  },

  incoming_pkg: {
    id: 'incoming_pkg',
    sheetName: 'Incoming_Packaging',
    filename: 'Template_Upload_Incoming_Packaging.xlsx',
    title: 'Template Data Penerimaan Packaging Masuk',
    sourceTx: 'Logbook Incoming Packaging',
    description: 'Format rekap pergerakan masuk, keluar, dan sisa stock packaging returnable',
    headers: [
      'Tgl Incoming',
      'Customer',
      'Type',
      'Stock Aktual Internal',
      'OUT',
      'IN',
      'Stock Saat Ini',
      'Slot',
      'Kaki',
      'Dinding',
      'Rangka',
      'Keterangan'
    ],
    samples: [
      {
        'Tgl Incoming': '11/09/2026',
        'Customer': 'PT. ASTRA OTOPARTS',
        'Type': 'BOX BESAR',
        'Stock Aktual Internal': 150,
        'OUT': 20,
        'IN': 50,
        'Stock Saat Ini': 180,
        'Slot': 2,
        'Kaki': 0,
        'Dinding': 1,
        'Rangka': 0,
        'Keterangan': 'Penerimaan return dari customer'
      }
    ],
    columnWidths: [14, 26, 16, 22, 10, 10, 16, 10, 10, 10, 10, 30]
  },

  progress_nc: {
    id: 'progress_nc',
    sheetName: 'Progres_NC_MB51',
    filename: 'Template_Upload_Progres_NC_MB51.xlsx',
    title: 'Template Mutasi Progres NC & Repair',
    sourceTx: 'SAP MB51 (Movement 309, 261, 101)',
    description: 'Format pergerakan material NC: Masuk NC (309), Keluar Repair (261), Hasil Prime (101)',
    headers: [
      'Mat. Document',
      'Material Doc. Item',
      'Movement Type',
      'Posting Date',
      'Entry Time',
      'Material',
      'Material Description',
      'Storage Location',
      'Batch',
      'Qty in Un. of Entry',
      'Quantity',
      'User Name',
      'Order',
      'Text'
    ],
    samples: [
      {
        'Mat. Document': '4912297808',
        'Material Doc. Item': 1,
        'Movement Type': 309,
        'Posting Date': '11.09.2026',
        'Entry Time': '07:55:39',
        'Material': 'X1B00AMA0220+60000',
        'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000',
        'Storage Location': '5K05',
        'Batch': '5262911G0E',
        'Qty in Un. of Entry': 33,
        'Quantity': 181.533,
        'User Name': 'GUDANG11B',
        'Order': '',
        'Text': '227/NCR-SKF/VIII/2026 CACAT MATERIAL (OPEN)'
      },
      {
        'Mat. Document': '4912300123',
        'Material Doc. Item': 1,
        'Movement Type': 261,
        'Posting Date': '12.09.2026',
        'Entry Time': '09:15:00',
        'Material': 'X1B00AMA0220+60000',
        'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000',
        'Storage Location': '5K05',
        'Batch': '5262911G0E',
        'Qty in Un. of Entry': 33,
        'Quantity': 181.533,
        'User Name': 'REPAIR01',
        'Order': '7001928',
        'Text': 'PROSES REPAIR CUTTING ULANG'
      },
      {
        'Mat. Document': '4912305541',
        'Material Doc. Item': 1,
        'Movement Type': 101,
        'Posting Date': '13.09.2026',
        'Entry Time': '14:20:10',
        'Material': 'X1B00AMA0220+60000',
        'Material Description': 'PIPA BULAT 19.1 x 2.2 x 6000',
        'Storage Location': '5A01',
        'Batch': '5262911G0E',
        'Qty in Un. of Entry': 31,
        'Quantity': 170.500,
        'User Name': 'QC_FINAL',
        'Order': '7001928',
        'Text': 'SELESAI REPAIR PRIME OK'
      }
    ],
    columnWidths: [16, 18, 15, 14, 12, 24, 34, 16, 16, 18, 16, 16, 14, 38]
  },

  stock_mb52: {
    id: 'stock_mb52',
    sheetName: 'Stock_Pipa',
    filename: 'Template_Upload_Stock_MB52.xlsx',
    title: 'Template Terpadu SAP MB52 (Pipa, Coil, UNFIFO, NC)',
    sourceTx: 'SAP MB52',
    description: 'Format data inventory terpadu MB52: Stock Pipa (Prime, NC, Slow, UNFIFO) dan Coil & Strip',
    headers: [
      'SLOC',
      'MATERIAL NUMBER',
      'DESCRIPTION',
      'PANJANG',
      'TTL STOCK EOM',
      'Unrestricted',
      'BATCH',
      'STATUS',
      'GRADE',
      'PASG',
      'PASM',
      'UNFIFO',
      'NO NC',
      'CUST.REMARK',
      'CUSTOMER',
      'Inc.Date'
    ],
    samples: [],
    columnWidths: [10, 24, 34, 12, 16, 14, 16, 12, 12, 12, 10, 12, 24, 30, 30, 14]
  }
};

/**
 * Petunjuk pengisian untuk sheet pertama
 */
const INSTRUCTION_ROWS = [
  {
    'No': 1,
    'Kategori': 'Stock Pipa (Termasuk NC, Slow & UNFIFO)',
    'Transaksi SAP': 'MB52 / ZPPSHSTOCK',
    'Kolom Wajib': 'SLOC, MATERIAL NUMBER, DESCRIPTION, TTL STOCK EOM / Berat, Unrestricted / Qty',
    'Catatan / Format Data': 'Mencakup Pipa Normal, Slow Moving, Pipa NC, dan UNFIFO. (1) NC: kolom PASG (GRADE C/E/NC), BATCH akhiran 0C/0E, NO NC, CUST.REMARK. (2) Slow Moving: PASM = SLOW. (3) UNFIFO: kolom UNFIFO = "UNFIFO" atau PASM = SLOW, serta deteksi otomatis selisih umur batch >= 90 hari.'
  },
  {
    'No': 2,
    'Kategori': 'Stock Coil & Strip (Termasuk UNFIFO Coil)',
    'Transaksi SAP': 'MB52 / ZMM_COIL',
    'Kolom Wajib': 'Material, Description, SLoc, Weight / Berat, Tebal, Lebar',
    'Catatan / Format Data': 'Kapasitas area penyimpanan coil induk & strip slitting. UNFIFO Coil terdeteksi jika kolom UNFIFO = "UNFIFO" atau kolom PASM = "SLOW" / non-FAST.'
  },
  {
    'No': 3,
    'Kategori': 'LOO Delivery Order',
    'Transaksi SAP': 'ZSD_LOO / VL06O',
    'Kolom Wajib': 'Material, Description, Kurang (KG) / Order (KG), Customer',
    'Catatan / Format Data': 'Dipadankan dengan stock real-time untuk menghitung fulfillment rate Short Term dan Long Term.'
  },
  {
    'No': 4,
    'Kategori': 'Packaging Rusak (RTP)',
    'Transaksi SAP': 'Sistem Scanner RTP',
    'Kolom Wajib': 'Package No., Serial No., Customer, Tgl Scan In, Kondisi',
    'Catatan / Format Data': 'Mendata temuan fisik kerusakan kemasan: Slot, Kaki, Rangka, Pengait, Dinding.'
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
    'Catatan / Format Data': 'Movement 309 = Masuk NC, 261 = Issue Repair (SPK), 101 = Hasil OK Prime. Format NCR diekstrak dari kolom Text.'
  }
];

/**
 * Buat workbook Excel lengkap yang memuat semua kategori
 */
export function generateFullTemplateWorkbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Petunjuk Pengisian
  const wsGuide = XLSX.utils.json_to_sheet(INSTRUCTION_ROWS);
  wsGuide['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 24 }, { wch: 45 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_Pengisian');

  // 2. Masing-masing sheet kategori
  const categories: TemplateCategory[] = ['pipe', 'coil', 'loo', 'damaged_pkg', 'incoming_pkg', 'progress_nc'];
  categories.forEach((cat) => {
    const def = TEMPLATE_DEFINITIONS[cat];
    const ws = XLSX.utils.json_to_sheet(def.samples);
    ws['!cols'] = def.columnWidths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, def.sheetName);
  });

  return wb;
}

/**
 * Buat workbook untuk 1 kategori spesifik
 */
export function generateSingleCategoryWorkbook(category: TemplateCategory): XLSX.WorkBook {
  const def = TEMPLATE_DEFINITIONS[category];
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(def.samples);
  ws['!cols'] = def.columnWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, def.sheetName);

  return wb;
}

/**
 * Buat workbook gabungan khusus SAP MB52: Stock Pipa + Coil & Strip + UNFIFO + Stock NC
 */
export function generateStockMB52Workbook(): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. Petunjuk pengisian khusus MB52
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
  const wsGuide = XLSX.utils.json_to_sheet(mb52GuideRows);
  wsGuide['!cols'] = [{ wch: 6 }, { wch: 20 }, { wch: 38 }, { wch: 16 }, { wch: 45 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk_MB52');

  // 2. Sheet Stock_Pipa
  const pipeDef = TEMPLATE_DEFINITIONS.pipe;
  const wsPipe = XLSX.utils.json_to_sheet(pipeDef.samples);
  wsPipe['!cols'] = pipeDef.columnWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsPipe, 'Stock_Pipa');

  // 3. Sheet Coil_Strip
  const coilDef = TEMPLATE_DEFINITIONS.coil;
  const wsCoil = XLSX.utils.json_to_sheet(coilDef.samples);
  wsCoil['!cols'] = coilDef.columnWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsCoil, 'Coil_Strip');

  return wb;
}

/**
 * Buat workbook Excel 1 file 1 sheet untuk raw data export SAP zppshstock
 * Mencakup Pipa (FG/WIP), Pipa NC (Grade C & E), Slow Moving, UNFIFO Pipa,
 * serta Bahan Baku Induk Coil & Strip Slitting dalam 1 sheet terpadu.
 */
export function generateZppshstockWorkbook(): XLSX.WorkBook {
  const def = TEMPLATE_DEFINITIONS.zppshstock;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(def.samples);
  ws['!cols'] = def.columnWidths.map((w) => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, def.sheetName);
  return wb;
}

/**
 * Download template 1 file terpadu SAP zppshstock
 */
export function downloadZppshstockTemplate(filename = 'Template_Upload_Stock_zppshstock.xlsx'): void {
  const wb = generateZppshstockWorkbook();
  downloadExcelWorkbook(wb, filename);
}

/**
 * Download workbook ke browser
 */
export function downloadExcelWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}

/**
 * Download template terpadu SAP MB52 / zppshstock
 */
export function downloadStockMB52Template(filename = 'Template_Upload_Stock_zppshstock.xlsx'): void {
  downloadZppshstockTemplate(filename);
}

/**
 * Download template lengkap semua kategori
 */
export function downloadAllTemplates(filename = 'Template_Upload_Data_Spindo_Full.xlsx'): void {
  const wb = generateFullTemplateWorkbook();
  downloadExcelWorkbook(wb, filename);
}

/**
 * Download template spesifik per kategori.
 * Untuk kategori zppshstock, pipe, dan coil, otomatis mengunduh template 1 file zppshstock.
 */
export function downloadCategoryTemplate(category: TemplateCategory): void {
  if (category === 'zppshstock' || category === 'pipe' || category === 'coil' || category === 'stock_mb52') {
    downloadZppshstockTemplate();
    return;
  }
  const def = TEMPLATE_DEFINITIONS[category];
  const wb = generateSingleCategoryWorkbook(category);
  downloadExcelWorkbook(wb, def.filename);
}
