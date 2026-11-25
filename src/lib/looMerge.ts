import { LooComparisonItem } from '../types/warehouse';
import { getMaterialBaseKey } from './materialCode';

type GudangBreakdownMap = NonNullable<LooComparisonItem['gudangBreakdown']>;

interface StockSnapshot {
  fgTon: number;
  wipTon: number;
  totalStockTon: number;
  fgQty: number;
  wipQty: number;
  totalQty: number;
  primeTon: number;
  gradeCTon: number;
  gradeETon: number;
  grade: 'PRIME' | 'Grade C' | 'Grade E' | 'Campur';
  gudang: string;
  gudangs: string[];
  gudangBreakdown: GudangBreakdownMap;
  customer: string;
  ukuran: string;
  type: 'LT' | 'ST';
}

const round3 = (n: number): number => Number((Number.isFinite(n) ? n : 0).toFixed(3));
const round1 = (n: number): number => Number((Number.isFinite(n) ? n : 0).toFixed(1));

export function hasLooOrder(item: Partial<LooComparisonItem> | null | undefined): boolean {
  if (!item) return false;
  return (item.looTon || 0) > 0 || (item.looQty || 0) > 0;
}

export function hasPipeStock(item: Partial<LooComparisonItem> | null | undefined): boolean {
  if (!item) return false;
  return (
    (item.totalStockTon || 0) > 0 ||
    (item.fgTon || 0) > 0 ||
    (item.wipTon || 0) > 0 ||
    (item.totalQty || 0) > 0 ||
    (item.fgQty || 0) > 0 ||
    (item.wipQty || 0) > 0
  );
}

function normalizeGudangBreakdown(raw: LooComparisonItem['gudangBreakdown']): GudangBreakdownMap {
  if (!raw || typeof raw !== 'object') return {};
  const result: GudangBreakdownMap = {};
  for (const g of Object.keys(raw).sort()) {
    const b = raw[g];
    if (!b) continue;
    const fgTon = round3(b.fgTon || 0);
    const wipTon = round3(b.wipTon || 0);
    const totalStockTon = round3(
      b.totalStockTon !== undefined && b.totalStockTon !== null ? b.totalStockTon : fgTon + wipTon
    );
    const fgQty = Math.round(b.fgQty || 0);
    const wipQty = Math.round(b.wipQty || 0);
    const totalQty = Math.round(b.totalQty ?? b.totalStockQty ?? (fgQty + wipQty));
    result[g] = {
      fgTon,
      wipTon,
      totalStockTon,
      fgQty,
      wipQty,
      totalQty,
      totalStockQty: totalQty,
      primeTon: round3(b.primeTon || 0),
      gradeCTon: round3(b.gradeCTon || 0),
      gradeETon: round3(b.gradeETon || 0),
    };
  }
  return result;
}

function extractGudangs(item: LooComparisonItem, normalizedBreakdown: GudangBreakdownMap): string[] {
  const set = new Set<string>();
  Object.keys(normalizedBreakdown).forEach((g) => {
    if (g && g !== '-') set.add(g);
  });
  if (Array.isArray(item.gudangs)) {
    item.gudangs.forEach((g) => {
      const trimmed = String(g || '').trim();
      if (trimmed && trimmed !== '-') set.add(trimmed);
    });
  }
  if (set.size === 0 && item.gudang && item.gudang !== '-') {
    item.gudang.split(',').forEach((g) => {
      const trimmed = g.trim();
      if (trimmed && trimmed !== '-') set.add(trimmed);
    });
  }
  return Array.from(set).sort();
}

