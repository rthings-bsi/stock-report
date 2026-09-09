'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Boxes,
  Activity,
  Layers,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { UserSession, StoredAccount, PRESET_ACCOUNTS } from '@/types/auth';

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Validasi ke Backend API (Supabase / SQLite)
      const res = await fetch(
        `/api/users?username=${encodeURIComponent(username.trim())}&password=${encodeURIComponent(password)}`
      );
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        onLogin({
          username: data.user.username,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department || 'Warehouse Staff',
          unit: data.user.unit || 'Unit 5 - Spindo'
        });
        return;
      }

      // 2. Fallback jika offline / preset local
      const localUsersStr = localStorage.getItem('spindo_users_list');
      const customUsers: StoredAccount[] = localUsersStr ? JSON.parse(localUsersStr) : [];
      const allAccounts = [...PRESET_ACCOUNTS, ...customUsers];

      const match = allAccounts.find(
        (acc) =>
          acc.username.trim().toLowerCase() === username.trim().toLowerCase() &&
          acc.password === password
      );

      if (match) {
        onLogin({
          username: match.username,
          name: match.name,
          role: match.role,
          department: match.department,
          unit: match.unit
        });
      } else {
        setErrorMsg(data?.error || 'Username atau password tidak sesuai.');
      }
    } catch {
      // Offline fallback
      const localUsersStr = localStorage.getItem('spindo_users_list');
      const customUsers: StoredAccount[] = localUsersStr ? JSON.parse(localUsersStr) : [];
      const allAccounts = [...PRESET_ACCOUNTS, ...customUsers];

      const match = allAccounts.find(
        (acc) =>
          acc.username.trim().toLowerCase() === username.trim().toLowerCase() &&
          acc.password === password
      );

      if (match) {
        onLogin({
          username: match.username,
          name: match.name,
          role: match.role,
          department: match.department,
          unit: match.unit
        });
      } else {
        setErrorMsg('Username atau password tidak sesuai.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 font-sans selection:bg-emerald-600 selection:text-white">
      
      {/* =========================================================================
          LAYER KIRI: BRANDING & INDUSTRIAL INTELLIGENCE SHOWCASE (COLS 7)
          ========================================================================= */}
      <div className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 xl:p-16 bg-[#041c14] border-r border-emerald-950/80 overflow-hidden">
        
        {/* Subtle Architectural Grid Pattern (Anti-Slop: No rainbow blobs) */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(52, 211, 153, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }}
        />

        {/* Ambient Top Light Beam */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* TOP HEADER: Status Indicator */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400 shadow-inner">
              <Boxes className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-300 uppercase">
                PT STEEL PIPE INDUSTRY OF INDONESIA TBK
              </span>
              <p className="text-[10px] font-mono text-emerald-500/80 uppercase">
                Warehouse Section &bull; Unit 5 Surabaya
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-800/60 text-[10px] font-mono font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 -ml-3.5" />
            <span>SYSTEM READY</span>
          </div>
        </div>

        {/* MIDDLE CONTENT: Main Hero & Intelligence Metrics */}
        <div className="relative z-10 my-auto py-8 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800/70 text-[11px] font-mono text-emerald-300 font-bold uppercase tracking-widest">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
              <span>Real-Time Logistics Suite</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Warehouse Inventory &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                Logistics Intelligence System
              </span>
            </h1>
            <p className="text-sm text-slate-400 max-w-lg leading-relaxed font-sans">
              Platform operasional terpadu monitoring kapasitas pipa, segregasi NC, mutasi Returnable Transport Packaging (RTP), dan rekonsiliasi LOO.
            </p>
          </div>

          {/* Core Feature Metric Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/60 backdrop-blur-xs space-y-1.5 hover:border-emerald-700/60 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <Layers className="h-4 w-4" strokeWidth={1.8} />
                <span>10 Gudang Pipa</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Monitoring okupansi kapasitas aktual vs batas maksimum (Gd.01 - Gd.14).
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/60 backdrop-blur-xs space-y-1.5 hover:border-emerald-700/60 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <Activity className="h-4 w-4" strokeWidth={1.8} />
                <span>Fast &amp; Slow Moving</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Analisis perputaran produk pipa finish good &amp; bahan baku strip coil.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/60 backdrop-blur-xs space-y-1.5 hover:border-emerald-700/60 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                <span>RTP Incoming QA</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Pencatatan kondisi fisik kemasan transfer (Slot, Kaki, Rangka, Dinding).
              </p>
            </div>

            <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-900/60 backdrop-blur-xs space-y-1.5 hover:border-emerald-700/60 transition-colors">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                <span>Dynamic RBAC</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Matriks izin bertingkat berbasis peran operasional &amp; hak eksekusi SAP.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 pt-4 border-t border-emerald-950 flex items-center justify-between text-[11px] font-mono text-emerald-600/90">
          <span>SPINDO &bull; Unit 5 Security Standard</span>
          <span>v2.5.0 Production</span>
        </div>
      </div>

      {/* =========================================================================
          LAYER KANAN: AUTHENTICATION FORM PANEL (COLS 5)
          ========================================================================= */}
      <div className="col-span-12 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 bg-slate-50 relative min-h-screen lg:min-h-0">
        
        {/* Mobile Header Brand (Only visible on small devices) */}
        <div className="lg:hidden w-full max-w-sm mb-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spindo-logo.png" alt="SPINDO Logo" className="h-9 w-auto object-contain" />
          </div>
          <h2 className="text-base font-bold text-slate-900 font-mono tracking-tight">
            WAREHOUSE SYSTEM &bull; UNIT 5
          </h2>
        </div>

        {/* Form Container Card */}
        <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200/90 p-7 sm:p-8 shadow-xl shadow-slate-200/60 relative">
          
          {/* Desktop Logo Badge */}
          <div className="hidden lg:flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spindo-logo.png" alt="SPINDO Logo" className="h-8 w-auto object-contain" />
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              UNIT 5
            </span>
          </div>

          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Autentikasi Pengguna
            </h2>
            <p className="text-xs text-slate-500 font-sans">
              Gunakan kredensial akun warehouse Anda untuk masuk.
            </p>
          </div>

          {/* Form Element */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Error Message Toast */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-mono animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase font-mono flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
                  <span>Username</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">id akun</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="admin / staff / operator"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-xs font-mono text-slate-900 shadow-2xs focus:bg-white focus:border-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-700/15 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase font-mono flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
                  <span>Password</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">terenkripsi</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 text-xs font-mono text-slate-900 shadow-2xs focus:bg-white focus:border-emerald-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-700/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-xs shadow-md shadow-emerald-900/15 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-70 group"
            >
              {isLoading ? (
                <span className="animate-pulse">Memvalidasi Kredensial...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Quick Shortcuts for Testing/Staff */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Pintasan Akun Demo:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', '123')}
                className="flex-1 py-1 px-2 rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 text-[10px] font-mono font-semibold text-slate-600 transition-all cursor-pointer text-center"
              >
                admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('staff', '123')}
                className="flex-1 py-1 px-2 rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 text-[10px] font-mono font-semibold text-slate-600 transition-all cursor-pointer text-center"
              >
                staff
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-6 text-[10px] text-slate-400 font-mono text-center max-w-xs">
          Akses terbatas hanya untuk personel logistik &amp; warehouse resmi PT SPINDO Tbk Unit 5.
        </p>
      </div>

    </div>
  );
};
