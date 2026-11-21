'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuBannerProps {
  title: string;
  icon: LucideIcon;
  watermark?: string;
  children?: React.ReactNode;
  className?: string;
}

export interface BannerSelectOption {
  value: string;
  label: string;
}

interface BannerSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: BannerSelectOption[];
  icon: LucideIcon;
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  highlightSelected?: boolean;
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

/** Dropdown pill bergaya Fore yang terintegrasi dengan `MenuBanner` (tanpa popup `<select>` bawaan OS). */
export const BannerSelect: React.FC<BannerSelectProps> = ({
  value,
  onChange,
  options,
  icon: Icon,
  placeholder = 'Pilih opsi',
  disabled = false,
  title,
  ariaLabel,
  highlightSelected = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isEffectiveDisabled = disabled || options.length === 0;
  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];
  const displayLabel = selectedOption?.label ?? placeholder;

  return (
    <div ref={containerRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        disabled={isEffectiveDisabled}
        onClick={() => {
          if (!isEffectiveDisabled) setIsOpen((prev) => !prev);
        }}
        title={title}
        aria-label={ariaLabel || title || displayLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'h-9 inline-flex items-center justify-between gap-2 rounded-full border px-3.5 text-xs font-bold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d0d784]/60 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap',
          isOpen
            ? 'bg-white text-[#1a4034] border-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.25)]'
            : 'bg-white/12 hover:bg-white/20 text-white border-white/25'
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-colors',
              isOpen ? 'text-[#006041]' : 'text-[#d0d784]'
            )}
          />
          <span
            className={cn(
              'truncate max-w-[220px] sm:max-w-[260px]',
              !isOpen && highlightSelected && value !== 'ALL' && 'text-amber-300'
            )}
          >
            {displayLabel}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
            isOpen ? 'rotate-180 text-[#006041]' : 'text-[#d4e5e0]'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel || title || 'Pilih Opsi'}
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 min-w-[196px] w-max max-w-[85vw] max-h-72 overflow-y-auto rounded-[18px] bg-white border border-[#e6e2db] shadow-[0_18px_40px_-12px_rgba(26,64,52,0.28)] p-1.5 z-50 space-y-0.5"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[12px] text-xs transition-colors cursor-pointer text-left whitespace-nowrap',
                  isSelected
                    ? 'bg-[#006041] text-white font-bold shadow-2xs'
                    : 'text-[#222126] hover:bg-[#e7f0ee] hover:text-[#006041] font-semibold'
                )}
              >
                <span>{opt.label}</span>
                <Check
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    isSelected ? 'text-[#d0d784] opacity-100' : 'opacity-0'
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
        'relative z-30 bg-gradient-to-r from-[#1a4034] via-[#006041] to-[#1e4a3c] text-white px-5 py-4 sm:px-6 sm:py-4.5 rounded-[22px] border border-[#1a4034]/30 shadow-[0_10px_28px_-12px_rgba(0,96,65,0.45)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
        className
      )}
    >
      {watermark && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]" aria-hidden="true">
          <span
            className="select-none absolute -right-4 -bottom-5 text-[64px] font-extrabold tracking-[-0.04em] leading-none text-transparent"
            style={{ WebkitTextStroke: '1px rgba(208, 215, 132, 0.14)' }}
          >
            {watermark}
          </span>
        </div>
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
