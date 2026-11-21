'use client';

import React, { useState, useEffect } from 'react';
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';

export type CardWidth = 'col-span-12' | 'col-span-8' | 'col-span-7' | 'col-span-6' | 'col-span-5' | 'col-span-4';

export interface CardLayoutItem {
  id: string;
  width: CardWidth;
  visible?: boolean;
}

interface CustomizableCardProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  width: CardWidth;
  onWidthChange?: (newWidth: CardWidth) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  isCustomizing?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode | ((expanded: boolean) => React.ReactNode);
}

const WIDTH_OPTIONS: { label: string; value: CardWidth; short: string }[] = [
  { label: 'Penuh (100%)', value: 'col-span-12', short: '100%' },
  { label: 'Lebar 2/3 (66%)', value: 'col-span-8', short: '66%' },
  { label: 'Lebar 7/12 (58%)', value: 'col-span-7', short: '58%' },
  { label: 'Separuh (50%)', value: 'col-span-6', short: '50%' },
  { label: 'Lebar 5/12 (42%)', value: 'col-span-5', short: '42%' },
  { label: 'Kompak (33%)', value: 'col-span-4', short: '33%' },
];

const COL_SPAN_MAP: Record<string, string> = {
  'col-span-12': 'col-span-12 md:col-span-12 lg:col-span-12',
  'col-span-8': 'col-span-12 md:col-span-7 lg:col-span-8',
  'col-span-7': 'col-span-12 md:col-span-7 lg:col-span-7',
  'col-span-6': 'col-span-12 md:col-span-6 lg:col-span-6',
  'col-span-5': 'col-span-12 md:col-span-5 lg:col-span-5',
  'col-span-4': 'col-span-12 md:col-span-5 lg:col-span-4',
  'col-span-12 lg:col-span-8': 'col-span-12 md:col-span-7 lg:col-span-8',
  'col-span-12 lg:col-span-4': 'col-span-12 md:col-span-5 lg:col-span-4',
};

export const CustomizableCard: React.FC<CustomizableCardProps> = ({
  id,
  title,
  subtitle,
  badge,
  icon: Icon,
  width,
  onWidthChange,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
  isCustomizing = false,
  headerAction,
  children
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191f]/60 backdrop-blur-xs p-2 sm:p-3 lg:p-4 animate-in fade-in duration-150">
        <div className="flex flex-col w-full h-full max-w-[98vw] 2xl:max-w-[1880px] rounded-[24px] border border-[#e6e2db] bg-white shadow-2xl overflow-hidden">
          {/* Expanded Header */}
          <div className="flex items-center justify-between border-b border-[#efece6] px-6 py-4 bg-[#faf8f5] shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="h-9 w-9 rounded-full bg-[#e7f0ee] text-[#006041] border border-[#cde0d9] flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-[#1a4034] truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-[#787470] font-medium truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {badge}
              {headerAction}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="fore-pill-outline flex items-center gap-1.5 px-4 py-1.5 text-xs cursor-pointer active:scale-95"
                title="Tutup mode layar penuh (Esc)"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Tutup Layar Penuh</span>
              </button>
            </div>
          </div>
          {/* Expanded Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-auto flex flex-col min-h-0 bg-white">
            {typeof children === 'function' ? children(true) : children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-card-id={id}
      className={`fore-card flex flex-col justify-between overflow-hidden min-w-0 ${
        isCustomizing
          ? 'border-[#006041]! ring-2 ring-[#006041]/20'
          : ''
      } ${COL_SPAN_MAP[width] || 'col-span-12'}`}
    >
      {/* Header Card (Fore warm linen porcelain tint) */}
      <div className="border-b border-[#efece6] px-5 py-3.5 bg-[#faf8f5]/90 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          {isCustomizing && (
            <div className="text-[#006041] cursor-grab active:cursor-grabbing p-0.5">
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          {Icon && (
            <div className="h-8 w-8 rounded-full bg-[#e7f0ee] text-[#006041] flex items-center justify-center shrink-0">
              <Icon className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[13px] font-extrabold tracking-tight text-[#1a4034] truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[#787470] font-medium truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {badge}
          {headerAction}

          {/* Tombol Kustomisasi Layout */}
          {isCustomizing && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-full border border-[#e6e2db]">
              <select
                value={width}
                onChange={(e) => onWidthChange && onWidthChange(e.target.value as CardWidth)}
                className="text-[10px] font-bold text-[#1a4034] bg-[#f4f2ef] px-2 py-0.5 rounded-full border border-[#e6e2db] cursor-pointer focus:outline-hidden"
              >
                {WIDTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.short}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!canMoveLeft}
                onClick={onMoveLeft}
                title="Pindahkan ke atas / kiri"
                className="p-1 rounded-full hover:bg-[#e7f0ee] text-[#1a4034] disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                disabled={!canMoveRight}
                onClick={onMoveRight}
                title="Pindahkan ke bawah / kanan"
                className="p-1 rounded-full hover:bg-[#e7f0ee] text-[#1a4034] disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Tombol Expand Layar Penuh */}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            title="Perbesar kartu ke layar penuh"
            className="h-7 w-7 rounded-full border border-[#e6e2db] bg-white text-[#787470] hover:text-[#006041] hover:border-[#006041]/40 hover:bg-[#e7f0ee]/60 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body Card */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col min-h-0">
        {typeof children === 'function' ? children(false) : children}
      </div>
    </div>
  );
};
