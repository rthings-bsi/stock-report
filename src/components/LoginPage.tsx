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
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans selection:bg-[#006041] selection:text-white bg-[#f4f2ef]">

      {/* =========================================================================
          LEFT PANE: FORE-INSPIRED EDITORIAL WARM LINEN SHOWCASE
          ========================================================================= */}
      <div className="relative hidden lg:flex lg:w-[56%] xl:w-[58%] p-8 xl:p-14 flex-col justify-between overflow-hidden text-[#222126] min-h-screen bg-[#f4f2ef] border-r border-[#e6e2db]">

        {/* Soft botanical organic circle halo (echoing Fore's hero visual pedestal) */}
        <div
          className="pointer-events-none absolute -right-24 bottom-10 h-[520px] w-[520px] rounded-full bg-[#e7f0ee]/80 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-24 top-20 h-[340px] w-[340px] rounded-full bg-[#d0d784]/18 blur-3xl"
          aria-hidden="true"
        />

        {/* TOP HEADER */}
        <div className="relative z-10 flex items-center justify-between">
          {/* Logo & Company Name (SPINDO logo preserved unaltered) */}
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-10 w-auto object-contain"
            />
            <div className="h-7 w-[1px] bg-[#d5cfc5] mx-3.5" />
            <div className="text-xs font-semibold text-[#1e4a3c] leading-tight">
              <span className="block font-bold">PT Steel Pipe Industry</span>
              <span className="block text-[#787470] font-medium">of Indonesia • Unit 5 Karawang</span>
            </div>
          </div>
        </div>

        {/* CENTER HERO & FEATURES */}
        <div className="relative z-10 my-auto py-6 xl:py-10 space-y-6 max-w-xl">
          {/* Wide-tracked editorial eyebrow (Fore APP kicker rhythm) */}
          <div className="relative z-10 flex items-center gap-3">
            <span className="inline-block w-8 h-[2px] rounded-full bg-[#97a259]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#1e4a3c]">
              Warehouse Analytics
            </span>
          </div>

          {/* Main Display Title with Fore-inspired hollow watermark sweeping behind top edge */}
          <div className="relative space-y-1">
            <div
              aria-hidden="true"
              className="fore-watermark absolute -top-9 -left-2 text-[74px] xl:text-[90px] font-extrabold tracking-[-0.04em] leading-none whitespace-nowrap opacity-80"
            >
              spindo unit 5
            </div>
            <h1 className="relative z-10 text-5xl xl:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.04] select-none">
              <span className="block text-[#1a4034]">Pergerakan</span>
              <span className="block text-[#006041]">Barang.</span>
            </h1>
          </div>

          {/* Editorial Description in Fore Seed-Olive Accent */}
          <p className="relative text-[#6f7a3c] text-[15px] xl:text-[17px] max-w-md font-medium leading-relaxed">
            Catat dan pantau seluruh pergerakan barang, kapasitas stok pipa, segregasi NC, dan mutasi packaging secara akurat.
          </p>

          {/* Feature Highlights Row (Organic Fore White Cards on Linen) */}
          <div className="relative grid grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-[18px] bg-white/95 border border-[#e6e2db] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="w-9 h-9 rounded-full bg-[#e7f0ee] text-[#006041] flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1a4034] leading-tight truncate">Real-time</div>
                <div className="text-[11px] text-[#787470] leading-tight mt-0.5 truncate">Update langsung</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-[18px] bg-white/95 border border-[#e6e2db] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="w-9 h-9 rounded-full bg-[#f4f6e8] text-[#75813f] flex items-center justify-center shrink-0 border border-[#d0d784]/60">
                <Users className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1a4034] leading-tight truncate">Multi-user</div>
                <div className="text-[11px] text-[#787470] leading-tight mt-0.5 truncate">Akses peran</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-[18px] bg-white/95 border border-[#e6e2db] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="w-9 h-9 rounded-full bg-[#e7f0ee] text-[#006041] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#1a4034] leading-tight truncate">SAP Import</div>
                <div className="text-[11px] text-[#787470] leading-tight mt-0.5 truncate">Otomatis</div>
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
            className="w-full h-[250px] xl:h-[290px] object-cover object-bottom origin-left scale-x-105 pointer-events-none saturate-110 contrast-105"
          />
          {/* Feather top & bottom edges seamlessly into Fore warm linen (#f4f2ef) */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f4f2ef] via-[#f4f2ef]/85 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#f4f2ef] via-[#f4f2ef]/60 to-transparent" />
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-xs text-[#1e4a3c]/80 font-medium">
          <span>&copy; 2026 SPINDO</span>
          <span>
            Created by <strong className="text-[#1a4034] font-bold ml-0.5">Ricky Satria</strong>
          </span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT PANE / MOBILE VIEW: CLEAN PORCELAIN FORM LOGIN
          ========================================================================= */}
      <div className="relative w-full lg:w-[44%] xl:w-[42%] min-h-screen flex flex-col bg-white overflow-hidden">

        {/* Subtle warm botanical ambient corner accents */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-28 top-16 h-[340px] w-[340px] rounded-full bg-[#e7f0ee]/55 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-[340px] w-[340px] rounded-full bg-[#f4f2ef] blur-3xl" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16">
          {/* Mobile-Only Top Brand Bar */}
          <div className="lg:hidden flex items-center justify-between w-full max-w-md mb-8 pb-4 border-b border-[#efece6]">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/spindo-logo.png"
                alt="SPINDO Logo"
                className="h-8 w-auto object-contain"
              />
              <div className="text-[11px] font-bold text-[#1e4a3c] leading-tight">
                <span className="block">PT Steel Pipe Industry</span>
                <span className="block text-[#787470] font-medium">of Indonesia</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[440px] space-y-7">
            {/* Greeting Header */}
            <div className="space-y-2 text-center">
              <h2 className="text-4xl sm:text-[44px] font-extrabold text-[#006041] tracking-[-0.03em] leading-tight">
                Halo
              </h2>
              <p className="text-xs sm:text-sm text-[#787470] font-medium">
                Pakai akun SPINDO kamu untuk masuk ke dashboard gudang
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 pt-1">
              {/* Error Notification */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/90 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in zoom-in-95 duration-150 font-medium">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                  <span className="leading-snug">{errorMsg}</span>
                </div>
              )}

              {/* Field: Username */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#1a4034] block text-left">
                  Username
                </label>
                <div className="relative">
                  <User className="h-4.5 w-4.5 text-[#9d9992] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
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
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-[#ddd8cf] bg-[#faf8f5] text-sm text-[#222126] focus:bg-white focus:border-[#006041] focus:outline-hidden focus:ring-4 focus:ring-[#006041]/10 transition-all placeholder:text-[#a6a29a] font-medium"
                  />
                </div>
              </div>

              {/* Field: Password */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#1a4034] block text-left">
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4.5 w-4.5 text-[#9d9992] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.8} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg('');
                    }}
                    placeholder="••••••••••"
                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-[#ddd8cf] bg-[#faf8f5] text-sm text-[#222126] focus:bg-white focus:border-[#006041] focus:outline-hidden focus:ring-4 focus:ring-[#006041]/10 transition-all placeholder:text-[#a6a29a] font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9d9992] hover:text-[#006041] p-1.5 rounded-full hover:bg-[#e7f0ee]/60 transition-colors cursor-pointer"
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
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[#59575c] hover:text-[#222126] font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#d5cfc5] text-[#006041] focus:ring-[#006041]/20 h-4 w-4 cursor-pointer accent-[#006041]"
                  />
                  <span>Ingat Saya</span>
                </label>

                <a
                  href="https://wa.me/6287776216046?text=Halo%20Admin%2C%20saya%20ingin%20reset%20password%20akun%20Spindo%20Warehouse."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#006041] hover:text-[#1a4034] font-bold hover:underline cursor-pointer"
                >
                  Lupa Password?
                </a>
              </div>

              {/* Fore Signature Full-Pill Primary CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="fore-pill-primary w-full mt-2 py-4 px-6 text-[15px] shadow-[0_12px_28px_-10px_rgba(0,96,65,0.48)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 group"
              >
                {isLoading ? (
                  <span className="animate-pulse">Memproses Masuk...</span>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="h-4 w-4 text-[#d0d784] group-hover:translate-x-1 transition-transform" strokeWidth={2.4} />
                  </>
                )}
              </button>
            </form>

            {/* Mobile Footer Meta */}
            <div className="lg:hidden text-center pt-6 border-t border-[#efece6] text-[11px] font-medium text-[#787470]">
              <span>&copy; 2026 SPINDO &bull; Created by Ricky Satria</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