function normalizeItem(item: LooComparisonItem, fallbackType: 'ST' | 'LT'): LooComparisonItem {
  const kodeMaterial = getMaterialBaseKey(item.kodeMaterial || '');
  const gudangBreakdown = normalizeGudangBreakdown(item.gudangBreakdown);
  const gudangs = extractGudangs(item, gudangBreakdown);
  const gudang = gudangs.length > 0 ? gudangs.join(', ') : '-';

  const fgTon = round3(item.fgTon || 0);
  const wipTon = round3(item.wipTon || 0);
  const totalStockTon = round3(
    item.totalStockTon !== undefined && item.totalStockTon !== null ? item.totalStockTon : fgTon + wipTon
  );
  const fgQty = Math.round(item.fgQty || 0);
  const wipQty = Math.round(item.wipQty || 0);
  const totalQty = Math.round(
    item.totalQty !== undefined && item.totalQty !== null ? item.totalQty : fgQty + wipQty
  );
  const looTon = round3(item.looTon || 0);
  const looQty = Math.round(item.looQty || 0);
  const primeTon = round3(item.primeTon || 0);
  const gradeCTon = round3(item.gradeCTon || 0);
  const gradeETon = round3(item.gradeETon || 0);

  const persenFulfillment = round1(
    looTon > 0 ? (totalStockTon / looTon) * 100 : totalStockTon > 0 ? 100 : 0
  );
  const primeFulfillment = round1(
    looTon > 0 ? (primeTon / looTon) * 100 : primeTon > 0 ? 100 : 0
  );

  return {
    ...item,
    kodeMaterial,
    type: item.type === 'ST' || item.type === 'LT' ? item.type : fallbackType,
    gudang,
    gudangs,
    gudangBreakdown,
    fgTon,
    wipTon,
    totalStockTon,
    fgQty,
    wipQty,
    totalQty,
    looTon,
    looQty,
    primeTon,
    gradeCTon,
    gradeETon,
    persenFulfillment,
    primeFulfillment,
  };
}

function toStockSnapshot(item: LooComparisonItem): StockSnapshot {
  const gudangBreakdown = normalizeGudangBreakdown(item.gudangBreakdown);
  const gudangs = extractGudangs(item, gudangBreakdown);
  const fgTon = round3(item.fgTon || 0);
  const wipTon = round3(item.wipTon || 0);
  const totalStockTon = round3(
    item.totalStockTon !== undefined && item.totalStockTon !== null ? item.totalStockTon : fgTon + wipTon
  );
  const fgQty = Math.round(item.fgQty || 0);
  const wipQty = Math.round(item.wipQty || 0);
  const totalQty = Math.round(
    item.totalQty !== undefined && item.totalQty !== null ? item.totalQty : fgQty + wipQty
  );

  return {
    fgTon,
    wipTon,
    totalStockTon,
    fgQty,
    wipQty,
    totalQty,
    primeTon: round3(item.primeTon || 0),
    gradeCTon: round3(item.gradeCTon || 0),
    gradeETon: round3(item.gradeETon || 0),
    grade: item.grade || 'PRIME',
    gudang: gudangs.length > 0 ? gudangs.join(', ') : '-',
    gudangs,
    gudangBreakdown,
    customer: item.customer || 'General Stock',
    ukuran: item.ukuran || item.kodeMaterial,
    type: item.type === 'ST' ? 'ST' : 'LT',
  };
}

function buildStockPool(stList: LooComparisonItem[], ltList: LooComparisonItem[]): Map<string, StockSnapshot> {
  const pool = new Map<string, StockSnapshot>();
  const ingest = (items: LooComparisonItem[], fallbackType: 'ST' | 'LT') => {
    for (const raw of items) {
      if (!raw || !raw.kodeMaterial) continue;
      const item = normalizeItem(raw, fallbackType);
      if (!hasPipeStock(item)) continue;
      const key = item.kodeMaterial;
      const snap = toStockSnapshot(item);
      const existing = pool.get(key);
      // Simpan entri dengan totalStockTon lebih besar jika ada duplikat historis
      if (!existing || snap.totalStockTon > existing.totalStockTon) {
        pool.set(key, snap);
      }
    }
  };
  ingest(stList, 'ST');
  ingest(ltList, 'LT');
  return pool;
}

function applyStockToLooItem(looItem: LooComparisonItem, stock: StockSnapshot | undefined): LooComparisonItem {
  const looTon = round3(looItem.looTon || 0);
  const looQty = Math.round(looItem.looQty || 0);

  if (!stock) {
    return {
      ...looItem,
      fgTon: 0,
      wipTon: 0,
      totalStockTon: 0,
      fgQty: 0,
      wipQty: 0,
      totalQty: 0,
      primeTon: 0,
      gradeCTon: 0,
      gradeETon: 0,
      grade: 'PRIME',
      gudang: '-',
      gudangs: [],
      gudangBreakdown: {},
      looTon,
      looQty,
      persenFulfillment: 0,
      primeFulfillment: 0,
    };
  }

  const persenFulfillment = round1(
    looTon > 0 ? (stock.totalStockTon / looTon) * 100 : stock.totalStockTon > 0 ? 100 : 0
  );
  const primeFulfillment = round1(
    looTon > 0 ? (stock.primeTon / looTon) * 100 : stock.primeTon > 0 ? 100 : 0
  );

  return {
    ...looItem,
    fgTon: stock.fgTon,
    wipTon: stock.wipTon,
    totalStockTon: stock.totalStockTon,
    fgQty: stock.fgQty,
    wipQty: stock.wipQty,
    totalQty: stock.totalQty,
    primeTon: stock.primeTon,
    gradeCTon: stock.gradeCTon,
    gradeETon: stock.gradeETon,
    grade: stock.grade,
    gudang: stock.gudang,
    gudangs: stock.gudangs,
    gudangBreakdown: stock.gudangBreakdown,
    looTon,
    looQty,
    persenFulfillment,
    primeFulfillment,
  };
}

