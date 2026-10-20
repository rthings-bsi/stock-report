'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Clock,
  Users,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession } from '@/types/auth';

interface LoginPageProps {
  onLogin: (session: UserSession, rememberMe?: boolean) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          rememberMe
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.user) {
        onLogin(
          {
            username: data.user.username,
            name: data.user.name,
            role: data.user.role,
            department: data.user.department || 'Warehouse Staff',
            unit: data.user.unit || 'Unit 5 - Spindo'
          },
          rememberMe
        );
      } else {
        setErrorMsg(data?.error || 'Username atau password tidak sesuai.');
      }
    } catch {
      setErrorMsg('Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans selection:bg-[#16805c] selection:text-white bg-white">

      {/* =========================================================================
          LEFT PANE: DESKTOP BRAND SHOWCASE (Clean Mint/Sky Tint with Spindo Assets)
          ========================================================================= */}
      <div
        className="relative hidden lg:flex lg:w-[56%] xl:w-[58%] p-8 xl:p-14 flex-col justify-between overflow-hidden text-slate-800 min-h-screen border-r border-slate-200/70"
        style={{
          background:
            'linear-gradient(135deg, #ffffff 0%, #f7fbff 38%, #edf7ff 72%, #e3f2ff 100%)'
        }}
      >

        {/* Subtle background gradient overlay for soft depth */}
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            background:
              'radial-gradient(circle at 12% 20%, rgba(209, 250, 229, 0.42) 0%, transparent 46%), radial-gradient(circle at 88% 66%, rgba(186, 230, 253, 0.45) 0%, transparent 55%)'
          }}
        />

        {/* TOP HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          {/* Logo & Company Name */}
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="h-7 w-[1.5px] bg-slate-300 mx-3.5" />
            <div className="text-xs font-semibold text-slate-700 leading-tight">
              <span className="block">PT Steel Pipe Industry</span>
              <span className="block text-slate-500 font-normal">of Indonesia</span>
            </div>
          </div>

          {/* Monitoring Gudang Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-emerald-200/70 text-xs font-semibold text-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span>Monitoring Gudang</span>
          </div>
        </div>

        {/* CENTER HERO & FEATURES */}
        <div className="relative z-10 my-auto py-6 xl:py-10 space-y-6 max-w-xl">
          {/* Green Top Accent Bar */}
          <div className="w-12 h-1.5 rounded-full bg-[#16805c]" />

          {/* Main Title */}
          <div className="space-y-1">
            <h1 className="text-5xl xl:text-[60px] font-black tracking-tight leading-[1.08] select-none">
              <span className="block text-[#022854]">Pergerakan</span>
              <span className="block text-[#16805c]">Barang</span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-slate-600 text-sm xl:text-base max-w-md font-normal leading-relaxed">
            Catat dan pantau seluruh pergerakan barang, kapasitas stok pipa, segregasi NC, dan mutasi packaging secara akurat.
          </p>

          {/* Feature Highlights Row */}
          <div className="flex flex-wrap items-center gap-6 xl:gap-8 pt-3">
            {/* 1. Real-time */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-[#16805c] flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
                <Clock className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 leading-tight">Real-time</div>
                <div className="text-xs text-slate-500 leading-tight mt-0.5">Update langsung</div>
              </div>
            </div>

            {/* 2. Multi-user */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100/70 text-[#0284c7] flex items-center justify-center shrink-0 border border-sky-200/60 shadow-2xs">
                <Users className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 leading-tight">Multi-user</div>
                <div className="text-xs text-slate-500 leading-tight mt-0.5">Akses peran</div>
              </div>
            </div>

            {/* 3. SAP Import */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100/70 text-[#16805c] flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
                <FileSpreadsheet className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 leading-tight">SAP Import</div>
                <div className="text-xs text-slate-500 leading-tight mt-0.5">Otomatis</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM FACTORY & PIPES ILLUSTRATION */}
        <div
          className="relative w-full -mb-8 -mx-8 xl:-mb-14 xl:-mx-14 pointer-events-none select-none overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, #000 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, #000 90%, transparent 100%)'
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/warehouse-illustration.webp"
            alt="Spindo Warehouse and Pipes Illustration"
            className="w-full h-[260px] xl:h-[300px] object-cover object-bottom origin-left scale-x-110 pointer-events-none saturate-125 contrast-105"
          />
          {/* Fade the cropped caption area at the top into the pane */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#f4faff] via-[#f4faff]/85 to-transparent" />
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>&copy; 2026 SPINDO</span>
          <span>
            Created by <strong className="text-slate-900 font-bold ml-0.5">Ricky Satria</strong>
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANE / MOBILE VIEW: FORM LOGIN
          ========================================================================= */}
      <div className="relative w-full lg:w-[44%] xl:w-[42%] min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16 overflow-hidden bg-[linear-gradient(155deg,#f3f9ff_0%,#ffffff_48%,#e8f4ff_100%)]">

        {/* Decorative background accents */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-sky-200/25 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-emerald-200/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rotate-12 bg-white/35" />
        </div>

        {/* Mobile-Only Top Brand Bar */}
        <div className="relative z-10 lg:hidden flex items-center justify-between w-full max-w-md mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-8 w-auto object-contain"
            />
            <div className="text-[11px] font-semibold text-slate-700 leading-tight">
              <span className="block">PT Steel Pipe Industry</span>
              <span className="block text-slate-500 font-normal">of Indonesia</span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-semibold text-emerald-900">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Monitoring Gudang</span>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[480px] xl:max-w-[520px] space-y-7">

          {/* Brand mark above the greeting (desktop only; mobile has the top bar) */}
          <div className="hidden lg:flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-14 xl:h-16 w-auto object-contain"
            />
          </div>

          {/* Greeting Header */}
          <div className="space-y-2 text-center">
            <h2 className="text-3xl sm:text-[40px] font-black text-[#022854] tracking-tight">
              Halo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Pakai akun SPINDO kamu untuk masuk ke sistem
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-1">

            {/* Error Notification */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/90 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in zoom-in-95 duration-150 font-mono">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Field: Username */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700 block text-left">
                Username
              </label>
              <div className="relative">
                <User className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 shadow-2xs focus:border-[#16805c] focus:outline-hidden focus:ring-4 focus:ring-[#16805c]/10 transition-all placeholder:text-slate-400 font-mono"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-700 block text-left">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4.5 w-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-11 py-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 shadow-2xs focus:border-[#16805c] focus:outline-hidden focus:ring-4 focus:ring-[#16805c]/10 transition-all placeholder:text-slate-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
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

            {/* Remember Me & Forgot Password Link */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900 font-sans">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#16805c] focus:ring-[#16805c]/20 h-4 w-4 cursor-pointer accent-[#16805c]"
                />
                <span>Ingat Saya</span>
              </label>

              <a
                href="https://wa.me/6287776216046?text=Halo%20Admin%2C%20saya%20ingin%20reset%20password%20akun%20Spindo%20Warehouse."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#16805c] hover:text-[#116246] font-semibold hover:underline cursor-pointer"
              >
                Lupa Password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-4 px-4 rounded-xl bg-[#16805c] hover:bg-[#126c4d] active:bg-[#0e563e] text-white font-bold text-[15px] shadow-[0_12px_30px_-12px_rgba(22,128,92,0.55)] hover:shadow-lg hover:shadow-[#16805c]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 group"
            >
              {isLoading ? (
                <span className="animate-pulse">Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4 text-emerald-100 group-hover:translate-x-1 transition-transform" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          {/* Mobile Footer Meta */}
          <div className="lg:hidden text-center pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
            <span>&copy; 2026 SPINDO &bull; Created by Ricky Satria</span>
          </div>

        </div>

      </div>

    </div>
  );
};
