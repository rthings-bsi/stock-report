'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    default: 'border-slate-200/80 bg-white hover:border-emerald-300',
    blue: 'border-emerald-200/90 bg-white hover:border-emerald-400',
    danger: 'border-amber-300/80 bg-amber-50/20 hover:border-amber-400',
    warning: 'border-amber-200/80 bg-amber-50/15 hover:border-amber-300',
  };

  const iconBg = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-emerald-800 text-amber-300 border-emerald-900 shadow-xs',
    danger: 'bg-amber-400 text-slate-950 border-amber-500 font-bold',
    warning: 'bg-amber-100 text-amber-900 border-amber-200',
  };

  const badgeVariantMap = {
    default: 'secondary' as const,
    blue: 'emerald' as const,
    danger: 'destructive' as const,
    warning: 'amber' as const,
  };

  return (
    <Card className={cn("p-3 sm:p-3.5 xl:p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-sm min-w-0 h-full", cardBorder[variant])}>
      {/* Top Header: Title & Responsive Icon */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[10px] xl:text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono truncate" title={title}>
            {title}
          </p>

          {/* Value + subValue responsive wrap & font scaling */}
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <h3 className="text-lg sm:text-xl lg:text-xl xl:text-2xl font-black tracking-tight font-mono text-slate-900 leading-tight">
              {value}
            </h3>
            {subValue && (
              <span className="text-[10px] sm:text-xs font-mono font-bold text-emerald-800 shrink-0">
                {subValue}
              </span>
            )}
          </div>
        </div>

        {/* Responsive shrink icon container */}
        <div className={cn("flex h-7 w-7 sm:h-8 sm:w-8 xl:h-9 xl:w-9 shrink-0 items-center justify-center rounded-lg xl:rounded-xl border", iconBg[variant])}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 xl:h-4.5 xl:w-4.5" strokeWidth={2} />
        </div>
      </div>

      {/* Bottom Footer: Description & Badge */}
      <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-1 border-t border-slate-100 pt-2 text-[10px] xl:text-[11px]">
        <p className="text-slate-500 font-medium truncate flex-1 min-w-0" title={description || 'Real-time updated'}>
          {description || 'Real-time updated'}
        </p>
        {badge && (
          <Badge variant={badgeVariantMap[variant]} className="text-[9px] xl:text-[10px] px-1.5 py-0 shrink-0">
            {badge}
          </Badge>
        )}
      </div>
    </Card>
  );
};
