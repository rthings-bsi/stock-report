# Keamanan Spindo Warehouse Dashboard

Dokumen ini mencatat status implementasi hardening dan kontrol keamanan aplikasi **Spindo Warehouse Dashboard** yang telah diaudit dan diperbaiki secara menyeluruh melalui tiga fase perbaikan (Fase 1, Fase 2, dan Fase 3).

---

## Ringkasan Status Keamanan

| Layer / Domain Keamanan | Status | Keterangan |
|---|---|---|
| **Fase 1: Autentikasi, Sesi, Kriptografi & RBAC** | **Selesai** | Cookie HttpOnly HMAC, Timing-Safe Equal, CSRF Reject, Bounded Rate Limiting, Server-side RBAC |
| **Fase 2: Backend API, Database & Access Control** | **Selesai** | Parameterized SQL, Proteksi Master Admin & System Roles, Anti-Mass Wipeout, Sanitasi Error |
| **Fase 3: Frontend, Parser, Export Sanitizer & Headers** | **Selesai** | HTTP Security Headers (CSP, HSTS, XFO), Anti-Formula Injection (CWE-1236), Upload Size Limit (25MB), Logout Purge |

---

## 1. Fase 1: Autentikasi, Sesi, Kriptografi & RBAC (Selesai)

- **Autentikasi Server-Side & Cookie Sesi:**
  - Login ditangani eksklusif oleh endpoint `POST /api/auth`.
  - Sesi memakai cookie `spindo_session` yang ditandatangani secara kriptografis menggunakan HMAC (SHA-256).
  - Cookie dikonfigurasi dengan atribut `HttpOnly`, `SameSite=Lax`, `Path=/`, dan flag `Secure` aktif pada environment production.
  - Sesi diverifikasi secara berkala ke server (`GET /api/auth`); token di `localStorage` tidak lagi dipercaya sebagai sumber autentikasi.
- **Kriptografi & Password Hashing:**
  - Kredensial default lama (`admin/123` dan `staff/123`) telah dihapus secara permanen.
  - Password disimpan dalam format hash `bcrypt` (salt rounds 10/12) dan di-hash/diverifikasi secara asinkron (`bcrypt.hash` / `bcrypt.compare`).
  - Pembandingan session secret dan signature menggunakan `crypto.timingSafeEqual` untuk mencegah serangan *timing attack*.
- **Perlindungan Brute-Force & DoS (Rate Limiting):**
  - Implementasi rate limiting bertingkat (`BoundedRateLimiter` di `src/lib/rateLimit.ts`).
  - Pelacakan dual-key (berdasarkan kombinasi IP Address dan Username target).
  - Mekanisme eviksi memori terbatas (FIFO bounded map) untuk mencegah serangan Memory Exhaustion DoS terhadap heap server.
- **Proteksi CSRF (Cross-Site Request Forgery):**
  - Pemeriksaan ketat terhadap header `Origin` dan `Referer` (`rejectCrossOrigin` di `src/lib/auth-server.ts`) untuk memblokir permintaan lintas domain (*cross-origin mutation*).
- **Kontrol Akses Berbasis Peran (RBAC):**
  - Validasi izin (*permission check*) ditegakkan di sisi server untuk seluruh aksi mutasi dan pembacaan data.

---

## 2. Fase 2: Backend API Routes, Database & Proteksi Otorisasi (Selesai)

- **Proteksi Akun Master Admin & System Roles:**
  - Akun master admin (`admin`) dilindungi dari pengubahan peran (*role demotion*), penonaktifan, atau penghapusan di `src/app/api/users/route.ts`.
  - System roles bawaan (`admin`, `staff`, `viewer`) dilindungi dari modifikasi nama atau penghapusan di `src/app/api/roles/route.ts`.
  - Diberlakukan validasi panjang password minimal **8 karakter** pada seluruh alur pembuatan dan pembaruan akun.
- **Pencegahan Mass Data Wipeout:**
  - Endpoint `DELETE /api/warehouse` dan `DELETE /api/incoming-packaging` mewajibkan otorisasi peran Admin dan parameter konfirmasi eksplisit (`confirm=PERMANENT_WIPE_ALL_SNAPSHOTS`).
- **Mitigasi SQL Injection:**
  - Seluruh kueri SQLite (`better-sqlite3`) menggunakan *parameterized inputs / prepared statements* (`?` binding).
  - Penyusunan query dinamis diuji terhadap whitelist kolom yang ketat untuk mencegah injeksi klausa SQL.
- **Sanitasi Pesan Error (Anti-Information Disclosure):**
  - Pesan error database internal dan stack trace tidak lagi dibocorkan ke respon klien HTTP.
  - Endpoint diagnostik (`GET /api/productivity?diagnostic=1` / `?check=1`) kini diproteksi dengan otorisasi `canManageUsers`.
- **Hardening Integrasi Supabase:**
  - Supabase hanya diakses dari sisi server memakai `SUPABASE_SERVICE_ROLE_KEY`. Anon/publishable key tidak digunakan untuk mutasi data.
  - String hardcoded URL Supabase pada `src/lib/supabase.ts` telah dihapus; konfigurasi sepenuhnya mengandalkan environment variable server.
  - Penguncian Row Level Security (RLS) pada skema tabel Supabase melalui skrip `supabase_security_lockdown.sql`.

