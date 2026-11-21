'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuBannerProps {
  title: string;
  icon: LucideIcon;
  watermark?: string;
  children?: React.ReactNode;
  className?: string;
}

/** Tombol aksi utama di dalam banner menu (White Fore Pill CTA). */
export const BANNER_PRIMARY_BTN =
  'h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-full bg-white hover:bg-[#f4f2ef] text-[#006041] font-extrabold text-xs transition-all shadow-xs active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap';

/** Tombol sekunder / navigasi di dalam banner menu (Translucent Glass Pill). */
export const BANNER_GLASS_BTN =
  'h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-full bg-white/12 hover:bg-white/20 text-white border border-white/25 font-bold text-xs transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0 whitespace-nowrap';

/** Tombol ikon saja di dalam banner menu (Circular Glass Icon Pill). */
export const BANNER_ICON_BTN =
  'h-9 w-9 inline-flex items-center justify-center rounded-full bg-white/12 hover:bg-white/20 text-[#d0d784] hover:text-white border border-white/25 transition-colors disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer shrink-0';

/** Tombol reset filter aktif di dalam banner menu (High-visibility Amber Pill). */
export const BANNER_RESET_BTN =
  'h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#18191f] text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 whitespace-nowrap';

/** Wadah kontrol segmentasi di dalam banner menu (mis. ALL / LT / ST atau ALL / FG / WIP). */
export const BANNER_SEGMENT_WRAP =
  'h-9 inline-flex items-center gap-0.5 bg-white/12 p-1 rounded-full border border-white/25 shrink-0';

/** Tombol segment aktif vs tidak aktif di dalam banner. */
export const BANNER_SEGMENT_BTN = (active: boolean) =>
  cn(
    'h-7 px-3 rounded-full text-xs transition-all cursor-pointer whitespace-nowrap',
    active
      ? 'bg-white text-[#006041] font-extrabold shadow-2xs'
      : 'text-[#e7f0ee] hover:text-white hover:bg-white/10 font-bold'
  );

/** Wadah dropdown/select pill di dalam banner menu. */
export const BANNER_SELECT_WRAP =
  'h-9 relative inline-flex items-center gap-1.5 bg-white/12 hover:bg-white/20 rounded-full border border-white/25 px-3.5 transition-colors shrink-0';

/** Elemen `<select>` di dalam `BANNER_SELECT_WRAP`. */
export const BANNER_SELECT_CLS =
  'bg-transparent text-xs font-bold text-white pr-5 appearance-none focus:outline-none cursor-pointer disabled:opacity-50';

/** Elemen `<option>` terbaca kontras di Windows/macOS. */
export const BANNER_SELECT_OPT_CLS = 'text-[#222126] bg-white font-sans';

/** Banner header standar untuk seluruh menu dashboard SPINDO bergaya Fore Botanical Foliage. */
export const MenuBanner: React.FC<MenuBannerProps> = ({
  title,
  icon: Icon,
  watermark,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-r from-[#1a4034] via-[#006041] to-[#1e4a3c] text-white px-5 py-4 sm:px-6 sm:py-4.5 rounded-[22px] border border-[#1a4034]/30 shadow-[0_10px_28px_-12px_rgba(0,96,65,0.45)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        className
      )}
    >
      {watermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none select-none absolute -right-4 -bottom-5 text-[64px] font-extrabold tracking-[-0.04em] leading-none text-transparent"
          style={{ WebkitTextStroke: '1px rgba(208, 215, 132, 0.14)' }}
        >
          {watermark}
        </span>
      )}

      <div className="relative z-10 flex items-center gap-3.5 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 border border-[#d0d784]/35 text-[#d0d784]">
          <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
        </div>
        <h1 className="text-base sm:text-lg font-extrabold text-white font-sans tracking-[-0.02em] truncate">
          {title}
        </h1>
      </div>

      {children && (
        <div className="relative z-10 flex items-center gap-2 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
};
