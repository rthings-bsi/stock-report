# 04 - UI & Anti-Slop Guidelines

Standar desain visual antarmuka Spindo Warehouse Dashboard menerapkan prinsip **Enterprise Clean Industrial Dashboard** dan **Aturan Anti-Slop**.

---

## 1. Aturan Emas Anti-Slop (STRICT ANTI-SLOP)
1. **DILARANG MENGGUNAKAN EMOJI**:
   - Jangan pernah menyematkan emoji (seperti 🚀, 📦, ⚠️, ❌, ✅, 🔥) di judul card, badge status, tabel, atau select dropdown.
   - Gantikan seluruh kebutuhan simbol visual dengan ikon SVG dari **`lucide-react`** (gunakan prop `strokeWidth={1.8}` atau `strokeWidth={2.0}`).
2. **Hindari Bubbly UI**:
   - Hindari border radius berlebihan seperti `rounded-xl`, `rounded-2xl`, atau `rounded-3xl`.
   - Gunakan standar industri: **`rounded-md`** dengan shadow halus **`shadow-2xs`** atau **`shadow-sm`**.
3. **Pertahankan Desain Korporat Eksisting**:
   - Pertahankan banner emerald dan struktur tabel korporat. Dilarang merombak layout yang sudah disetujui tanpa instruksi eksplisit.

---

## 2. Palet Warna (Rule 60 - 30 - 10)
- **60% Dominan (Background & Canvas)**:
  - Slate White / Canvas: `#f8fafc` (Slate-50 / Gray-50) pada light mode dan dark slate pada dark mode.
- **30% Identitas Korporat (Emerald Green)**:
  - Primary Accent: `#047857` (Emerald-700) / `#064e3b` (Emerald-900).
  - Digunakan pada: Header navbar, active tabs, primary action buttons, data series stok fisik.
- **10% Alert & Highlight (Amber / Yellow)**:
  - Warning Accent: `#d97706` (Amber-600) / `#b45309`.
  - Digunakan pada: Warning occupancy, pipa Grade C (Repair), target LOO belum terpenuhi, penanda UnFIFO.
- **Warna Status Khusus**:
  - Danger / Grade E (Hold): Red-600 / Rose-600 (`#dc2626`).
  - Info / Secondary: Slate-500.

---

## 3. Standar Komponen UI
1. **Tabel Data**:
   - Header table: `thead` wajib memiliki background `bg-slate-100` (atau dark equivalent).
   - Scroll container: batasi ketinggian kontainer `max-h-[70vh]` dengan header sticky (`sticky top-0`).
   - Teks angka wajib rata kanan (`text-right`) dan menggunakan format ribuan (`toLocaleString()`).
2. **Chart.js Konfigurasi (`src/lib/chartSetup.ts`)**:
   - Menggunakan Chart.js v4.
   - Wajib inisialisasi modul via `ChartJS.register(...registerables)`.
   - Preferensi grafik perbandingan: **Grouped Bar Chart** (unstacked) agar perbandingan stok fisik vs LOO terlihat jelas berdampingan.
3. **Card Modul (`CustomizableCard.tsx`)**:
   - Setiap modul wajib menyediakan trigger expand fullscreen untuk mempermudah observasi operator di layar monitor gudang.

Terkait: [[00 - Index]], [[03 - Warehouse Modules & Views]]
