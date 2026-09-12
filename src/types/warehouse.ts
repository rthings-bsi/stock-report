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

export type NCProgressTransactionType = 'IN_NC' | 'OUT_REPAIR' | 'IN_OK_PRIME' | 'OTHER';

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
  slocNC?: string;
  slocPrime?: string;
  qtyNCIn: number;
  kgNCIn: number;
  qtyOutRepair: number;
  kgOutRepair: number;
  qtyInPrime: number;
  kgInPrime: number;
  status: 'TERDAFTAR NC' | 'DALAM REPAIR' | 'SELESAI OK' | 'PARTIAL REPAIR';
  recoveryRate: number;
  transactions: NCProgressTransaction[];
  lastDate?: string;
}

export interface NCProgressSummary {
  totalNCInQty: number;
  totalNCInKg: number;
  totalOutRepairQty: number;
  totalOutRepairKg: number;
  totalInPrimeQty: number;
  totalInPrimeKg: number;
  outstandingRepairQty: number;
  outstandingRepairKg: number;
  wipRepairQty: number;
  wipRepairKg: number;
  overallRecoveryRate: number;
  totalTransactions: number;
  totalNCRCount: number;
}

