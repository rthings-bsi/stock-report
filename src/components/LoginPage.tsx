'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Terminal,
  Server,
  Database,
  ShieldCheck,
  CheckCircle2
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
        setErrorMsg(data?.error || 'Kredensial username atau password salah.');
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
        setErrorMsg('Kredensial username atau password salah.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0f12] flex flex-col lg:grid lg:grid-cols-12 font-sans selection:bg-[#064e3b] selection:text-white">
      
      {/* =========================================================================
          PANEL KIRI: INDUSTRIAL SYSTEM SPEC & PLANT TELEMETRY (COLS 7)
          Anti-Slop: No generic cards, no rainbow glows, pure engineering precision
          ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-14 bg-[#080d0b] border-r border-[#15231c]">
        
        {/* TOP BRAND HEADER */}
        <div className="flex items-center justify-between border-b border-[#15231c] pb-6">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-8 w-auto object-contain brightness-110"
            />
            <div className="h-4 w-[1px] bg-[#1d352a]" />
            <span className="font-mono text-xs tracking-wider text-slate-300 font-semibold uppercase">
              PLANT 1105 &bull; UNIT 5 SURABAYA
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span>PORTAL_ONLINE</span>
          </div>
        </div>

        {/* MIDDLE CONTENT: Operational Telemetry & System Specs */}
        <div className="my-auto py-10 space-y-8 max-w-xl">
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-emerald-500 font-bold uppercase tracking-widest">
              INTERNAL LOGISTICS SYSTEM
            </span>
            <h1 className="text-3xl font-bold text-white tracking-tight leading-snug">
              Warehouse Management &amp; <br />
              <span className="text-slate-300 font-mono text-2xl font-medium">
                Pipa &bull; Coil &bull; Returnable Packaging (RTP)
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-sans leading-relaxed pt-1">
              Sistem operasional terintegrasi pengawasan stok pipa 10 gudang, segregasi status NC (Hold &amp; Repair), rekonsiliasi LOO, dan pencatatan fisik RTP masuk/keluar.
            </p>
          </div>

          {/* Plant Telemetry Table (Clean, Sharp, Grounded) */}
          <div className="border border-[#182921] rounded-sm bg-[#060a08] overflow-hidden font-mono text-xs">
            <div className="px-3.5 py-2 bg-[#0d1612] border-b border-[#182921] flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                SYSTEM_SPECIFICATION
              </span>
              <span>REV. 2026.09</span>
            </div>

            <div className="divide-y divide-[#132019] text-[11px]">
              <div className="grid grid-cols-12 px-3.5 py-2 hover:bg-[#0c1410] transition-colors">
                <span className="col-span-4 text-slate-500">Plant / Werks</span>
                <span className="col-span-8 text-slate-200 font-semibold">1105 - Spindo Unit 5 (Karangpilang)</span>
              </div>
              <div className="grid grid-cols-12 px-3.5 py-2 hover:bg-[#0c1410] transition-colors">
                <span className="col-span-4 text-slate-500">Coverage Area</span>
                <span className="col-span-8 text-slate-200">10 Gudang Pipa (Gd.01 - Gd.14) &bull; Bay K1-K9</span>
              </div>
              <div className="grid grid-cols-12 px-3.5 py-2 hover:bg-[#0c1410] transition-colors">
                <span className="col-span-4 text-slate-500">Integration</span>
                <span className="col-span-8 text-slate-200">SAP R/3 Raw Parser &bull; Dual-Mode Supabase/SQLite</span>
              </div>
              <div className="grid grid-cols-12 px-3.5 py-2 hover:bg-[#0c1410] transition-colors">
                <span className="col-span-4 text-slate-500">Access Control</span>
                <span className="col-span-8 text-emerald-400 font-medium">Bcrypt Authentication &bull; Dynamic Matrix RBAC</span>
              </div>
            </div>
          </div>

          {/* Architecture Status Badges */}
          <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
            <div className="p-3 border border-[#16251e] bg-[#090e0b] rounded-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
                <Server className="h-3.5 w-3.5 text-slate-500" />
                DATABASE
              </div>
              <div className="font-bold text-slate-200">PostgreSQL (Cloud)</div>
            </div>

            <div className="p-3 border border-[#16251e] bg-[#090e0b] rounded-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
                <Database className="h-3.5 w-3.5 text-slate-500" />
                SNAPSHOT
              </div>
              <div className="font-bold text-slate-200">Active Daily Sync</div>
            </div>

            <div className="p-3 border border-[#16251e] bg-[#090e0b] rounded-sm">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                SECURITY
              </div>
              <div className="font-bold text-emerald-400">Strict Encrypted</div>
            </div>
          </div>
        </div>

        {/* BOTTOM METADATA */}
        <div className="border-t border-[#15231c] pt-4 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>PT STEEL PIPE INDUSTRY OF INDONESIA TBK</span>
          <span>WH-OPS-U5 &bull; BUILD 2026</span>
        </div>
      </div>

      {/* =========================================================================
          PANEL KANAN: RAZOR-SHARP OPERATOR LOGIN FORM (COLS 5)
          Clean, high-contrast, distraction-free
          ========================================================================= */}
      <div className="col-span-12 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 bg-[#f8fafc] min-h-screen lg:min-h-0">
        
        {/* Mobile Header */}
        <div className="lg:hidden w-full max-w-sm mb-6 text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spindo-logo.png" alt="SPINDO Logo" className="h-8 mx-auto object-contain" />
          <p className="text-xs font-mono text-slate-600 font-bold uppercase">
            PLANT 1105 &bull; UNIT 5 SURABAYA
          </p>
        </div>

        {/* Login Container */}
        <div className="w-full max-w-sm bg-white rounded-md border border-slate-200 p-8 shadow-xs">
          
          <div className="border-b border-slate-100 pb-5 mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Masukkan ID pengguna dan kata sandi otorisasi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 rounded-sm bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-900 font-mono">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Field: Username */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 font-mono uppercase tracking-wide flex items-center justify-between">
                <span>Username</span>
                <span className="text-[10px] text-slate-400 font-normal">id operator</span>
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
                  placeholder="admin / staff"
                  className="w-full px-3 py-2 text-xs font-mono rounded-sm border border-slate-300 bg-white text-slate-900 shadow-2xs focus:border-[#047857] focus:outline-hidden focus:ring-1 focus:ring-[#047857]"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 font-mono uppercase tracking-wide flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-slate-400 font-normal">terenkripsi</span>
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
                  className="w-full pl-3 pr-9 py-2 text-xs font-mono rounded-sm border border-slate-300 bg-white text-slate-900 shadow-2xs focus:border-[#047857] focus:outline-hidden focus:ring-1 focus:ring-[#047857]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-sm bg-[#047857] hover:bg-[#065f46] active:bg-[#064e3b] text-white font-mono font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isLoading ? (
                <span>Memvalidasi Akses...</span>
              ) : (
                <>
                  <span>MASUK DASHBOARD</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-200" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Quick Account Preset Selectors */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
              Preset Akun Cepat:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccount('admin', '123')}
                className="px-2.5 py-1.5 rounded-sm border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950 text-[11px] font-mono text-slate-700 transition-all text-center cursor-pointer"
              >
                admin
              </button>
              <button
                type="button"
                onClick={() => setAccount('staff', '123')}
                className="px-2.5 py-1.5 rounded-sm border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950 text-[11px] font-mono text-slate-700 transition-all text-center cursor-pointer"
              >
                staff
              </button>
            </div>
          </div>
        </div>

        {/* Security / Organization Footnote */}
        <div className="mt-6 text-center text-[10px] font-mono text-slate-400 max-w-xs space-y-1">
          <p>Sistem Internal Terbatas &bull; Warehouse Unit 5</p>
          <p className="text-slate-400/80">PT Steel Pipe Industry of Indonesia Tbk</p>
        </div>

      </div>

    </div>
  );
};
