'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subValue?: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
  variant?: 'default' | 'blue' | 'danger' | 'warning';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subValue,
  description,
  icon: Icon,
  badge,
  variant = 'default'
}) => {
  const cardBorder = {
    default: 'border-[#e8e4dd] bg-white hover:border-[#006041]/40',
    blue: 'border-[#cde0d9] bg-white hover:border-[#006041]',
    danger: 'border-amber-300/90 bg-amber-50/25 hover:border-amber-500',
    warning: 'border-amber-200/90 bg-amber-50/15 hover:border-amber-400',
  };

  const iconBg = {
    default: 'bg-[#f4f2ef] text-[#1a4034] border-[#e6e2db]',
    blue: 'bg-[#006041] text-[#d0d784] border-[#006041] shadow-xs',
    danger: 'bg-amber-400 text-[#18191f] border-amber-500 font-bold',
    warning: 'bg-amber-100 text-amber-900 border-amber-200',
  };

  const badgeStyles = {
    default: 'border-[#e6e2db] bg-[#f4f2ef] text-[#59575c]',
    blue: 'border-[#b9c372] border-dashed bg-[#d0d784]/15 text-[#5e682f]',
    danger: 'border-amber-300 bg-amber-50 text-amber-900 font-extrabold',
    warning: 'border-amber-300 bg-amber-50 text-amber-800',
  };

  return (
    <div className={cn("rounded-[20px] border bg-white text-[#222126] shadow-[0_2px_10px_rgba(0,0,0,0.04)] p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-[0_12px_28px_-12px_rgba(26,64,52,0.14)] min-w-0 h-full", cardBorder[variant])}>
      {/* Top Header: Title & Circular Medallion Icon */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[10.5px] xl:text-[11px] font-bold uppercase tracking-[0.12em] text-[#787470] truncate" title={title}>
            {title}
          </p>

          {/* Value + subValue responsive wrap & font scaling */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <h3 className="text-lg sm:text-xl xl:text-2xl font-extrabold tracking-tight font-tabular text-[#1a4034] leading-tight">
              {value}
            </h3>
            {subValue && (
              <span className="text-[10.5px] sm:text-xs font-bold text-[#006041] shrink-0 font-tabular">
                {subValue}
              </span>
            )}
          </div>
        </div>

        {/* Circular Fore Medallion Icon */}
        <div className={cn("flex h-8 w-8 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-full border", iconBg[variant])}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.1} />
        </div>
      </div>

      {/* Bottom Footer: Description & Pill Badge */}
      <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-[#efece6] pt-2.5 text-[10.5px] xl:text-[11px]">
        <p className="text-[#787470] font-medium truncate flex-1 min-w-0" title={description || 'Real-time updated'}>
          {description || 'Real-time updated'}
        </p>
        {badge && (
          <span className={cn("inline-flex items-center rounded-full border font-bold text-[9.5px] xl:text-[10px] px-2 py-0.5 shrink-0", badgeStyles[variant])}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
