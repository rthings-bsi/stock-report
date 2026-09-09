'use client';

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  AlertCircle
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
      // 1. Validasi ke Backend SQLite API
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
    <div className="relative min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-emerald-900 selection:text-white overflow-hidden">

      {/* Background Decorative Blur (Brand Emerald) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-100/40 rounded-[100%] blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white shadow-sm border border-slate-200/80 animate-in fade-in zoom-in-50 duration-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Main Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div
            className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700"
            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
          >
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              WAREHOUSE SYSTEM
            </h1>
            <p className="text-xs text-slate-500 font-mono tracking-wide uppercase">
              Unit 5 &bull; Spindo
            </p>
          </div>
        </div>

        {/* Login Form Container */}
        <div
          className="rounded-xl border border-slate-200/90 bg-white/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-8 duration-700"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 font-mono animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            <div
              className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: '550ms', animationFillMode: 'both' }}
            >
              <label className="text-[10px] font-bold text-slate-600 uppercase font-mono flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2.5} />
                <span>Username</span>
              </label>
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white/50 text-sm sm:text-xs font-mono text-slate-900 shadow-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 transition-all"
              />
            </div>

            <div
              className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500"
              style={{ animationDelay: '650ms', animationFillMode: 'both' }}
            >
              <label className="text-[10px] font-bold text-slate-600 uppercase font-mono flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2.5} />
                <span>Password</span>
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
                  placeholder="Masukkan password"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white/50 text-sm sm:text-xs font-mono text-slate-900 shadow-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4.5 w-4.5" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-500 hover:ring-2 hover:ring-emerald-600/30 group"
              style={{ animationDelay: '800ms', animationFillMode: 'both' }}
            >
              {isLoading ? (
                <span className="animate-pulse">Memvalidasi Akses...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-emerald-200 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
