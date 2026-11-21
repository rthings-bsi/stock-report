/**
 * Gaya tooltip Chart.js yang dipakai di seluruh dashboard.
 * Diselaraskan dengan palet Fore Deep Foliage (#1a4034) + Linen (#f4f2ef) + Seed (#d0d784).
 * Spread ke opsi chart: tooltip: { ...tooltipStyle, callbacks: { ... } }
 */
export const tooltipStyle = {
  backgroundColor: 'rgba(26, 64, 52, 0.97)',
  titleColor: '#f4f2ef',
  bodyColor: '#e7f0ee',
  titleFont: {
    family: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    size: 12,
    weight: 'bold' as const,
  },
  bodyFont: {
    family: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    size: 11,
  },
  padding: { top: 9, bottom: 9, left: 13, right: 13 },
  cornerRadius: 12,
  boxPadding: 5,
  usePointStyle: true,
  borderColor: 'rgba(208, 215, 132, 0.45)',
  borderWidth: 1,
};

/** Varian kontras lebih tegas untuk chart hero (Audit SLoc & Stock Opname). */
export const tooltipStyleStrong = {
  ...tooltipStyle,
  backgroundColor: 'rgba(26, 64, 52, 0.99)',
  padding: { top: 10, bottom: 10, left: 14, right: 14 },
  borderColor: 'rgba(208, 215, 132, 0.65)',
};
