export interface WarehousePipeCapacity {
  gudang: string;
  kapasitas: number;
  stock: number;
  persenTerisi: number;
  selisih: number;
  wipLt: number;
  fgLt: number;
  wipSt: number;
  fgSt: number;
  customerStock: number;
  freeStock: number;
  persenFreeStock: number;
}

export interface FastSlowPipe {
  gudang: string;
  fastTon: number;
  fastPersen: number;
  slowTon: number;
  slowPersen: number;
  totalTon: number;
  fgLtSlow: number;
  fgStSlow: number;
  wipLtSlow: number;
  wipStSlow: number;
  yearlySlowTon?: Record<string, number>;
}

export interface CoilStripArea {
  gudang: string;
  area: string;
  coilQty: number;
  coilTon: number;
  stripQty: number;
  stripTon: number;
  totalQty: number;
  totalTon: number;
  kapasitas: number;
  persenTerisi: number;
}

export interface PipeNCWarehouse {
  gudang: string;
  prime: number;
  gradeE: number;
  gradeC: number;
  persenGradeE: number;
  primeLt?: number;
  primeSt?: number;
  gradeELt?: number;
  gradeESt?: number;
  gradeCLt?: number;
  gradeCSt?: number;
}

export interface PipeNCItem {
  id: string;
  gudang: string;
  ukuran: string;
  customer: string;
  kodeMaterial: string;
  type: 'LT' | 'ST';
  grade: string;
  fgTon: number;
  wipTon: number;
  totalTon: number;
  remarks: string;
  noNC?: string;
}

export interface LooComparisonItem {
  no: number;
  gudang?: string;
  gudangs?: string[];
  customer: string;
  ukuran: string;
  kodeMaterial: string;
  type: 'LT' | 'ST';
  grade?: 'PRIME' | 'Grade C' | 'Grade E' | 'Campur';
  primeTon?: number;
  gradeCTon?: number;
  gradeETon?: number;
  fgTon: number;
  wipTon: number;
  totalStockTon: number;
  looTon: number;
  persenFulfillment: number;
  primeFulfillment?: number;
  fgQty?: number;
  wipQty?: number;
  totalQty?: number;
  looQty?: number;
  gudangBreakdown?: Record<string, {
    fgTon: number;
    wipTon: number;
    totalStockTon: number;
    fgQty?: number;
    wipQty?: number;
    totalQty?: number;
    totalStockQty?: number;
    primeTon?: number;
    gradeCTon?: number;
    gradeETon?: number;
  }>;
}

export interface LooWarehouseRecap {
  gudang: string;
  primeTon?: number;
  gradeCTon?: number;
  gradeETon?: number;
  fgTon: number;
  wipTon: number;
  totalStockTon: number;
  looTon: number;
  selisihTon: number;
  persenFulfillment: number;
  primeFulfillment?: number;
  itemCount: number;
  status: 'Surplus' | 'Terpenuhi' | 'Defisit';
}

export interface UnfifoItem {
  gudang: string;
  kodeMaterial: string;
  ukuran: string;
  customer: string;
  batchOld: string;
  batchNew: string;
  dateOld: string;
  dateNew: string;
  qtyOld: number;
  tonaseOld: number;
  agingDays: number;
}

export interface UnfifoCoilItem {
  gudang: string;
  kodeMaterial: string;
  specification: string;
  manufaktur: string;
  batch: string;
  tebal: number;
  lebar: number;
  qtyRoll: number;
  tonase: number;
  incDate: string;
  unfifoStatus: string;
  issueNote?: string;
}

export interface DamagedPackagingItem {
  id: string;
  no?: number;
  packageNo: string;
  serialNo: string;
  plant: string;
  customer: string;
  userScan: string;
  tglScanIn: string;
  jamScanIn: string;
  kondisi: string;
  slot?: string;
  kaki?: string;
  rangka?: string;
  pengait?: string;
  dinding?: string;
  labelItem?: string;
  limbah?: string;
  defectCategory?: string;
}

export interface IncomingPackagingItem {
  id: string;
  no?: number;
  tglIncoming?: string;
  customer: string;
  type: string;
  stockAktualInternal: number;
  outQty: number;
  inQty: number;
  stockSaatIni: number;
  detailNG: {
    slot: number | string;
    kaki: number | string;
    dinding: number | string;
    rangka: number | string;
  };
  keterangan?: string;
}

export interface UnfifoPipeItem {
  gudang: string;
  kodeMaterial: string;
  ukuran: string;
  customer: string;
  batch: string;
  qtyBtg: number;
  tonase: number;
  incDate: string;
  prodYear?: string;
  unfifoStatus: string;
  issueNote?: string;
}

export type NCProgressTransactionType = 'IN_NC' | 'OUT_REPAIR' | 'OUT_REPAIR_RETURN' | 'IN_OK_PRIME' | 'REJECT_REPAIR' | 'OTHER';

