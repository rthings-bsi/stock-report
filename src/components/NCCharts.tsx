'use client';

import React from 'react';

interface NCGradeDonutProps {
  primeTon: number;
  gradeETon: number;
  gradeCTon: number;
}

export const NCGradeDonut: React.FC<NCGradeDonutProps> = ({
  primeTon,
  gradeETon,
  gradeCTon,
}) => {
  const total = primeTon + gradeETon + gradeCTon;
  const primePct = total > 0 ? (primeTon / total) * 100 : 0;
  const gradeEPct = total > 0 ? (gradeETon / total) * 100 : 0;
  const gradeCPct = total > 0 ? (gradeCTon / total) * 100 : 0;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const primeDash = (primePct / 100) * circumference;
  const gradeEDash = (gradeEPct / 100) * circumference;
  const gradeCDash = (gradeCPct / 100) * circumference;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div className="border-b border-slate-100 pb-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
          Distribusi Mutu Produk Pipa
        </h4>
        <p className="text-[11px] text-slate-500 font-medium">PRIME vs Non Conformity (Grade E / C)</p>
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
            {/* PRIME (Blue 30%) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-emerald-600 transition-all duration-1000"
              strokeWidth="12"
              strokeDasharray={`${primeDash} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Grade E (Red 10%) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-red-600 transition-all duration-1000"
              strokeWidth="12"
              strokeDasharray={`${gradeEDash} ${circumference}`}
              strokeDashoffset={`-${primeDash}`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Grade C (Amber) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-amber-500 transition-all duration-1000"
              strokeWidth="12"
              strokeDasharray={`${gradeCDash} ${circumference}`}
              strokeDashoffset={`-${primeDash + gradeEDash}`}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-black font-mono text-slate-900">{primePct.toFixed(0)}%</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Prime</span>
          </div>
        </div>

        {/* Legend stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono w-full">
          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-600 shrink-0" />
              <div className="text-[10px] font-bold text-slate-700 uppercase">PRIME</div>
            </div>
            <div className="text-sm font-black text-emerald-800">{primeTon.toFixed(1)} T</div>
            <div className="text-[10px] text-slate-500">{primePct.toFixed(1)}% Lolos</div>
          </div>

          <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2.5 w-2.5 rounded-sm bg-red-600 shrink-0" />
              <div className="text-[10px] font-bold text-red-700 uppercase">GRADE E</div>
            </div>
            <div className="text-sm font-black text-red-700">{gradeETon.toFixed(1)} T</div>
            <div className="text-[10px] text-slate-500">{gradeEPct.toFixed(1)}% Hold Mutu</div>
          </div>

          <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-2.5 w-2.5 rounded-sm bg-amber-500 shrink-0" />
              <div className="text-[10px] font-bold text-amber-800 uppercase">GRADE C</div>
            </div>
            <div className="text-sm font-black text-amber-700">{gradeCTon.toFixed(1)} T</div>
            <div className="text-[10px] text-slate-500">{gradeCPct.toFixed(1)}% Down</div>
          </div>
        </div>
      </div>
    </div>
  );
};
