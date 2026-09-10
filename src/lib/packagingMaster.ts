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