export interface NCProgressTransaction {
  id: string;
  entryDate: string;
  timeOfEntry?: string;
  plant: string;
  storageLocation: string;
  postingDate: string;
  movementType: string;
  customer?: string; // Name 2
  purchaseOrder?: string;
  order?: string;
  workCenter?: string;
  material: string;
  materialDescription: string;
  batch: string;
  qtyInUnOfEntry: number;
  quantity: number; // in KG
  amountInLC?: number;
  documentHeaderText?: string;
  materialDocument: string;
  materialDocItem: string;
  reference?: string;
  grGiSlip?: string;
  userName: string;
  text?: string; // Keterangan masalah / No NCR (e.g. "21/NCR-SKF/IX/2026 KARAT LUAR DALAM SEBAGIAN")
  unloadingPoint?: string;
  salesOrder?: string;
  salesOrderItem?: string;
  kgGI: number;
  kgGR: number;
  transactionType: NCProgressTransactionType;
  ncrNumber?: string;
  problemRemark?: string;
}

export interface NCProgressPipelineItem {
  key: string;
  material: string;
  materialDescription: string;
  customer: string;
  order?: string;
  workCenter?: string;
  unloadingPoint?: string;
  salesOrder?: string;
  ncrNumber?: string;
  problemRemark?: string;
  batchNC?: string;
  batchPrime?: string;
  batchReject?: string;
  slocNC?: string;
  slocPrime?: string;
  slocReject?: string;
  qtyNCIn: number;
  kgNCIn: number;
  qty261?: number;
  kg261?: number;
  qty262?: number;
  kg262?: number;
  qtyOutRepair: number; // Net GI Repair: 261 - 262
  kgOutRepair: number;
  qtyInPrime: number;   // Hasil Prime: 101
  kgInPrime: number;
  qtyReject: number;    // Rumus Reject / DG: 261 - 262 - 101
  kgReject: number;
  status: 'TERDAFTAR NC' | 'DALAM REPAIR' | 'SELESAI OK' | 'PARTIAL REPAIR';
  recoveryRate: number;
  transactions: NCProgressTransaction[];
  lastDate?: string;
}

export interface NCProgressSummary {
  totalNCInQty: number;
  totalNCInKg: number;
  total261Qty?: number;
  total261Kg?: number;
  total262Qty?: number;
  total262Kg?: number;
  totalOutRepairQty: number; // Net 261 - 262
  totalOutRepairKg: number;
  totalInPrimeQty: number;   // 101
  totalInPrimeKg: number;
  totalRejectQty: number;    // Rumus: 261 - 262 - 101
  totalRejectKg: number;
  outstandingRepairQty: number;
  outstandingRepairKg: number;
  wipRepairQty: number;
  wipRepairKg: number;
  overallRecoveryRate: number;
  totalTransactions: number;
  totalNCRCount: number;
}

export interface WarehouseMasterCapacityItem {
  gudang: string;
  slocCode: string;
  areaLabel: string;
  pipeCapacityTon: number;
  coilCapacityTon: number;
  description?: string;
  isPipeDedicated?: boolean;
  isCoilDedicated?: boolean;
}

export interface WarehouseCapacityConfig {
  pipeCapacities: Record<string, number>;
  coilCapacities: Record<string, number>;
  areaLabels: Record<string, string>;
  notes?: Record<string, string>;
  lastUpdated?: string;
  updatedBy?: string;
}

export const ALL_SPINDO_GUDANGS = [
  'Gd.01',
  'Gd.02',
  'Gd.03',
  'Gd.04',
  'Gd.05',
  'Gd.06',
  'Gd.07',
  'Gd.08',
  'Gd.09',
  'Gd.10',
  'Gd.11',
  'Gd.12',
  'Gd.13',
  'Gd.14',
];

export const DEFAULT_PIPE_CAPACITIES: Record<string, number> = {
  'Gd.01': 930.0,
  'Gd.02': 755.0,
  'Gd.03': 580.0,
  'Gd.04': 450.0,
  'Gd.05': 450.0,
  'Gd.06': 0.0,
  'Gd.07': 0.0,
  'Gd.08': 0.0,
  'Gd.09': 0.0,
  'Gd.10': 350.0,
  'Gd.11': 860.0,
  'Gd.12': 750.0,
  'Gd.13': 354.0,
  'Gd.14': 255.0,
};

export const DEFAULT_COIL_CAPACITIES: Record<string, number> = {
  'Gd.01': 7000.0,
  'Gd.02': 7000.0,
  'Gd.03': 7000.0,
  'Gd.04': 7000.0,
  'Gd.05': 7000.0,
  'Gd.06': 8500.0,
  'Gd.07': 8500.0,
  'Gd.08': 8500.0,
  'Gd.09': 8500.0,
  'Gd.10': 7000.0,
  'Gd.11': 7000.0,
  'Gd.12': 7000.0,
  'Gd.13': 7000.0,
  'Gd.14': 7000.0,
};

