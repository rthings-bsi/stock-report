/**
 * Master Data Customer & Type Box Packaging (RTP)
 * Sumber: Standar Master Database Packaging Spindo Unit 5 Karawang
 */

export const PACKAGING_CUSTOMER_BOX_MASTER: Record<string, string[]> = {
  'PT ASTEMO MANUFACTURING': ['IDBM A', 'IDBM-B'],
  'PT BERDIKARI METAL ENGINERING': ['BDK0 A'],
  'PT CHANDRA NUGERAH CEMERLANG': ['CNC HC', 'CNC0 C'],
  'PT CHANDRA NUGERAH CIPTA': ['CNCT A', 'CNCT B', 'CNCT C'],
  'PT DAYA PRESINDO UTAMA': ['DPU A'],
  'PT DHARMA POLIMETAL TBK': ['1-DPM0-B', '1-DPM0-H', '1-DPM0-I', '1-DPM0-K', '1-DPM0-L'],
  'PT INDOMAS WAHANA NUSANTARA': ['IDMS A'],
  'PT INTI POLYMETAL': ['IPM A'],
  'PT SAKURA HEI': ['SKR0 A'],
  'PT TRIMITRA CHITRA MUSTIKA': ['TCM 0 A (PALLET)'],
  'PT YAMAHA INDONESIA MFG': [
    'YMPG A',
    'YMPG B',
    'YMPG C',
    'YMWJ A',
    'YMWJ B',
    'YMWJ C',
    'YMWJ D',
    'YMWJ E',
    'YMWJ F',
    'YMWJ G'
  ],
  'PT CIPTA NISSIN INDONESIA': ['CNI A'],
  'PT SEC INDONESIA': ['SEC A'],
  'PT SEOUL PRESS INDONESIA': ['SPI A'],
  'PT KAYABA INDONESIA': ['(PB) KYB A'],
  'PT TRI CENTRUM': ['TCF A'],
  'PT CIPTA PERDANA LANCAR': ['CPL A']
};

export const MASTER_CUSTOMERS = Object.keys(PACKAGING_CUSTOMER_BOX_MASTER).sort();

export function getBoxTypesForCustomer(customerName: string): string[] {
  if (!customerName) return [];
  const trimmed = customerName.trim();
  // Exact match
  if (PACKAGING_CUSTOMER_BOX_MASTER[trimmed]) {
    return PACKAGING_CUSTOMER_BOX_MASTER[trimmed];
  }
  // Case-insensitive match
  const foundKey = Object.keys(PACKAGING_CUSTOMER_BOX_MASTER).find(
    (k) => k.toLowerCase() === trimmed.toLowerCase()
  );
  if (foundKey) {
    return PACKAGING_CUSTOMER_BOX_MASTER[foundKey];
  }
  return [];
}

/**
 * Key format untuk identifikasi unik tipe box per customer:
 * Format: `${customer}___${type}`
 */
export function getBufferStockKey(customer: string, type: string): string {
  return `${(customer || '').trim()}___${(type || '').trim()}`;
}

/**
 * Default Standar Kebutuhan / Buffer Stock per Hari (RTP)
 * Berdasarkan volume rata-rata ritase harian Spindo Unit 5 Karawang
 */
export const DEFAULT_PACKAGING_BUFFER_STOCK: Record<string, number> = {
  'PT ASTEMO MANUFACTURING___IDBM A': 120,
  'PT ASTEMO MANUFACTURING___IDBM-B': 80,
  'PT BERDIKARI METAL ENGINERING___BDK0 A': 10,
  'PT SAKURA HEI___SKR0 A': 1,
  'PT INTI POLYMETAL___IPM A': 1,
  'PT TRIMITRA CHITRA MUSTIKA___TCM 0 A (PALLET)': 2,
  'PT CHANDRA NUGERAH CEMERLANG___CNC HC': 90,
  'PT CHANDRA NUGERAH CEMERLANG___CNC0 C': 60,
  'PT CHANDRA NUGERAH CIPTA___CNCT A': 150,
  'PT CHANDRA NUGERAH CIPTA___CNCT B': 100,
  'PT CHANDRA NUGERAH CIPTA___CNCT C': 80,
  'PT DAYA PRESINDO UTAMA___DPU A': 100,
  'PT DHARMA POLIMETAL TBK___1-DPM0-B': 140,
  'PT DHARMA POLIMETAL TBK___1-DPM0-H': 100,
  'PT DHARMA POLIMETAL TBK___1-DPM0-I': 80,
  'PT DHARMA POLIMETAL TBK___1-DPM0-K': 120,
  'PT DHARMA POLIMETAL TBK___1-DPM0-L': 90,
  'PT INDOMAS WAHANA NUSANTARA___IDMS A': 100,
  'PT YAMAHA INDONESIA MFG___YMPG A': 200,
  'PT YAMAHA INDONESIA MFG___YMPG B': 180,
  'PT YAMAHA INDONESIA MFG___YMPG C': 150,
  'PT YAMAHA INDONESIA MFG___YMWJ A': 160,
  'PT YAMAHA INDONESIA MFG___YMWJ B': 140,
  'PT YAMAHA INDONESIA MFG___YMWJ C': 120,
  'PT YAMAHA INDONESIA MFG___YMWJ D': 100,
  'PT YAMAHA INDONESIA MFG___YMWJ E': 80,
  'PT YAMAHA INDONESIA MFG___YMWJ F': 100,
  'PT YAMAHA INDONESIA MFG___YMWJ G': 90,
  'PT CIPTA NISSIN INDONESIA___CNI A': 100,
  'PT SEC INDONESIA___SEC A': 100,
  'PT SEOUL PRESS INDONESIA___SPI A': 90,
  'PT KAYABA INDONESIA___(PB) KYB A': 120,
  'PT TRI CENTRUM___TCF A': 100,
  'PT CIPTA PERDANA LANCAR___CPL A': 100
};

export type PackagingBufferStatus = 'SURPLUS' | 'SESUAI' | 'DEFISIT';

/**
 * Logika Penentuan Status Buffer Stock Packaging:
 * - SURPLUS (Hijau) : Stock saat ini ≥ 200% dari kebutuhan per hari
 * - SESUAI  (Kuning): Stock saat ini sesuai kebutuhan per hari (100% - 199%)
 * - DEFISIT (Merah) : Stock saat ini kurang dari kebutuhan per hari (< 100%)
 */
export function getPackagingBufferStatus(stock: number, standar: number): PackagingBufferStatus {
  if (standar <= 0) return 'SESUAI';
  const ratio = stock / standar;
  if (ratio >= 2) return 'SURPLUS';
  if (ratio >= 1) return 'SESUAI';
  return 'DEFISIT';
}

/**
 * Mengambil nilai standar buffer stock dari konfigurasi user,
 * dengan fallback ke default master data atau angka 10 jika belum terdaftar.
 */
export function getStandarBuffer(
  config: Record<string, number> | undefined,
  customer: string,
  type: string,
  overrideQty?: number
): number {
  if (overrideQty !== undefined && overrideQty !== null && overrideQty > 0) {
    return overrideQty;
  }
  const key = getBufferStockKey(customer, type);
  if (config && config[key] !== undefined && config[key] !== null) {
    return Number(config[key]);
  }
  if (DEFAULT_PACKAGING_BUFFER_STOCK[key] !== undefined) {
    return DEFAULT_PACKAGING_BUFFER_STOCK[key];
  }
  return 10;
}
