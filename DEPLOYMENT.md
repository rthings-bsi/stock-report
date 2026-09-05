# Panduan Deploy Spindo Dashboard ke Vercel & Supabase

## 1. Setup Database Supabase
1. Buka dashboard Supabase (https://supabase.com) dan buat project baru.
2. Buka menu **SQL Editor** di sidebar kiri.
3. Jalankan query dari file `supabase_schema.sql` (telah disediakan di root project).
4. Buka menu **Project Settings** -> **API**, lalu salin:
   - `Project URL`
   - `anon / public key`

---

## 2. Deploy ke Vercel

### Opsi A: Menggunakan GitHub + Vercel Dashboard (Rekomendasi)
1. Inisialisasi git dan push repo ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: complete spindo dashboard with packaging defect analytics"
   git remote add origin <URL_REPO_GITHUB_ANDA>
   git branch -M main
   git push -u origin main
   ```
2. Buka dashboard Vercel (https://vercel.com) -> Klik **"Add New..."** -> **"Project"**.
3. Import repository GitHub project ini.
4. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = `<URL_SUPABASE_ANDA>`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<ANON_KEY_SUPABASE_ANDA>`
5. Klik **"Deploy"**.

---

### Opsi B: Deploy via CLI
Jalankan perintah berikut di terminal:
```bash
npx vercel
```
Saat diminta environment variables, masukkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Untuk rilis production:
```bash
npx vercel --prod
```
