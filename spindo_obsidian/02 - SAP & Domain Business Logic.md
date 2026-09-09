# 02 - SAP & Domain Business Logic

Dokumentasi aturan bisnis inti (core business logic), rumus parsing SAP, konvensi penamaan material, dan parameter gudang pipa baja PT SPINDO.

---

## 1. Dimensi Fisik Pipa
Format dimensi material standar:
$$\text{Diameter (D)} \times \text{Thickness / Tebal (T)} \times \text{Panjang (P)}$$
- Seluruh ukuran dalam milimeter (mm).
- Konversi suffix kode SAP: Suffix `07420`, `07750`, `11700` menunjukkan skala presisi $0.1\text{ mm}$ (contoh: `07420` $\rightarrow 742.0\text{ mm}$, `11700` $\rightarrow 1170.0\text{ mm}$).

---

## 2. Klasifikasi Panjang: ST vs LT
Pengelompokan pipa berdasarkan panjang potong (*cut length*):
- **ST (Short Tube)**: Panjang $< 3000\text{ mm}$ ($< 3\text{ meter}$). Umumnya untuk komponen otomotif, furniture, atau pesanan presisi pendek.
- **LT (Long Tube)**: Panjang $\ge 3000\text{ mm}$ ($\ge 3\text{ meter}$). Standar pipa konstruksi, scaffolding, tiang, pipa air/gas (panjang umum 6000 mm).

---

## 3. Status Barang: FG vs WIP
Penetapan jenis barang ditentukan dari teks deskripsi material (*Material Description*):
- **FG (Finished Goods)**: Deskripsi material mengandung kode string `"MP"` (Mill Product / Final Good). Siap dialokasikan untuk pengiriman / LOO customer.
- **WIP (Work In Progress)**: Deskripsi material **tanpa** kode `"MP"`. Masih memerlukan proses finishing/galvanis/chamfer/coating lanjutan.

---

## 4. Kualitas & Non-Conformity (NC)
Pipa yang terkena catatan QC (Quality Control) dipisahkan ke modul NC dengan grade spesifik:
- **Grade E (Hold / Karantina)**: Pipa ditahan untuk inspeksi mendalam atau menunggu disposisi QA. Dilarang keras dialokasikan ke LOO customer.
- **Grade C (Repair / Rework)**: Pipa dengan cacat minor yang bisa diperbaiki (contoh: bevel ulang, straightening, burr removal) sebelum dapat dipromosikan kembali.

---

## 5. Defect RTP Packaging Rusak
Returnable Transport Packaging (RTP) dipindai pada proses Scan-In NG dengan 3 kategori defect utama:
1. **Slot**: Kerusakan alur/slot dudukan pipa, aus atau pecah.
2. **Dinding**: Plat dinding penyangga penyok, melengkung, atau sobek.
3. **Rangka**: Struktur rangka utama bengkok, patah, atau sambungan las terlepas.

---

## 6. Pemenuhan Order (Stock vs LOO)
- **LOO (List of Orders)**: Data daftar pesanan sales order dari customer aktif.
- **Matching Logic**: Komparasi ketersediaan stok fisik FG terhadap total permintaan LOO per ukuran dan per customer.
- Output divisualisasikan dalam:
  1. Grouped Bar Chart Top 15 Customer + Ukuran.
  2. Detail Table sinkronisasi Excel SAP.

Terkait: [[00 - Index]], [[03 - Warehouse Modules & Views]], [[04 - UI & Anti-Slop Guidelines]]
