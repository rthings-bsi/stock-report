'use client';

import React, { useState } from 'react';
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

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 lg:p-8 animate-in fade-in duration-150">
        <div className="flex flex-col w-full h-full max-w-7xl rounded-md border border-slate-300 bg-white shadow-xl overflow-hidden">
          {/* Expanded Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-slate-50">
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 font-mono">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Minimize2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Tutup Layar Penuh</span>
            </button>
          </div>
          {/* Expanded Body */}
          <div className="flex-1 p-6 overflow-auto flex flex-col">
            {typeof children === 'function' ? children(true) : children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border transition-all duration-150 bg-white shadow-2xs flex flex-col justify-between overflow-hidden theme-card-rounded ${
        isCustomizing
          ? 'border-emerald-600 ring-1 ring-emerald-600/30'
          : 'border-slate-200 hover:border-slate-300'
      } ${width}`}
    >
      {/* Header Card */}
      <div className="border-b border-slate-100 p-3 bg-slate-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isCustomizing && (
            <div className="text-emerald-700 cursor-grab active:cursor-grabbing p-0.5">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          <div className="min-w-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] text-slate-500 font-mono truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          {badge}
          {headerAction}

          {/* Tombol Kustomisasi Layout */}
          {isCustomizing && (
            <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-200">
              <select
                value={width}
                onChange={(e) => onWidthChange && onWidthChange(e.target.value as CardWidth)}
                className="text-[10px] font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer focus:outline-hidden"
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
                className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                disabled={!canMoveRight}
                onClick={onMoveRight}
                title="Pindahkan ke bawah / kanan"
                className="p-1 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Tombol Maximize/Expand */}
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            title="Tampilkan layar penuh"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        {typeof children === 'function' ? children(false) : children}
      </div>
    </div>
  );
};
