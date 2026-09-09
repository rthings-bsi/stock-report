'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Activity,
  Users2,
  FileSpreadsheet,
  Building2
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

  return (
    <div className="min-h-dvh w-full flex flex-col lg:flex-row font-sans selection:bg-[#047857] selection:text-white bg-[#fafafa]">
      
      {/* =========================================================================
          LEFT PANE: DESKTOP BRAND SHOWCASE (Spindo Forest & Emerald Gradient)
          ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-[52%] xl:w-[55%] p-10 xl:p-16 flex-col justify-between bg-gradient-to-br from-[#041c14] via-[#064e3b] to-[#047857] overflow-hidden text-white min-h-screen">
        
        {/* Subtle geometric dot grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* TOP HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs text-emerald-100 font-mono font-medium shadow-xs">
            <Building2 className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
            <span>Plant 1105 &bull; Unit 5 Karawang</span>
          </div>

          {/* Monitoring Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-medium text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>Monitoring Gudang</span>
          </div>
        </div>

        {/* CENTER HERO & PILLS */}
        <div className="relative z-10 my-auto py-12 space-y-8">
          <div className="space-y-3.5">
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight text-white leading-[1.15]">
              Pergerakan Barang
            </h1>
            <p className="text-base text-emerald-100/90 max-w-lg font-normal leading-relaxed">
              Catat dan pantau seluruh pergerakan barang, kapasitas stok pipa, segregasi NC, dan mutasi packaging secara akurat.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white shadow-2xs hover:bg-white/15 transition-all">
              <Activity className="h-4 w-4 text-emerald-300" strokeWidth={2} />
              <span>Real-time — Update langsung</span>
            </div>

            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white shadow-2xs hover:bg-white/15 transition-all">
              <Users2 className="h-4 w-4 text-teal-300" strokeWidth={2} />
              <span>Multi-user — Akses peran</span>
            </div>

            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white shadow-2xs hover:bg-white/15 transition-all">
              <FileSpreadsheet className="h-4 w-4 text-amber-300" strokeWidth={2} />
              <span>SAP Import — Otomatis</span>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-emerald-200/80 font-medium font-mono">
          <span>&copy; 2026 SPINDO</span>
          <span>
            Created by <strong className="text-white font-bold tracking-wide">Ricky Satria</strong>
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANE / MOBILE VIEW: FORM LOGIN (Spindo Theme)
          ========================================================================= */}
      <div className="w-full lg:w-[48%] xl:w-[45%] min-h-dvh flex flex-col justify-center items-center p-5 sm:p-8 lg:p-12 xl:p-16 bg-[#fafafa]">
        
        <div className="w-full max-w-sm space-y-6">
          
          {/* Centered Logo & Greeting Header */}
          <div className="space-y-3.5 text-center">
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/spindo-logo.png"
                alt="SPINDO Logo"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Halo
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Pakai akun SPINDO kamu untuk masuk ke sistem
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/90 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in zoom-in-95 duration-150 font-mono">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Field: Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block text-left font-mono">
                Username
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
                  placeholder="Masukkan username"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-2xs focus:border-[#047857] focus:outline-hidden focus:ring-4 focus:ring-[#047857]/15 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block text-left font-mono">
                Password
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
                  placeholder="••••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-2xs focus:border-[#047857] focus:outline-hidden focus:ring-4 focus:ring-[#047857]/15 transition-all placeholder:text-slate-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4.5 w-4.5" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Helper Link ke WhatsApp Admin */}
            <div className="text-xs text-slate-500 pt-0.5 text-center">
              Lupa password?{' '}
              <a
                href="https://wa.me/6287776216046?text=Halo%20Admin%2C%20saya%20ingin%20reset%20password%20akun%20Spindo%20Warehouse."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#047857] hover:text-[#065f46] font-semibold hover:underline cursor-pointer"
              >
                Hubungi Admin
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-bold text-sm shadow-md shadow-emerald-950/20 hover:shadow-lg hover:shadow-emerald-950/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 group"
            >
              {isLoading ? (
                <span className="animate-pulse">Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
                </>
              )}
            </button>
          </form>

          {/* Mobile Footer Meta */}
          <div className="lg:hidden text-center pt-4 border-t border-slate-200/60 text-[11px] font-mono text-slate-400">
            <span>&copy; 2026 SPINDO &bull; Created by Ricky Satria</span>
          </div>

        </div>

      </div>

    </div>
  );
};
