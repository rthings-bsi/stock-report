# 03 - Warehouse Modules & Views

Dashboard Spindo dipecah menjadi beberapa modul utama yang dapat diposisikan ulang (customizable cards) di tampilan utama (`src/app/page.tsx`).

---

## 1. Modul Kapasitas Gudang (`PipeCapacityView.tsx`)
- **Tujuan**: Memantau kapasitas gudang pipa (Warehouse A, B, C, Open Yard).
- **Indikator**: Total kapasitas (Ton/Batang), stok terisi, okupansi persentase (%), dan status kapasitas (Normal / Warning / Critical).
- **Komponen Pendukung**: Progress bar okupansi dan summary metric card.

---

## 2. Modul Fast & Slow Moving (`FastSlowView.tsx`)
- **Tujuan**: Menganalisis perputaran barang guna mencegah dead stock.
- **Kategori**:
  - **Fast-Moving**: Barang dengan pergerakan pengeluaran rutin (< 30 hari).
  - **Slow-Moving**: Barang mengendap 30-90 hari.
  - **Dead Stock**: Barang tidak bergerak > 90 hari.
- **Tampilan**: Tabulasi detail ukuran pipa, kuantiti, umur barang (*aging*), dan nilai estimasi.

---

## 3. Modul Coil & Strip Raw Material (`CoilStripView.tsx`)
- **Tujuan**: Monitoring stok bahan baku utama sebelum masuk ke pipa mill.
- **Data**:
  - **Mother Coil**: Coil utuh dari supplier (Krakatau Steel, dll).
  - **Slitted Coil / Strip**: Hasil slitting coil yang siap masuk ke lini mesin pipa.
- **Fitur**: Tracking ketebalan, lebar strip, berat (MT), dan alokasi mill.

---

## 4. Modul Kualitas Non-Conformity (`NCQualityView.tsx` & `NCCharts.tsx`)
- **Tujuan**: Pelacakan pipa bermasalah mutu.
- **Visualisasi**:
  - Donut/Bar Chart distribusi **Grade E (Hold)** vs **Grade C (Repair)**.
  - Breakdown penyebab cacat (Welding seam, dent, ovality, scratch, surface rust).
- **Aksi**: Filter per divisi gudang dan daftar detail item yang di-hold QA.

---

## 5. Modul Pemenuhan Order LOO (`LooFulfillmentView.tsx`)
- **Tujuan**: Sinkronisasi ketersediaan stok aktual terhadap List of Orders (LOO) customer.
- **Visualisasi Inti**:
  - **Grouped Bar Chart**: Membandingkan `Requested Qty (LOO)` vs `Available Physical Stock` untuk **Top 15 Customer + Ukuran**.
  - **Detail Table**: Menampilkan detail line-item pesanan, kekurangan kuota (*backorder*), dan tanggal deadline pengiriman.

---

## 6. Modul UnFIFO Tracking (`UnfifoView.tsx`)
- **Tujuan**: Mendeteksi anomali pengeluaran barang yang melanggar prinsip *First In, First Out*.
- **Cakupan**:
  - **UnFIFO Pipa**: Pipa baru terkirim mendahului pipa batch lama.
  - **UnFIFO Coil**: Coil baru dipotong mendahului coil yang sudah lebih lama di gudang.
- **Dampak**: Mencegah penumpukan barang usang berkarat di bagian bawah tumpukan (*stacking*).

---

## 7. Modul RTP Packaging Rusak (`DamagedPackagingView.tsx`)
- **Tujuan**: Manajemen palet / packaging RTP (Returnable Transport Packaging) yang rusak saat proses handling atau return dari customer.
- **Kategori Scan NG**:
  - `Slot` (dudukan pipa)
  - `Dinding` (penyangga samping)
  - `Rangka` (struktur besi utama)
- **Fitur**: Grafik tren bulanan, status perbaikan, dan kuantiti palet siap sirkulasi ulang.

---

## 8. Shell Interaktif: `CustomizableCard.tsx`
- Membungkus setiap modul di atas.
- **Fitur**:
  - Tombol **Fullscreen Expand** untuk melihat grafik/tabel berukuran besar.
  - Toggle Show/Hide modul sesuai kebutuhan shift operator.
  - Persistensi setting ke browser local storage.

Terkait: [[00 - Index]], [[02 - SAP & Domain Business Logic]], [[04 - UI & Anti-Slop Guidelines]]
