/**
 * Spreadsheet / CSV / Excel Formula Injection Sanitizer (CWE-1236)
 *
 * Mencegah evaluasi formula otomatis di Microsoft Excel, LibreOffice, atau Google Sheets
 * saat file spreadsheet yang diekspor dibuka. Karakter awalan formula (=, +, -, @, \t, \r)
 * di-escape dengan tanda kutip tunggal (') agar diperlakukan sebagai teks literal.
 */

export function sanitizeFormulaValue<T>(value: T): T {
  if (typeof value !== 'string') return value;

  const trimmed = value.trimStart();
  if (/^[=+@\-\t\r]/.test(trimmed)) {
    return `'${value}` as unknown as T;
  }
  return value;
}

export function sanitizeRowObject<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === 'string') {
      clean[key] = sanitizeFormulaValue(val);
    } else if (Array.isArray(val)) {
      clean[key] = val.map((item) => (typeof item === 'string' ? sanitizeFormulaValue(item) : item));
    } else {
      clean[key] = val;
    }
  }
  return clean as T;
}

export function sanitizeTableData<T extends Record<string, any>>(rows: T[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => sanitizeRowObject(r));
}