function stockSnapshotToReserveItem(kodeMaterial: string, stock: StockSnapshot): LooComparisonItem {
  return {
    no: 0,
    customer: stock.customer || 'General Stock',
    ukuran: stock.ukuran || kodeMaterial,
    kodeMaterial,
    type: stock.type,
    grade: stock.grade,
    primeTon: stock.primeTon,
    gradeCTon: stock.gradeCTon,
    gradeETon: stock.gradeETon,
    gudang: stock.gudang,
    gudangs: stock.gudangs,
    fgTon: stock.fgTon,
    wipTon: stock.wipTon,
    totalStockTon: stock.totalStockTon,
    looTon: 0,
    persenFulfillment: stock.totalStockTon > 0 ? 100 : 0,
    primeFulfillment: stock.primeTon > 0 ? 100 : 0,
    fgQty: stock.fgQty,
    wipQty: stock.wipQty,
    totalQty: stock.totalQty,
    looQty: 0,
    gudangBreakdown: stock.gudangBreakdown,
  };
}

function splitSortAndNumber(items: LooComparisonItem[]): {
  looSTData: LooComparisonItem[];
  looLTData: LooComparisonItem[];
} {
  // Deduplikasi lintas ST/LT berdasarkan kodeMaterial ternormalisasi
  const dedup = new Map<string, LooComparisonItem>();
  for (const item of items) {
    if (!item.kodeMaterial) continue;
    const prev = dedup.get(item.kodeMaterial);
    if (!prev) {
      dedup.set(item.kodeMaterial, item);
      continue;
    }
    // Prioritaskan entri yang memiliki target LOO, lalu totalStockTon lebih besar
    const prevHasLoo = hasLooOrder(prev);
    const currHasLoo = hasLooOrder(item);
    if (currHasLoo && !prevHasLoo) {
      dedup.set(item.kodeMaterial, item);
    } else if (currHasLoo === prevHasLoo && (item.totalStockTon || 0) > (prev.totalStockTon || 0)) {
      dedup.set(item.kodeMaterial, item);
    }
  }

  const stList: LooComparisonItem[] = [];
  const ltList: LooComparisonItem[] = [];
  for (const item of dedup.values()) {
    if (item.type === 'ST') stList.push(item);
    else ltList.push(item);
  }

  const cmp = (a: LooComparisonItem, b: LooComparisonItem) =>
    (b.looTon || 0) - (a.looTon || 0) ||
    (b.totalStockTon || 0) - (a.totalStockTon || 0) ||
    a.kodeMaterial.localeCompare(b.kodeMaterial);

  stList.sort(cmp);
  ltList.sort(cmp);

  return {
    looSTData: stList.map((item, idx) => ({ ...item, no: idx + 1 })),
    looLTData: ltList.map((item, idx) => ({ ...item, no: idx + 1 })),
  };
}

export interface MergeLooAndPipeStockInput {
  prevST?: LooComparisonItem[];
  prevLT?: LooComparisonItem[];
  nextST?: LooComparisonItem[];
  nextLT?: LooComparisonItem[];
  hasPipe: boolean;
  hasLoo: boolean;
}

/**
 * Penggabungan dua arah (bidirectional & idempoten) antara Stock Pipa (FG & WIP seluruh gudang)
 * dan Target LOO, selalu cocok ketat berdasarkan `kodeMaterial` ternormalisasi (tanpa fallback `ukuran`).
 *
 * - `hasPipe && hasLoo`: pakai hasil join segar dari `parseExcelFiles`.
 * - `hasPipe && !hasLoo`: perbarui stock FG & WIP pada seluruh LOO eksisting dari pool stock pipa baru
 *   (reset ke 0 jika tidak lagi tersedia di file pipa baru) + simpan item stock-only agar upload LOO
 *   berikutnya tetap dapat mencocokkan 100% seluruh gudang.
 * - `!hasPipe && hasLoo`: perkaya seluruh item LOO baru dari pool stock pipa eksisting (lintas ST & LT)
 *   + pertahankan item stock-only dari pool eksisting untuk upload LOO berikutnya.
 * - `!hasPipe && !hasLoo`: pertahankan data eksisting apa adanya (tersanitasi).
 */