---

## 3. Fase 3: Frontend, Parser, Upload, Export Sanitizer & HTTP Headers (Selesai)

- **HTTP Security Headers (`next.config.js`):**
  - **Content-Security-Policy (CSP):** Membatasi sumber eksekusi script, style, image, font, dan koneksi:
    ```text
    default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
    ```
  - **X-Frame-Options: DENY** & **CSP frame-ancestors 'none':** Mencegah serangan Clickjacking di seluruh browser.
  - **X-Content-Type-Options: nosniff:** Mencegah eksploitasi MIME-type sniffing.
  - **Strict-Transport-Security (HSTS):** `max-age=31536000; includeSubDomains; preload` untuk memaksakan komunikasi HTTPS.
  - **Referrer-Policy: strict-origin-when-cross-origin:** Melindungi kebocoran path dan query string pada header referer.
  - **Permissions-Policy:** Mematikan akses sensor/perangkat yang tidak digunakan: `camera=(), microphone=(), geolocation=()`.
- **Sanitasi Formula Spreadsheet / CSV Injection (CWE-1236):**
  - Modul sanitasi terpusat di `src/lib/sanitizeFormula.ts` (`sanitizeFormulaValue`, `sanitizeRowObject`, `sanitizeTableData`).
  - Meng-escape seluruh data teks input dinamis yang berawalan karakter formula (`=`, `+`, `-`, `@`, `\t`, `\r`) menggunakan prefix tanda kutip tunggal (`'`).
  - Diterapkan pada seluruh modul ekspor spreadsheet:
    - `src/lib/exportStockOpnameExcel.ts` (Seluruh sheet STO)
    - `src/lib/exportAuditSLocExcel.ts` (Seluruh sheet Audit SLoc)
    - `src/lib/exportNCProgressExcel.ts` (Semua 6 sheet tracking & transaksi NC)
    - `src/lib/exportPackagingExcel.ts` (Seluruh sel dinamis; sel berstatus sesuai diganti dari karakter formula berbahaya `=` menjadi `'Pas'`)
    - `src/lib/exportWeeklyExcel.ts` (Seluruh sheet analitik mingguan)
    - `src/components/ProductivityView.tsx` (Seluruh ringkasan eksekutif, rekap harian, dan detail transaksi)
- **Validasi File Upload & Proteksi Client DoS (`UploadModal.tsx`):**
  - Batasan ukuran file maksimal **25 MB** (`MAX_UPLOAD_SIZE = 25 * 1024 * 1024`) ditegakkan sebelum file dimuat ke memori buffer.
  - Whitelist ekstensi file ketat: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`.
  - Penolakan file yang tidak valid mereset elemen input file browser untuk mencegah *memory leak*.
- **Pembersihan Total Client Storage saat Logout (`src/app/page.tsx`):**
  - Fungsi `handleLogout` memanggil `DELETE /api/auth` untuk mencabut cookie sesi di server.
  - Menghapus seluruh data operasional gudang, cache master packaging, cache snapshot, data user, dan konfigurasi custom role dari browser `localStorage`:
    - `spindo_warehouse_saved_state`
    - `spindo_selected_snapshot_key`
    - `spindo_users_list`
    - `spindo_custom_roles`
    - `spindo_packaging_buffer_stock`
    - `spindo_packaging_master_cache`
    - `spindo_audit_pkg_cache`
    - `spindo_nc_progress_data`
    - `spindo_unfifo_pipe_issues`
    - `spindo_unfifo_coil_issues`
    - `spindo_warehouse_capacity_config`
  - Mengeksekusi `sessionStorage.clear()` untuk membersihkan sesi sementara browser pada terminal bersama (*shared workstation*).

---

## Panduan Konfigurasi Production

Sebelum menjalankan aplikasi di environment production (misal Vercel / server lokal produksi), pastikan environment variable berikut terkonfigurasi pada file `.env.local` atau panel deployment:

```text
# Secret HMAC untuk penandatanganan cookie sesi (Wajib, minimal 32 karakter acak)
SESSION_SECRET=minimal-32-karakter-acak-dan-rahasia

# Password awal untuk proses seeding akun default jika database kosong
ADMIN_INITIAL_PASSWORD=password-kuat-admin-pertama
STAFF_INITIAL_PASSWORD=password-kuat-staff-pertama

# URL dan Kredensial Supabase (Hanya untuk mode cloud deploy)
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-rahasia>
ENABLE_SUPABASE=true
```

> **Catatan Penting:**
> 1. Jangan pernah menetapkan `DISABLE_SUPABASE=true` di lingkungan produksi cloud.
> 2. Jangan pernah melakukan commit file `.env.local` atau membocorkan `SUPABASE_SERVICE_ROLE_KEY`.
> 3. Lakukan rotasi berkala terhadap `SESSION_SECRET` dan kunci API Supabase di dashboard manajemen.
