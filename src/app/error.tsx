'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App-level Client Exception:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="p-4 rounded-full bg-amber-50 text-amber-800 border border-amber-200 mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 mb-2">
        Terjadi Kendala Memuat Tampilan
      </h2>
      <p className="text-xs text-slate-500 max-w-md mb-5">
        Komponen tampilan mengalami kendala render ({error?.message || 'Client Exception'}). Silakan coba muat ulang.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-md shadow-2xs cursor-pointer transition-all"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Muat Ulang Tampilan
      </button>
    </div>
  );
}
