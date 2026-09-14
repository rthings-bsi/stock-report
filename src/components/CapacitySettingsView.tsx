'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  Warehouse,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lock,
  Search,
  Check,
  Building2,
  Disc,
  Boxes,
  Percent,
  Sparkles
} from 'lucide-react';
import {
  WarehousePipeCapacity,
  CoilStripArea,
  WarehouseCapacityConfig,
  ALL_SPINDO_GUDANGS,
  DEFAULT_PIPE_CAPACITIES,
  DEFAULT_COIL_CAPACITIES,
  DEFAULT_COIL_AREA_LABELS,
  GUDANG_SLOC_CODES
} from '@/types/warehouse';
import { formatTon, formatPercent, cn } from '@/lib/utils';

interface CapacitySettingsViewProps {
  currentPipeCapacities: WarehousePipeCapacity[];
  currentCoilStripData: CoilStripArea[];
  config: WarehouseCapacityConfig;
  canEdit?: boolean;
  onSave: (newConfig: WarehouseCapacityConfig) => Promise<void> | void;
}

export const CapacitySettingsView: React.FC<CapacitySettingsViewProps> = ({
  currentPipeCapacities,
  currentCoilStripData,
  config,
  canEdit = true,
  onSave
}) => {
  // Local editable draft state
  const [pipeCaps, setPipeCaps] = useState<Record<string, number>>({
    ...DEFAULT_PIPE_CAPACITIES,
    ...(config.pipeCapacities || {})
  });
  const [coilCaps, setCoilCaps] = useState<Record<string, number>>({
    ...DEFAULT_COIL_CAPACITIES,
    ...(config.coilCapacities || {})
  });
  const [areaLabels, setAreaLabels] = useState<Record<string, string>>({
    ...DEFAULT_COIL_AREA_LABELS,
    ...(config.areaLabels || {})
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PIPE' | 'COIL'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync with prop updates
  useEffect(() => {
    setPipeCaps({ ...DEFAULT_PIPE_CAPACITIES, ...(config.pipeCapacities || {}) });
    setCoilCaps({ ...DEFAULT_COIL_CAPACITIES, ...(config.coilCapacities || {}) });
    setAreaLabels({ ...DEFAULT_COIL_AREA_LABELS, ...(config.areaLabels || {}) });
  }, [config]);

  // Map current stock for fast lookup
  const currentPipeStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentPipeCapacities.forEach((p) => {
      map[p.gudang] = (p.wipLt || 0) + (p.fgLt || 0) + (p.wipSt || 0) + (p.fgSt || 0) || (p.stock || 0);
    });
    return map;
  }, [currentPipeCapacities]);

  const currentCoilStockMap = useMemo(() => {
    const map: Record<string, number> = {};
    currentCoilStripData.forEach((c) => {
      map[c.gudang] = (c.coilTon || 0) + (c.stripTon || 0) || (c.totalTon || 0);
    });
    return map;
  }, [currentCoilStripData]);

  // Check dirty state
  const isDirty = useMemo(() => {
    for (const g of ALL_SPINDO_GUDANGS) {
      if ((pipeCaps[g] ?? DEFAULT_PIPE_CAPACITIES[g]) !== (config.pipeCapacities?.[g] ?? DEFAULT_PIPE_CAPACITIES[g])) return true;
      if ((coilCaps[g] ?? DEFAULT_COIL_CAPACITIES[g]) !== (config.coilCapacities?.[g] ?? DEFAULT_COIL_CAPACITIES[g])) return true;
      if ((areaLabels[g] ?? DEFAULT_COIL_AREA_LABELS[g]) !== (config.areaLabels?.[g] ?? DEFAULT_COIL_AREA_LABELS[g])) return true;
    }
    return false;
  }, [pipeCaps, coilCaps, areaLabels, config]);

  // Aggregated totals
  const totalPipeCap = useMemo(
    () => ALL_SPINDO_GUDANGS.reduce((sum, g) => sum + (Number(pipeCaps[g]) || 0), 0),
    [pipeCaps]
  );
  const totalCoilCap = useMemo(
    () => ALL_SPINDO_GUDANGS.reduce((sum, g) => sum + (Number(coilCaps[g]) || 0), 0),
    [coilCaps]
  );
  const totalPlantCap = totalPipeCap + totalCoilCap;

  const totalPipeStock = useMemo(
    () => Object.values(currentPipeStockMap).reduce((sum, v) => sum + v, 0),
    [currentPipeStockMap]
  );
  const totalCoilStock = useMemo(
    () => Object.values(currentCoilStockMap).reduce((sum, v) => sum + v, 0),
    [currentCoilStockMap]
  );

  // Filtered warehouses
  const filteredGudangs = useMemo(() => {
    return ALL_SPINDO_GUDANGS.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const area = (areaLabels[g] || '').toLowerCase();
      const sloc = (GUDANG_SLOC_CODES[g] || '').toLowerCase();
      const matchesSearch = !q || g.toLowerCase().includes(q) || area.includes(q) || sloc.includes(q);
      if (!matchesSearch) return false;

      if (filterType === 'PIPE') {
        return (pipeCaps[g] ?? 0) > 0 || (currentPipeStockMap[g] ?? 0) > 0;
      }
      if (filterType === 'COIL') {
        return (coilCaps[g] ?? 0) > 0 || (currentCoilStockMap[g] ?? 0) > 0;
      }
      return true;
    });
  }, [searchQuery, filterType, pipeCaps, coilCaps, areaLabels, currentPipeStockMap, currentCoilStockMap]);

  const handleSave = async () => {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      const newConfig: WarehouseCapacityConfig = {
        pipeCapacities: pipeCaps,
        coilCapacities: coilCaps,
        areaLabels,
        lastUpdated: new Date().toLocaleString('id-ID'),
        updatedBy: 'Admin'
      };
      await onSave(newConfig);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save capacity settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setPipeCaps({ ...DEFAULT_PIPE_CAPACITIES });
    setCoilCaps({ ...DEFAULT_COIL_CAPACITIES });
    setAreaLabels({ ...DEFAULT_COIL_AREA_LABELS });
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white px-4 py-3.5 sm:px-5 sm:py-4 rounded-xl border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-400">
            <SlidersHorizontal className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Master Kapasitas Penyimpanan Gudang
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Pipa &amp; Coil
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Atur batas limit kapasitas maksimum (Ton) per gudang untuk kalkulasi utilisasi &amp; deteksi overcapacity
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Standar</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer',
                  isDirty
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed',
                  saveSuccess && 'bg-emerald-700 text-white'
                )}
              >
                {isSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-200" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/80">
              <Lock className="h-3.5 w-3.5" />
              <span>Mode Baca Saja (Perlu Hak canManageCapacity)</span>
            </div>
          )}
        </div>
      </div>

      {/* Dirty state notification bar */}
      {isDirty && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-lg flex items-center justify-between text-xs font-medium animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Terdapat perubahan kapasitas yang belum disimpan ke database. Klik <strong>&quot;Simpan Perubahan&quot;</strong> di pojok kanan atas untuk memperbarui perhitungan dashboard.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-2xs transition-colors"
          >
            Simpan Sekarang
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Kapasitas Pipa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Kapasitas Pipa
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-tabular">
              {formatTon(totalPipeCap, { decimals: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">Ton</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Stok Aktual: {formatTon(totalPipeStock, { decimals: 1 })} Ton</span>
            <span className={cn(
              'font-bold font-tabular',
              totalPipeCap > 0 && (totalPipeStock / totalPipeCap) * 100 > 90 ? 'text-rose-600' : 'text-emerald-700'
            )}>
              {totalPipeCap > 0 ? formatPercent((totalPipeStock / totalPipeCap) * 100) : '0%'}
            </span>
          </div>
        </div>

        {/* Card 2: Total Kapasitas Coil */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Kapasitas Coil &amp; Strip
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Disc className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-tabular">
              {formatTon(totalCoilCap, { decimals: 0 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">Ton</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Stok Aktual: {formatTon(totalCoilStock, { decimals: 1 })} Ton</span>
            <span className={cn(
              'font-bold font-tabular',
              totalCoilCap > 0 && (totalCoilStock / totalCoilCap) * 100 > 90 ? 'text-rose-600' : 'text-amber-700'
            )}>
              {totalCoilCap > 0 ? formatPercent((totalCoilStock / totalCoilCap) * 100) : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Kapasitas Pabrik */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Kapasitas Gabungan
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-tabular">
              {formatTon(totalPlantCap, { decimals: 0 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">Ton</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            14 Gudang Penyimpanan (Unit 5 Karawang)
          </div>
        </div>

        {/* Card 4: Status Konfigurasi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Status Master
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900">
              {config.lastUpdated ? 'Kustom Terdaftar' : 'Standar Spindo'}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 truncate">
            {config.lastUpdated ? `Update: ${config.lastUpdated}` : 'Default Standar Pabrik'}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Table Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Tabs */}
          <div className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={cn(
                'px-3 py-1 rounded-md transition-all cursor-pointer',
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Semua Gudang ({ALL_SPINDO_GUDANGS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PIPE')}
              className={cn(
                'px-3 py-1 rounded-md transition-all cursor-pointer',
                filterType === 'PIPE'
                  ? 'bg-white text-emerald-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Gudang Pipa
            </button>
            <button
              type="button"
              onClick={() => setFilterType('COIL')}
              className={cn(
                'px-3 py-1 rounded-md transition-all cursor-pointer',
                filterType === 'COIL'
                  ? 'bg-white text-amber-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Gudang Coil / Strip
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID gudang atau area..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. Interactive Master Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-semibold text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3.5 font-bold text-slate-700 w-28" rowSpan={2}>
                  Gudang / SLoc
                </th>
                <th className="py-3 px-3.5 font-bold text-slate-700 min-w-[180px]" rowSpan={2}>
                  Keterangan Area / Bay
                </th>
                <th className="py-2 px-3 font-bold text-center border-l border-r border-slate-200 bg-emerald-50/80 text-emerald-950" colSpan={3}>
                  Kapasitas &amp; Utilisasi Pipa
                </th>
                <th className="py-2 px-3 font-bold text-center border-r border-slate-200 bg-amber-50/80 text-amber-950" colSpan={3}>
                  Kapasitas &amp; Utilisasi Coil / Strip
                </th>
                <th className="py-3 px-3.5 font-bold text-center text-slate-700 w-32" rowSpan={2}>
                  Status Limit
                </th>
              </tr>
              <tr>
                <th className="py-2 px-3 text-right font-bold border-l border-slate-200 bg-emerald-50/40 text-emerald-900 w-36">
                  Limit Kapasitas (Ton)
                </th>
                <th className="py-2 px-3 text-right font-semibold bg-emerald-50/20 text-slate-600 w-28">
                  Stok Aktual
                </th>
                <th className="py-2 px-3 text-right font-semibold border-r border-slate-200 bg-emerald-50/20 text-slate-600 w-24">
                  % Terisi
                </th>

                <th className="py-2 px-3 text-right font-bold bg-amber-50/40 text-amber-900 w-36">
                  Limit Kapasitas (Ton)
                </th>
                <th className="py-2 px-3 text-right font-semibold bg-amber-50/20 text-slate-600 w-28">
                  Stok Aktual
                </th>
                <th className="py-2 px-3 text-right font-semibold border-r border-slate-200 bg-amber-50/20 text-slate-600 w-24">
                  % Terisi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGudangs.map((g) => {
                const sloc = GUDANG_SLOC_CODES[g] || '-';
                const pipeCapVal = pipeCaps[g] ?? 0;
                const coilCapVal = coilCaps[g] ?? 0;
                const areaVal = areaLabels[g] ?? '';

                const actPipeStock = currentPipeStockMap[g] || 0;
                const actCoilStock = currentCoilStockMap[g] || 0;

                const pipePct = pipeCapVal > 0 ? (actPipeStock / pipeCapVal) * 100 : 0;
                const coilPct = coilCapVal > 0 ? (actCoilStock / coilCapVal) * 100 : 0;

                const isOverPipe = pipeCapVal > 0 && pipePct > 100;
                const isOverCoil = coilCapVal > 0 && coilPct > 100;
                const isWarnPipe = pipeCapVal > 0 && pipePct >= 90;
                const isWarnCoil = coilCapVal > 0 && coilPct >= 90;

                return (
                  <tr
                    key={g}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Gudang ID + SAP SLoc */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-slate-900 text-xs">
                          {g}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {sloc}
                        </span>
                      </div>
                    </td>

                    {/* Area / Bay Description */}
                    <td className="py-2.5 px-3.5">
                      {canEdit ? (
                        <input
                          type="text"
                          value={areaVal}
                          onChange={(e) =>
                            setAreaLabels((prev) => ({ ...prev, [g]: e.target.value }))
                          }
                          placeholder={`Area ${g}...`}
                          className="w-full px-2 py-1 text-xs bg-slate-50/70 border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded transition-all"
                        />
                      ) : (
                        <span className="text-slate-700 font-medium text-xs">
                          {areaVal || `Area ${g}`}
                        </span>
                      )}
                    </td>

                    {/* Pipe Capacity Input */}
                    <td className="py-2.5 px-3 text-right border-l border-slate-200 bg-emerald-50/15">
                      {canEdit ? (
                        <div className="relative inline-flex items-center justify-end w-full">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={pipeCapVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPipeCaps((prev) => ({
                                ...prev,
                                [g]: isNaN(val) ? 0 : Math.max(0, val)
                              }));
                            }}
                            className="w-28 text-right px-2 py-1 font-mono font-bold text-xs bg-white border border-slate-200 hover:border-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded transition-all"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {formatTon(pipeCapVal, { decimals: 1 })}
                        </span>
                      )}
                    </td>

                    {/* Actual Pipe Stock */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium bg-emerald-50/10">
                      {formatTon(actPipeStock, { decimals: 1 })}
                    </td>

                    {/* Pipe % Utilization */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-emerald-50/10">
                      {pipeCapVal > 0 ? (
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                            isOverPipe
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isWarnPipe
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}
                        >
                          {formatPercent(pipePct)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">-</span>
                      )}
                    </td>

                    {/* Coil Capacity Input */}
                    <td className="py-2.5 px-3 text-right bg-amber-50/15">
                      {canEdit ? (
                        <div className="relative inline-flex items-center justify-end w-full">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={coilCapVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setCoilCaps((prev) => ({
                                ...prev,
                                [g]: isNaN(val) ? 0 : Math.max(0, val)
                              }));
                            }}
                            className="w-28 text-right px-2 py-1 font-mono font-bold text-xs bg-white border border-slate-200 hover:border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded transition-all"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {formatTon(coilCapVal, { decimals: 0 })}
                        </span>
                      )}
                    </td>

                    {/* Actual Coil Stock */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 font-medium bg-amber-50/10">
                      {formatTon(actCoilStock, { decimals: 1 })}
                    </td>

                    {/* Coil % Utilization */}
                    <td className="py-2.5 px-3 text-right border-r border-slate-200 bg-amber-50/10">
                      {coilCapVal > 0 ? (
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                            isOverCoil
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isWarnCoil
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          )}
                        >
                          {formatPercent(coilPct)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] font-mono">-</span>
                      )}
                    </td>

                    {/* Status Limit Indicator */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {isOverPipe || isOverCoil ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overcapacity</span>
                        </span>
                      ) : isWarnPipe || isWarnCoil ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Info className="h-3 w-3" />
                          <span>Mendekati Limit</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Optimal</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-slate-500 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Kapasitas yang diatur di menu ini akan langsung mempengaruhi grafik utilisasi, perhitungan sisa ruang, dan peringatan batas aman di seluruh dashboard Spindo.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
            Menampilkan {filteredGudangs.length} dari {ALL_SPINDO_GUDANGS.length} Gudang
          </span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Reset ke Default Standar Spindo?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Tindakan ini akan mengembalikan kapasitas seluruh gudang (Pipa dan Coil) ke angka spesifikasi standar awal pabrik Spindo (Unit 5 Karawang).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Ya, Reset Standar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
