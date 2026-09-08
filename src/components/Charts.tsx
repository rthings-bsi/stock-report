'use client';

import React from 'react';

interface WarehouseBarChartProps {
  data: Array<{
    label: string;
    value: number;
    max: number;
    subLabel?: string;
    isOver?: boolean;
    isWarning?: boolean;
  }>;
  unit?: string;
}

export const WarehouseBarChart: React.FC<WarehouseBarChartProps> = ({
  data,
  unit = 'T'
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
            Visualisasi Kapasitas Terisi Per Gudang
          </h4>
          <p className="text-[11px] text-slate-500 font-medium">Beban tonase aktual terhadap batas aman kapasitas (Line Limit 100%)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600"></span>
            <span className="text-slate-600">Normal (10-80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500"></span>
            <span className="text-slate-600">Warning (81-90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-600"></span>
            <span className="text-red-700 font-bold">Kritis (91-100%)</span>
          </div>
        </div>
      </div>

      {/* Responsive scroll container for smaller screens */}
      <div className="overflow-x-auto pb-2 pt-4">
        <div className="min-w-[640px] flex items-end justify-between gap-2 h-56 px-2">
          {data.map((item) => {
            const pct = item.max > 0 ? (item.value / item.max) * 100 : 0;
            const barHeight = Math.min(Math.round((pct / 120) * 100), 100);

            let barColor = 'bg-emerald-600';
            let textColor = 'text-emerald-800';
            if (item.isOver || pct > 90) {
              barColor = 'bg-red-600';
              textColor = 'text-red-700';
            } else if (item.isWarning || pct > 80) {
              barColor = 'bg-amber-500';
              textColor = 'text-amber-700';
            }

            return (
              <div key={item.label} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* Value floating tag */}
                <div className="text-[10px] font-mono font-bold transition-transform group-hover:-translate-y-1 mb-1.5 text-center">
                  <span className={textColor}>{pct.toFixed(0)}%</span>
                  <span className="block text-[9px] text-slate-400 font-normal">{item.value.toFixed(0)}{unit}</span>
                </div>

                {/* Bar column */}
                <div className="w-full max-w-[42px] bg-slate-100 rounded-t-md h-36 flex items-end p-1 relative overflow-hidden border border-slate-200/60">
                  {/* 100% capacity reference line indicator */}
                  <div
                    className="absolute w-full left-0 border-t border-dashed border-red-400/80 z-10 pointer-events-none"
                    style={{ bottom: `${(100 / 120) * 100}%` }}
                    title="100% Kapasitas"
                  />
                  <div
                    className={`w-full rounded-t-sm transition-all duration-700 ${barColor}`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <span className="text-xs font-mono font-extrabold text-slate-800">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface FastSlowDonutProps {
  fastTon: number;
  slowTon: number;
}

export const FastSlowDonut: React.FC<FastSlowDonutProps> = ({ fastTon, slowTon }) => {
  const total = fastTon + slowTon;
  const fastPct = total > 0 ? (fastTon / total) * 100 : 0;
  const slowPct = total > 0 ? (slowTon / total) * 100 : 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const fastDash = (fastPct / 100) * circumference;
  const slowDash = (slowPct / 100) * circumference;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div className="border-b border-slate-100 pb-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
          Komposisi Perputaran Stock Pipa
        </h4>
        <p className="text-[11px] text-slate-500 font-medium">Fast Moving vs Slow Moving Ratio</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
        {/* SVG Ring Chart */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-slate-100"
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-emerald-600 transition-all duration-1000"
              strokeWidth="12"
              strokeDasharray={`${fastDash} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-red-600 transition-all duration-1000"
              strokeWidth="12"
              strokeDasharray={`${slowDash} ${circumference}`}
              strokeDashoffset={`-${fastDash}`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-black font-mono text-slate-900">{fastPct.toFixed(0)}%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Fast</span>
          </div>
        </div>

        {/* Legend stats */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 font-mono w-full sm:w-auto">
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="h-3.5 w-3.5 rounded-md bg-emerald-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">FAST MOVING</div>
              <div className="text-sm font-black text-emerald-800">{fastTon.toFixed(1)} Ton</div>
              <div className="text-[10px] text-slate-500">{fastPct.toFixed(1)}% Proporsi</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50/50 border border-red-100">
            <div className="h-3.5 w-3.5 rounded-md bg-red-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">SLOW MOVING</div>
              <div className="text-sm font-black text-red-700">{slowTon.toFixed(1)} Ton</div>
              <div className="text-[10px] text-slate-500">{slowPct.toFixed(1)}% Mengendap</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-mono flex justify-between">
        <span>Total Evaluasi:</span>
        <strong className="text-slate-800">{total.toFixed(1)} Ton</strong>
      </div>
    </div>
  );
};