export function mergeLooAndPipeStock({
  prevST = [],
  prevLT = [],
  nextST = [],
  nextLT = [],
  hasPipe,
  hasLoo,
}: MergeLooAndPipeStockInput): {
  looSTData: LooComparisonItem[];
  looLTData: LooComparisonItem[];
} {
  const safePrevST = (Array.isArray(prevST) ? prevST : []).map((i) => normalizeItem(i, 'ST'));
  const safePrevLT = (Array.isArray(prevLT) ? prevLT : []).map((i) => normalizeItem(i, 'LT'));
  const safeNextST = (Array.isArray(nextST) ? nextST : []).map((i) => normalizeItem(i, 'ST'));
  const safeNextLT = (Array.isArray(nextLT) ? nextLT : []).map((i) => normalizeItem(i, 'LT'));

  // Case 1: Upload bersamaan (Pipe + LOO) — sudah di-join oleh parseExcelFiles
  if (hasPipe && hasLoo) {
    return splitSortAndNumber([...safeNextST, ...safeNextLT]);
  }

  // Case 4: Tidak ada upload Pipe maupun LOO
  if (!hasPipe && !hasLoo) {
    return splitSortAndNumber([...safePrevST, ...safePrevLT]);
  }

  // Case 2: Upload Data Pipa SAJA (hasPipe && !hasLoo)
  if (hasPipe && !hasLoo) {
    const freshStockPool = buildStockPool(safeNextST, safeNextLT);
    const prevLooTargets = [...safePrevST, ...safePrevLT].filter(hasLooOrder);
    const existingLooTargets =
      prevLooTargets.length > 0
        ? prevLooTargets
        : [...safeNextST, ...safeNextLT].filter(hasLooOrder);

    // Jika belum ada target LOO sama sekali (mis. upload Pipa lebih dulu sebelum LOO),
    // simpan seluruh pool stock pipa agar saat LOO diupload nanti seluruh gudang tersedia.
    if (existingLooTargets.length === 0) {
      const reserveItems: LooComparisonItem[] = [];
      for (const [kode, snap] of freshStockPool.entries()) {
        reserveItems.push(stockSnapshotToReserveItem(kode, snap));
      }
      return splitSortAndNumber(reserveItems);
    }

    const merged: LooComparisonItem[] = [];
    const seenKeys = new Set<string>();

    for (const looItem of existingLooTargets) {
      const key = looItem.kodeMaterial;
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      merged.push(applyStockToLooItem(looItem, freshStockPool.get(key)));
    }

    // Pertahankan sisa material stock-only dari file Pipa baru agar re-upload LOO berikutnya tetap akurat 100%
    for (const [kode, snap] of freshStockPool.entries()) {
      if (seenKeys.has(kode)) continue;
      merged.push(stockSnapshotToReserveItem(kode, snap));
    }

    return splitSortAndNumber(merged);
  }

  // Case 3: Upload Data LOO SAJA (!hasPipe && hasLoo)
  const existingStockPool = buildStockPool(safePrevST, safePrevLT);
  // Fallback: jika prev kosong (mis. client sudah mem-merge sebelum POST), gunakan stock yang melekat di next
  const fallbackNextPool = existingStockPool.size === 0 ? buildStockPool(safeNextST, safeNextLT) : existingStockPool;
  const stockPool = existingStockPool.size > 0 ? existingStockPool : fallbackNextPool;

  const incomingLooTargets = [...safeNextST, ...safeNextLT].filter(hasLooOrder);
  const merged: LooComparisonItem[] = [];
  const seenKeys = new Set<string>();

  for (const looItem of incomingLooTargets) {
    const key = looItem.kodeMaterial;
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    merged.push(applyStockToLooItem(looItem, stockPool.get(key)));
  }

  // Pertahankan sisa material stock-only dari pool pipa eksisting agar upload LOO revisi selanjutnya tetap lengkap
  for (const [kode, snap] of stockPool.entries()) {
    if (seenKeys.has(kode)) continue;
    merged.push(stockSnapshotToReserveItem(kode, snap));
  }

  return splitSortAndNumber(merged);
}
