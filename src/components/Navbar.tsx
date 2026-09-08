'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Upload,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Check,
  SlidersHorizontal,
  RefreshCw,
  History,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserSession } from '@/types/auth';

export interface SnapshotMeta {
  snapshot_key: string;
  last_updated: string;
  created_at: string;
}

interface NavbarProps {
  lastUpdated: string;
  onOpenUpload: () => void;
  onResetData: () => void;
  onSaveData: () => void;
  onSelectSnapshot: (key: string) => void;
  onOpenThemeModal?: () => void;
  appTitle?: string;
  isCustomizingLayout?: boolean;
  onToggleCustomizeLayout?: () => void;
  isSaving?: boolean;
  saveSuccess?: boolean;
  isCustomData: boolean;
  selectedSnapshotKey?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const Navbar: React.FC<NavbarProps> = ({
  lastUpdated,
  onOpenUpload,
  onResetData,
  onSaveData,
  onSelectSnapshot,
  onOpenThemeModal,
  appTitle = 'Spindo Unit 5 - Warehouse',
  isCustomizingLayout = false,
  onToggleCustomizeLayout,
  isSaving = false,
  saveSuccess = false,
  isCustomData,
  selectedSnapshotKey = 'latest',
  isSidebarOpen = true,
  onToggleSidebar,
  onToggleMobileSidebar,
  currentUser = null,
  onLogout
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [isOpenMenu, setIsOpenMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mini Calendar View Month & Year
  const [currentViewDate, setCurrentViewDate] = useState<Date>(new Date(2026, 8, 1)); // Default Sep 2026

  const fetchSnapshots = async () => {
    try {
      const res = await fetch('/api/warehouse?list=true');
      const json = await res.json();
      if (json?.success && json?.snapshots) {
        setSnapshots(json.snapshots);
      }
    } catch (e) {
      console.error('Failed to fetch snapshots list:', e);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [lastUpdated, saveSuccess]);

  // Click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Map available snapshot dates: 'YYYY-MM-DD' -> snapshot_key
  const availableDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    snapshots.forEach((s) => {
      if (s.snapshot_key.startsWith('snap_')) {
        const dateStr = s.snapshot_key.replace('snap_', '');
        map[dateStr] = s.snapshot_key;
      }
    });
    return map;
  }, [snapshots]);

  // Find active date string (YYYY-MM-DD)
  const activeDateString = useMemo(() => {
    if (selectedSnapshotKey === 'latest') return 'latest';
    return selectedSnapshotKey.replace('snap_', '');
  }, [selectedSnapshotKey]);

  const activeDateLabel = useMemo(() => {
    if (selectedSnapshotKey === 'latest') {
      return lastUpdated.slice(0, 10);
    }
    return selectedSnapshotKey.replace('snap_', '');
  }, [selectedSnapshotKey, lastUpdated]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean; hasData: boolean; snapKey?: string }> = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false, hasData: false });
    }

    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const snapKey = availableDateMap[dateStr];
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        hasData: Boolean(snapKey),
        snapKey
      });
    }

    return days;
  }, [currentViewDate, availableDateMap]);

  const handlePrevMonth = () => {
    setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-950/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`hidden md:flex h-9 w-9 items-center justify-center rounded-md border transition-all cursor-pointer shadow-2xs ${
                isSidebarOpen
                  ? 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-bold'
              }`}
              title={isSidebarOpen ? 'Sembunyikan Sidebar (Ctrl+B)' : 'Tampilkan Sidebar (Ctrl+B)'}
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
              ) : (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          )}

          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
              title="Menu Navigasi"
              aria-label="Toggle Mobile Menu"
            >
              <Menu className="h-4.5 w-4.5" strokeWidth={2} />
            </button>
          )}

          <div className="flex h-9 items-center justify-center rounded-md bg-white px-1.5 py-1 border border-slate-200/80 shadow-2xs shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spindo-logo.png"
              alt="SPINDO Logo"
              className="h-6.5 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900">
                {appTitle || 'Spindo Unit 5 - Warehouse'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions with Compact Menu */}
        <div className="flex items-center gap-2.5">
          {/* User Badge in Header */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200/80 bg-slate-50 shadow-2xs font-mono">
              {currentUser.role === 'admin' ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-800 shrink-0" strokeWidth={2} />
              ) : (
                <UserIcon className="h-3.5 w-3.5 text-slate-600 shrink-0" strokeWidth={2} />
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 leading-none">
                  {currentUser.username}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    currentUser.role === 'admin'
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                      : 'bg-slate-200/80 text-slate-700 border-slate-300'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'ADMIN' : 'STAFF'}
                </span>
              </div>
            </div>
          )}

          {/* Unified Dropdown Menu Button with Mini Calendar */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                fetchSnapshots();
                setIsOpenMenu(!isOpenMenu);
              }}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-2xs ${
                isOpenMenu || isCustomizingLayout
                  ? 'border-emerald-800 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} />
              <span className="hidden sm:inline">
                {isCustomizingLayout ? 'Mode Edit Aktif' : `Tgl: ${activeDateLabel}`}
              </span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isOpenMenu ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>

            {/* Dropdown Content */}
            {isOpenMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150 font-mono text-xs">
                {/* User Info Header in Dropdown */}
                {currentUser && (
                  <div className="mb-2 p-2 rounded-md bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>{currentUser.name}</span>
                      <span className={`text-[9px] font-bold px-1 rounded ${
                        currentUser.role === 'admin' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {currentUser.role === 'admin' ? 'Full Access' : 'View Only'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[10px]">{currentUser.department}</div>
                  </div>
                )}

                {/* 0. Upload Raw Data SAP Action (Admin Only) */}
                {currentUser?.role === 'admin' && onOpenUpload && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenUpload();
                      setIsOpenMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-950 text-slate-800 transition-colors cursor-pointer text-[11px] mb-1"
                  >
                    <Upload className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
                    <span>Upload Raw Data SAP</span>
                  </button>
                )}

                {/* 1. Atur Posisi Card Toggle (Admin Only) */}
                {currentUser?.role === 'admin' && onToggleCustomizeLayout && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleCustomizeLayout();
                      setIsOpenMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between transition-colors cursor-pointer mb-1 ${
                      isCustomizingLayout
                        ? 'bg-emerald-800 text-white font-bold'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="h-3.5 w-3.5 text-slate-500" strokeWidth={2} />
                      <span className="text-[11px]">{isCustomizingLayout ? 'Selesai Atur Card' : 'Atur Posisi & Ukuran Card'}</span>
                    </div>
                    {isCustomizingLayout && <Check className="h-3 w-3 text-amber-300" strokeWidth={2.5} />}
                  </button>
                )}

                {/* Kustomisasi Desain UI Modal Trigger (Admin Only) */}
                {currentUser?.role === 'admin' && onOpenThemeModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenThemeModal();
                      setIsOpenMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded flex items-center gap-2 hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer text-[11px] mb-1.5"
                  >
                    <Palette className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
                    <span>Kustomisasi Judul & Tema UI</span>
                  </button>
                )}

                <div className="my-1.5 border-t border-slate-100" />

                    {/* 2. Mini Calendar Header */}
                    <div className="flex items-center justify-between px-1 py-1 mb-2">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-emerald-800" />
                        {MONTH_NAMES[currentViewDate.getMonth()]} {currentViewDate.getFullYear()}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Bulan Sebelumnya"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Bulan Berikutnya"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Day Labels */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
                      <span>M</span>
                      <span>S</span>
                      <span>S</span>
                      <span>R</span>
                      <span>K</span>
                      <span>J</span>
                      <span>S</span>
                    </div>

                    {/* Calendar Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {calendarDays.map((item, idx) => {
                        if (!item.isCurrentMonth) {
                          return <div key={`empty-${idx}`} className="h-7 w-7" />;
                        }

                        const isSelected = activeDateString === item.dateStr;
                        const hasData = item.hasData;

                        return (
                          <button
                            key={item.dateStr}
                            type="button"
                            disabled={!hasData}
                            onClick={() => {
                              if (item.snapKey) {
                                onSelectSnapshot(item.snapKey);
                                setIsOpenMenu(false);
                              }
                            }}
                            className={`h-7 w-7 rounded-md flex flex-col items-center justify-center text-[11px] transition-all relative ${
                              isSelected
                                ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                                : hasData
                                ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300/80 font-bold cursor-pointer'
                                : 'text-slate-300 hover:bg-transparent cursor-not-allowed font-normal'
                            }`}
                          >
                            <span>{item.day}</span>
                            {hasData && !isSelected && (
                              <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-700" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick select: Data Terkini (Aktif) */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSnapshot('latest');
                          setIsOpenMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-[11px] ${
                          selectedSnapshotKey === 'latest'
                            ? 'bg-emerald-800 text-white font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <History className={`h-3.5 w-3.5 ${selectedSnapshotKey === 'latest' ? 'text-amber-300' : 'text-emerald-700'}`} />
                          <span>Data Terkini (Aktif)</span>
                        </div>
                        <span className={`text-[10px] ${selectedSnapshotKey === 'latest' ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {lastUpdated.slice(0, 10)}
                        </span>
                      </button>
                    </div>

                {/* Reset Option if custom */}
                {currentUser?.role === 'admin' && isCustomData && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onResetData();
                        setIsOpenMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-amber-50 text-amber-900 transition-colors cursor-pointer text-[11px]"
                    >
                      <RefreshCw className="h-3 w-3 text-amber-700" />
                      <span>Reset ke Data Awal</span>
                    </button>
                  </div>
                )}

                {/* Logout Option */}
                {onLogout && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        setIsOpenMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer text-[11px] font-bold"
                    >
                      <LogOut className="h-3.5 w-3.5 text-rose-600" />
                      <span>Keluar / Ganti Akun</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
