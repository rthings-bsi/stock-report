'use client';

import React from 'react';
import {
  Layers,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  Scale,
  LucideIcon,
} from 'lucide-react';
import { formatTon, formatQty, cn } from '@/lib/utils';

export type VarianceFilterTab = 'ALL' | 'SESUAI' | 'SELISIH_MINUS' | 'SELISIH_PLUS';

export interface VarianceKpiSummary {
  totalItems: number;
  matchingItems: number;
  accuracyRate: number;
  minusItems: number;
  totalMinusTon: number;
  plusItems: number;
  totalPlusTon: number;
  netVarianceTon: number;
  netVarianceQty: number;
}

interface VarianceKpiGridProps {
  summary: VarianceKpiSummary;
  activeTab: VarianceFilterTab;
  onSelectTab: (tab: VarianceFilterTab) => void;
  totalLabel: string;
  totalDescription: string;
  matchDescription?: string;
  minusDescription?: string;
  plusDescription?: string;
  netDescription?: string;
  pcsUnit?: string;
}

interface KpiCardItem {
  key: string;
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  value: string;
  unit: string;
  valueClassName: string;
  description: string;
  badge: string;
  badgeClassName: string;
  filterKey?: VarianceFilterTab;
  activeClassName?: string;
  hoverClassName?: string;
  colSpanClassName?: string;
}

/**
 * Shared 5-card Fore KPI summary grid for Stock Opname and Audit SLoc views.
 * Cards 1-4 double as interactive status filters for the detail table.
 */
export const VarianceKpiGrid: React.FC<VarianceKpiGridProps> = ({
  summary,
  activeTab,
  onSelectTab,
  totalLabel,
  totalDescription,
  matchDescription = 'SAP = Aktual',
  minusDescription = 'Aktual < SAP',
  plusDescription = 'Aktual > SAP',
  netDescription = 'Deviasi bersih',
  pcsUnit = 'pcs',
}) => {
  const cleanNetTon = Math.abs(summary.netVarianceTon) < 0.0005 ? 0 : summary.netVarianceTon;
  const netTonColor =
    cleanNetTon < 0 ? 'text-rose-600' : cleanNetTon > 0 ? 'text-amber-700' : 'text-[#006041]';
  const netBadgeColor =
    summary.netVarianceQty < 0
      ? 'bg-rose-50 text-rose-700 border-rose-200/80'
      : summary.netVarianceQty > 0
      ? 'bg-amber-50 text-amber-800 border-amber-200/80'
      : 'bg-[#f4f2ef] text-[#59575c] border-[#e6e2db]';

  const cards: KpiCardItem[] = [
    {
      key: 'total',
      title: totalLabel,
      icon: Layers,
      iconClassName: 'bg-[#f4f2ef] text-[#1a4034] border border-[#e6e2db]',
      value: formatQty(summary.totalItems),
      unit: 'item',
      valueClassName: 'text-[#1a4034]',
      description: totalDescription,
      badge: '100%',
      badgeClassName: 'bg-[#f4f2ef] text-[#59575c] border-[#e6e2db]',
      filterKey: 'ALL',
      hoverClassName: 'hover:border-[#006041]/40 focus-visible:ring-[#006041]/30',
    },
    {
      key: 'match',
      title: 'Sesuai (Akurat)',
      icon: CheckCircle2,
      iconClassName: 'bg-[#006041] text-[#d0d784] shadow-xs',
      value: formatQty(summary.matchingItems),
      unit: 'item',
      valueClassName: 'text-[#006041]',
      description: matchDescription,
      badge: `${summary.accuracyRate.toFixed(1)}%`,
      badgeClassName: 'bg-[#e7f0ee] text-[#006041] border-[#006041]/20',
      filterKey: 'SESUAI',
      activeClassName: 'border-[#006041] ring-2 ring-[#006041]/20',
      hoverClassName: 'hover:border-[#006041]/45 focus-visible:ring-[#006041]/30',
    },
    {
      key: 'minus',
      title: 'Selisih Minus (-)',
      icon: MinusCircle,
      iconClassName: 'bg-rose-50 text-rose-600 border border-rose-200/80',
      value: formatQty(summary.minusItems),
      unit: 'item',
      valueClassName: 'text-rose-600',
      description: minusDescription,
      badge: `-${formatTon(summary.totalMinusTon)} T`,
      badgeClassName: 'bg-rose-50 text-rose-700 border-rose-200/80',
      filterKey: 'SELISIH_MINUS',
      activeClassName: 'border-rose-400 ring-2 ring-rose-500/20',
      hoverClassName: 'hover:border-rose-300 focus-visible:ring-rose-500/25',
    },
    {
      key: 'plus',
      title: 'Selisih Plus (+)',
      icon: PlusCircle,
      iconClassName: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      value: formatQty(summary.plusItems),
      unit: 'item',
      valueClassName: 'text-amber-700',
      description: plusDescription,
      badge: `+${formatTon(summary.totalPlusTon)} T`,
      badgeClassName: 'bg-amber-50 text-amber-800 border-amber-200/80',
      filterKey: 'SELISIH_PLUS',
      activeClassName: 'border-amber-400 ring-2 ring-amber-500/20',
      hoverClassName: 'hover:border-amber-300 focus-visible:ring-amber-500/25',
    },
    {
      key: 'net',
      title: 'Net Variance',
      icon: Scale,
      iconClassName: 'bg-[#f4f2ef] text-[#59575c] border border-[#e6e2db]',
      value: `${cleanNetTon > 0 ? '+' : ''}${formatTon(cleanNetTon)}`,
      unit: 'Ton',
      valueClassName: netTonColor,
      description: netDescription,
      badge: `${summary.netVarianceQty > 0 ? '+' : ''}${formatQty(summary.netVarianceQty)} ${pcsUnit}`,
      badgeClassName: netBadgeColor,
      colSpanClassName: 'col-span-2 sm:col-span-1',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isInteractive = card.filterKey !== undefined;
        const isPressed = card.filterKey !== undefined && card.filterKey !== 'ALL' && activeTab === card.filterKey;

        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#787470] truncate">
                {card.title}
              </span>
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', card.iconClassName)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5 whitespace-nowrap">
              <span className={cn('text-2xl font-extrabold font-tabular tracking-tight', card.valueClassName)}>
                {card.value}
              </span>
              <span className="text-xs font-semibold text-[#787470]">{card.unit}</span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-[#efece6] flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#787470] truncate">{card.description}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold font-tabular whitespace-nowrap shrink-0 border',
                  card.badgeClassName
                )}
              >
                {card.badge}
              </span>
            </div>
          </>
        );

        if (!isInteractive || !card.filterKey) {
          return (
            <div key={card.key} className={cn('fore-card p-4 flex flex-col justify-between h-full', card.colSpanClassName)}>
              {body}
            </div>
          );
        }

        const filterKey = card.filterKey;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectTab(filterKey === 'ALL' ? 'ALL' : activeTab === filterKey ? 'ALL' : filterKey)}
            aria-pressed={filterKey === 'ALL' ? undefined : isPressed}
            className={cn(
              'fore-card p-4 text-left flex flex-col justify-between transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 h-full',
              card.hoverClassName,
              isPressed && card.activeClassName,
              card.colSpanClassName
            )}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
};
