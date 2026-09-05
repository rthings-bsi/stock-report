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
}

export interface LooComparisonItem {
  no: number;
  gudang?: string;
  customer: string;
  ukuran: string;
  kodeMaterial: string;
  type: 'LT' | 'ST';
  fgTon: number;
  wipTon: number;
  totalStockTon: number;
  looTon: number;
  persenFulfillment: number;
  fgQty?: number;
  wipQty?: number;
  totalQty?: number;
  looQty?: number;
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

export interface UnfifoPipeItem {
  gudang: string;
  kodeMaterial: string;
  ukuran: string;
  customer: string;
  batch: string;
  qtyBtg: number;
  tonase: number;
  incDate: string;
  unfifoStatus: string;
}
