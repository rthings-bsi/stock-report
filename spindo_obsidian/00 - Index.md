# Spindo Warehouse Dashboard - Knowledge Base (MOC)

Knowledge base dan dokumentasi teknis komprehensif untuk project **Spindo Warehouse Dashboard**.

---

## 🗺️ Peta Navigasi Vault
- [[01 - Architecture & Database Dual-Mode]]: Arsitektur Next.js 15, route handlers, dual-mode persistence (Supabase Cloud + SQLite Local fallback).
- [[02 - SAP & Domain Business Logic]]: Formula dimensi pipa, suffix SAP, aturan ST/LT, klasifikasi FG/WIP, grade NC, dan logika order LOO.
- [[03 - Warehouse Modules & Views]]: 7 modul monitoring gudang (Capacity, Fast/Slow, Coil, NC, LOO Fulfillment, UnFIFO, Packaging Rusak).
- [[04 - UI & Anti-Slop Guidelines]]: Palet warna (60/30/10 Emerald), standard border/radius, Chart.js conventions, dan larangan emoji (anti-slop).
- [[05 - Deployment & Environment]]: Konfigurasi environment variables, SQL schema Supabase, dan deployment workflow Vercel.

---

## 📌 Ringkasan Project
- **Nama Repo**: `https://github.com/rthings-bsi/stock-report.git`
- **Root Path**: `C:\Project Web\spindo\New\spindo_app`
- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + PostCSS
- **Visualisasi**: Chart.js 4 + `react-chartjs-2` + `lucide-react`
- **Tujuan Utama**: Dashboard operasional gudang pipa baja (PT Steel Pipe Industry of Indonesia, Tbk - SPINDO) untuk visualisasi stok harian SAP, analisis defect kemasan RTP, kontrol FIFO, dan pemenuhan order LOO.
