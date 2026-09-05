import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 p-4">
      <h2 className="text-2xl font-bold mb-2">404 - Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-500 mb-4">Halaman yang Anda tuju tidak tersedia.</p>
      <Link href="/" className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-sm font-semibold">
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
