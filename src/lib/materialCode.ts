/**
 * Normalisasi kode material SAP SPINDO (Base Key Wildcard `*`).
 *
 * Format standar kode material pipa SPINDO:
 * - Prefix (3 char, diawali huruf): e.g. YAB, XCB, X1B, P3K, G4B, Z5K
 * - Kode proses (2 digit, 00..99): diganti wildcard `*` agar FG & WIP teragregasi
 * - Kode diameter/profil (3 HURUF A-Z, tanpa digit angka): e.g. AOA (22.2), BOK (48.6), BKO (42.7)
 * - Ekor dimensi tebal & panjang: e.g. 0400+40000, 0340+01975, 0080-06000
 */

/**
 * Memperbaiki typo digit `0` (nol) menjadi huruf `O` pada token 3-huruf tepat setelah `*`
 * tanpa menyentuh digit tebal/panjang di belakangnya.
 *
 * Contoh:
 * - `YAB*A0A0400+40000` -> `YAB*AOA0400+40000`
 * - `XCB*B0K0340+01975` -> `XCB*BOK0340+01975`
 * - `YAb*A0A`           -> `YAB*AOA`
 */
export function normalizeWildcardMaterialCode(matCode: string): string {
  if (!matCode || typeof matCode !== 'string') return matCode || '';
  if (!matCode.includes('*')) return matCode;

  const clean = matCode.trim().toUpperCase();

  // Format lengkap: [Prefix 3 char diawali huruf]*[3 char huruf (0->O)][ekor angka dimensi]
  const fullMatch = clean.match(/^([A-Z][A-Z0-9]{2})\*([A-Z0]{3})(\d[A-Z0-9+.\-_]*)$/);
  if (fullMatch) {
    const alphaToken = fullMatch[2].replace(/0/g, 'O');
    return `${fullMatch[1]}*${alphaToken}${fullMatch[3]}`;
  }

  // Format pendek (hanya token huruf setelah *, mis. YAB*A0A)
  const shortMatch = clean.match(/^([A-Z][A-Z0-9]{2})\*([A-Z0]+)$/);
  if (shortMatch) {
    const alphaToken = shortMatch[2].replace(/0/g, 'O');
    return `${shortMatch[1]}*${alphaToken}`;
  }

  return clean;
}

/**
 * Konversi kode material SAP mentah ke Base Key Wildcard (`*`) untuk agregasi WIP & FG.
 * - Mengubah 2 digit proses setelah prefix 3 karakter (diawali huruf) menjadi `*`.
 * - Menjamin token 3 karakter tepat setelah `*` selalu huruf (`0` -> `O`), tidak pernah mengubah `O` -> `0`.
 * - Tidak memotong kode material numerik murni non-pipa (mis. `700004`).
 */
export function getMaterialBaseKey(matCode: string): string {
  if (!matCode) return '';
  const clean = matCode.trim().toUpperCase();

  if (clean.includes('*')) {
    return normalizeWildcardMaterialCode(clean);
  }

  // Format standar pipa SPINDO: [Prefix 3 char diawali huruf][2 digit proses][3 huruf profil (0->O)][ekor dimensi]
  const pipeMatch = clean.match(/^([A-Z][A-Z0-9]{2})\d{2}([A-Z0]{3})(\d[A-Z0-9+.\-_]*)$/);
  if (pipeMatch) {
    const alphaToken = pipeMatch[2].replace(/0/g, 'O');
    return `${pipeMatch[1]}*${alphaToken}${pipeMatch[3]}`;
  }

  // Format alternatif diawali huruf + 2 digit proses + minimal 1 huruf setelahnya
  const altMatch = clean.match(/^([A-Z][A-Z0-9]{2})\d{2}([A-Z][A-Z0-9+.\-_]+)$/);
  if (altMatch) {
    return `${altMatch[1]}*${altMatch[2]}`;
  }

  return clean;
}

/**
 * Sanitasi array item yang memiliki properti `kodeMaterial` (LOO / UNFIFO)
 * agar snapshot lama yang terlanjur menyimpan `*A0A` / `*B0K` otomatis tampil normal.
 */
export function sanitizeMaterialCodeItems<T extends { kodeMaterial?: string }>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  let changed = false;
  const result = items.map((item) => {
    if (!item || typeof item.kodeMaterial !== 'string' || !item.kodeMaterial.includes('*')) {
      return item;
    }
    const fixed = normalizeWildcardMaterialCode(item.kodeMaterial);
    if (fixed !== item.kodeMaterial) {
      changed = true;
      return { ...item, kodeMaterial: fixed };
    }
    return item;
  });
  return changed ? result : items;
}
