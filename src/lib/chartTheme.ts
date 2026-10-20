/**
 * Gaya tooltip Chart.js yang dipakai di seluruh dashboard.
 * Spread ke opsi chart: tooltip: { ...tooltipStyle, callbacks: { ... } }
 */
export const tooltipStyle = {
  backgroundColor: 'rgba(10, 36, 30, 0.97)',
  titleColor: '#f6f3eb',
  bodyColor: '#dce7e0',
  titleFont: { size: 12, weight: 'bold' as const },
  bodyFont: { size: 11 },
  padding: { top: 8, bottom: 8, left: 12, right: 12 },
  cornerRadius: 4,
  boxPadding: 4,
  usePointStyle: true,
  borderColor: 'rgba(228, 162, 58, 0.35)',
  borderWidth: 1,
};

/** Varian kontras lebih tegas untuk chart hero (Audit SLoc & Stock Opname). */
export const tooltipStyleStrong = {
  ...tooltipStyle,
  backgroundColor: 'rgba(10, 36, 30, 0.99)',
  padding: { top: 10, bottom: 10, left: 14, right: 14 },
  borderColor: 'rgba(228, 162, 58, 0.5)',
};
