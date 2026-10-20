/** Format tanggal Excel (serial number / Date / string) menjadi DD/MM/YYYY. */
export function formatExcelDate(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime()) || val.getFullYear() < 1920) return '';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${val.getFullYear()}`;
  }

  const str = String(val).trim();
  if (!str || str === '-' || str === '0') return '';

  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(str)) {
    const [day, month, year] = str.split(/[\/\-.]/);
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.length === 2 ? `20${year}` : year}`;
  }

  if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(str)) {
    const [year, month, day] = str.split(/[\/\-.]/);
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  const num = parseFloat(str);
  if (!isNaN(num) && num >= 20000 && num <= 80000 && !str.includes(':')) {
    const date = new Date(Math.round((Math.floor(num) - 25569) * 86400 * 1000));
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getUTCFullYear()}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1920) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${parsed.getFullYear()}`;
  }

  return str;
}

/** Format waktu Excel (serial number / Date / string) menjadi HH:mm:ss. */
export function formatExcelTime(val: unknown): string {
  if (val === null || val === undefined) return '-';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '-';
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    const s = String(val.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  const str = String(val).trim();
  if (!str || str === '0' || str === '-') return '-';

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m, s = '00'] = str.split(':');
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}`;
  }

  const timeMatch = str.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2].padStart(2, '0')}:${(timeMatch[3] || '00').padStart(2, '0')}`;
  }

  const num = parseFloat(str.replace(',', '.'));
  if (!isNaN(num)) {
    const frac = num >= 1 ? num - Math.floor(num) : num;
    if (frac > 0 && frac < 1) {
      const totalSeconds = Math.round(frac * 86400);
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const h = String(parsed.getHours()).padStart(2, '0');
    const m = String(parsed.getMinutes()).padStart(2, '0');
    const s = String(parsed.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  return str;
}
