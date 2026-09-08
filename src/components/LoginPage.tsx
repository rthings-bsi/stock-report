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
    <div className="min-h-screen w-full bg-slate-100/80 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-emerald-900 selection:text-white">
      <div className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white shadow-xs border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Main Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              SPINDO WAREHOUSE SYSTEM
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              PT Steel Pipe Industry of Indonesia Tbk • Unit 5
            </p>
          </div>
        </div>

        {/* Login Form Container */}
        <div className="rounded-md border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMsg && (
              <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800 font-mono animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={2} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase font-mono flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
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
                className="w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-700 transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase font-mono flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-400" strokeWidth={2} />
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
                  className="w-full pl-3 pr-9 py-2 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 shadow-2xs focus:border-emerald-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-700 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-md bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer font-mono disabled:opacity-70"
            >
              {isLoading ? (
                <span>Memvalidasi Akses...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4 text-amber-300" strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
