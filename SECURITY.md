# Keamanan Spindo Warehouse

## Status Phase 1 (selesai)

- Login dipindah ke `POST /api/auth`; sesi memakai cookie `spindo_session` yang
  ditandatangani HMAC, `HttpOnly`, `SameSite=Lax`, dan `Secure` di production.
- Semua API data/user/role/setting memerlukan sesi login yang valid.
- Operasi sensitif memakai permission server-side:
  - kelola user/role & hapus snapshot: `canManageUsers`
  - upload per kategori: `canUploadPipe`, `canUploadCoil`, dst.
  - incoming packaging: `canEditIncomingPkg` / `canUploadIncomingPkg`
  - kapasitas & master packaging: `canManageCapacity` / `canUploadSAP`
- Kredensial default `admin/123` dan `staff/123` dihapus. Password disimpan
  sebagai bcrypt; password lemah lama dimigrasi saat server start.
- Supabase hanya diakses server memakai `SUPABASE_SERVICE_ROLE_KEY`.
  Anon/publishable key tidak dipakai lagi.
- RLS Supabase dikunci: lihat `supabase_schema_normalized.sql` dan
  `supabase_security_lockdown.sql`.

## Wajib di production

Set environment berikut (jangan commit nilainya):

```text
SESSION_SECRET=<minimal 32 karakter acak>
ADMIN_INITIAL_PASSWORD=<password kuat untuk seed pertama>
STAFF_INITIAL_PASSWORD=<password kuat untuk seed pertama>
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Jika deploy bukan di Vercel, tambahkan `ENABLE_SUPABASE=true`.
Jangan set `DISABLE_SUPABASE=true` di production.

`ADMIN_INITIAL_PASSWORD` / `STAFF_INITIAL_PASSWORD` hanya dipakai saat database
masih kosong atau saat migrasi password default. Setelah itu, ubah password
lewat menu User Management.

## Supabase (wajib sekali)

1. Jalankan `supabase_security_lockdown.sql` di Supabase SQL Editor.
2. Rotasi/regenerate **anon/publishable key** dan **service role key** di
   Dashboard > Settings > API. Key lama pernah tertulis di source code.
3. Simpan hanya service role key baru di environment server.
4. Verifikasi `pg_policies` tidak memiliki policy untuk tabel warehouse.

## Catatan

- Sesi lama yang tersimpan di localStorage tidak dipercaya lagi. Semua user
  harus login ulang.
- Rate limit login bersifat in-memory per instance server.
- Belum dikerjakan (Phase 2): security headers/CSP, sanitasi pesan error,
  upgrade dependency (`xlsx`, `next`, `postcss`, `sharp`, `brace-expansion`),
  dan self-service ganti password.
