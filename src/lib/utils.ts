import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka tonase secara konsisten (standar profesional warehouse):
 * - Jika format 2 desimal bernilai < 0.01 tapi > 0, otomatis menggunakan 3 desimal (contoh: 0,006 Ton) agar tidak terpotong menjadi 0,00
 */
export function formatTon(
  val: number | undefined | null,
  options?: {
    decimals?: number;
    showUnit?: boolean;
    zeroAsDash?: boolean;
  }
): string {
  const { decimals = 1, showUnit = false, zeroAsDash = false } = options || {};
  if (val === undefined || val === null || isNaN(val)) {
    return zeroAsDash ? '-' : (0).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (showUnit ? ' Ton' : '');
  }
  if (val === 0 && zeroAsDash) {
    return '-';
  }

  // Jika nilai sangat kecil (contoh: 0.005 Ton atau -0.005 Ton), naikkan desimal agar tidak tampil 0,00 atau 0,0
  let effectiveDecimals = decimals;
  const absVal = Math.abs(val);
  if (absVal > 0 && absVal < 0.01) {
    effectiveDecimals = 3;
  } else if (absVal > 0 && absVal < 0.1 && decimals === 1) {
    effectiveDecimals = 2;
  }

  const formatted = val.toLocaleString('id-ID', {
    minimumFractionDigits: effectiveDecimals,
    maximumFractionDigits: effectiveDecimals,
  });
  return showUnit ? `${formatted} Ton` : formatted;
}

/**
 * Format angka kuantitas / batang / pieces (bilangan bulat integer):
 * contoh: 12.450 Pcs atau Btg
 */
export function formatQty(
  val: number | undefined | null,
  options?: {
    unit?: string;
    zeroAsDash?: boolean;
  }
): string {
  const { unit, zeroAsDash = false } = options || {};
  if (val === undefined || val === null || isNaN(val)) {
    return zeroAsDash ? '-' : '0' + (unit ? ` ${unit}` : '');
  }
  if (val === 0 && zeroAsDash) {
    return '-';
  }
  const formatted = Math.round(val).toLocaleString('id-ID');
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format persentase standar:
 * contoh: 87,5%
 */
export function formatPercent(
  val: number | undefined | null,
  decimals: number = 1
): string {
  if (val === undefined || val === null || isNaN(val)) return '0,0%';
  return `${val.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}