export const DEFAULT_COIL_AREA_LABELS: Record<string, string> = {
  'Gd.01': 'Area Gd.01',
  'Gd.02': 'Area K1, K2, K3',
  'Gd.03': 'Area K5, K6',
  'Gd.04': 'Area Gd.04',
  'Gd.05': 'Area Gd.05',
  'Gd.06': 'Gd.06 (Main Coil)',
  'Gd.07': 'Gd.07 (Main Coil)',
  'Gd.08': 'Gd.08 (Main Coil)',
  'Gd.09': 'Gd.09 (Main Coil)',
  'Gd.10': 'Area K9',
  'Gd.11': 'Area K7 & K8',
  'Gd.12': 'Area Gd.12',
  'Gd.13': 'Area Gd.13',
  'Gd.14': 'Area Gd.14',
};

export const GUDANG_SLOC_CODES: Record<string, string> = {
  'Gd.01': '5A',
  'Gd.02': '5B',
  'Gd.03': '5C',
  'Gd.04': '5D',
  'Gd.05': '5E',
  'Gd.06': '5F',
  'Gd.07': '5G',
  'Gd.08': '5H',
  'Gd.09': '5I',
  'Gd.10': '5J',
  'Gd.11': '5K',
  'Gd.12': '5L',
  'Gd.13': '5M',
  'Gd.14': '5N',
};

// ==========================================
// STOCK OPNAME (STO) TYPES
// ==========================================

export type STODifferenceStatus = 'SESUAI' | 'SELISIH_MINUS' | 'SELISIH_PLUS';

export interface StockOpnameItem {
  id: string;
  labelId: string;
  plant: string;
  sloc: string;
  gudang: string;               // Hasil normalisasi SLoc: Gd.01 - Gd.14
  material: string;
  materialDescription?: string;
  ukuran?: string;              // Ekstraksi dimensi pipa (tebal, dia, panjang)
  batch: string;
  sapInitialQty: number;        // Stock SAP awal (kolom SAP awal)
  uom: string;                  // Satuan (Eom / BTG / PCS)
  qtySTO: number;               // Actual awal (Qty STO)
  kgSTO: number;                // Berat actual awal (KG STO)
  additionalSTO: number;        // Susulan actual (Additional STO)
  kgAdditionalSTO: number;      // Berat susulan (KG Additional STO)
  kgDifference: number;         // Selisih KG awal (KG Difference)
  differencesQty: number;       // Selisih Qty awal (Differences)
  qtyIn: number;                // Mutasi IN saat STO
  kgIn: number;                 // Berat IN saat STO
  qtyOut: number;               // Mutasi OUT saat STO
  kgOut: number;                // Berat OUT saat STO
  sapFinalQty: number;          // Stock SAP final rekonsiliasi (SAP final)
  actualFinalQty: number;       // Actual final rekonsiliasi (Actual final)
  differencesFinalQty: number;  // Selisih Qty final (Differences final)
  diffSign: string;             // '+' / '-' / '0'
  kgDiffFinal: number;          // Estimasi selisih berat final (KG)
  tonDiffFinal: number;         // Estimasi selisih berat final (Ton)
  status: STODifferenceStatus;
  remarks?: string;
}

export interface StockOpnameSummary {
  totalItems: number;
  matchingItems: number;
  minusItems: number;
  plusItems: number;
  accuracyRate: number;         // (matchingItems / totalItems) * 100
  totalSapQty: number;
  totalActualQty: number;
  netVarianceQty: number;       // totalActualQty - totalSapQty
  totalSapTon: number;
  totalActualTon: number;
  netVarianceTon: number;
  totalMinusTon: number;
  totalPlusTon: number;
}

export interface StockOpnameGudangRecap {
  gudang: string;
  itemCount: number;
  matchingCount: number;
  minusCount: number;
  plusCount: number;
  accuracyRate: number;
  sapQty: number;
  actualQty: number;
  varianceQty: number;
  sapTon: number;
  actualTon: number;
  varianceTon: number;
  matchingTon: number;
  minusTon: number;
  plusTon: number;
  matchingQty: number;
  minusQty: number;
  plusQty: number;
  sapItemCount?: number;
  actualItemCount?: number;
}

export interface StockOpnameSLocRecap {
  sloc: string;
  gudang: string;
  itemCount: number;
  matchingCount: number;
  minusCount: number;
  plusCount: number;
  accuracyRate: number;
  varianceQty: number;
  varianceTon: number;
  minusQty: number;
  plusQty: number;
  minusTon: number;
  plusTon: number;
  matchingQty?: number;
  matchingTon?: number;
  sapQty?: number;
  actualQty?: number;
  sapTon?: number;
  actualTon?: number;
  sapItemCount?: number;
  actualItemCount?: number;
}

export interface StockOpnamePeriodSummary {
  periodKey: string;
  label: string;
  lastUpdated: string;
  totalItems: number;
  matchingCount: number;
  minusCount: number;
  plusCount: number;
  accuracyRate: number;
  sapQty: number;
  actualQty: number;
  varianceQty: number;
  sapTon: number;
  actualTon: number;
  varianceTon: number;
  sapItemCount: number;
  actualItemCount: number;
  gudangBreakdown?: Record<string, {
    itemCount: number;
    matchingCount: number;
    accuracyRate: number;
    sapQty: number;
    actualQty: number;
    sapTon: number;
    actualTon: number;
    varianceTon: number;
  }>;
}



