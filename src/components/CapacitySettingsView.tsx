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
import { MenuBanner } from './MenuBanner';

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
    <div className="space-y-5">
      <MenuBanner
        title="Master Kapasitas Penyimpanan Gudang"
        icon={SlidersHorizontal}
        watermark="kapasitas"
      >
        {!canEdit && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-200 bg-amber-950/50 border border-amber-400/40 shrink-0">
            <Lock className="h-3.5 w-3.5" />
            <span>Mode Baca Saja (Perlu Hak canManageCapacity)</span>
          </div>
        )}
      </MenuBanner>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Kapasitas Pipa */}
        <div className="fore-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#787470] uppercase tracking-[0.12em]">
              Total Kapasitas Pipa
            </span>
            <div className="h-8 w-8 rounded-full bg-[#e7f0ee] text-[#006041] flex items-center justify-center shrink-0">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#1a4034] font-tabular">
              {formatTon(totalPipeCap, { decimals: 1 })}
            </span>
            <span className="text-xs font-semibold text-[#787470]">Ton</span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#787470] flex items-center justify-between border-t border-[#efece6] pt-2">
            <span>Stok Aktual: {formatTon(totalPipeStock, { decimals: 1 })} Ton</span>
            <span className={cn(
              'font-extrabold font-tabular',
              totalPipeCap > 0 && (totalPipeStock / totalPipeCap) * 100 > 90 ? 'text-rose-600' : 'text-[#006041]'
            )}>
              {totalPipeCap > 0 ? formatPercent((totalPipeStock / totalPipeCap) * 100) : '0%'}
            </span>
          </div>
        </div>

        {/* Card 2: Total Kapasitas Coil */}
        <div className="fore-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#787470] uppercase tracking-[0.12em]">
              Total Kapasitas Coil &amp; Strip
            </span>
            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0">
              <Disc className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#1a4034] font-tabular">
              {formatTon(totalCoilCap, { decimals: 0 })}
            </span>
            <span className="text-xs font-semibold text-[#787470]">Ton</span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#787470] flex items-center justify-between border-t border-[#efece6] pt-2">
            <span>Stok Aktual: {formatTon(totalCoilStock, { decimals: 1 })} Ton</span>
            <span className={cn(
              'font-extrabold font-tabular',
              totalCoilCap > 0 && (totalCoilStock / totalCoilCap) * 100 > 90 ? 'text-rose-600' : 'text-amber-700'
            )}>
              {totalCoilCap > 0 ? formatPercent((totalCoilStock / totalCoilCap) * 100) : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Total Kapasitas Pabrik */}
        <div className="fore-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#787470] uppercase tracking-[0.12em]">
              Total Kapasitas Gabungan
            </span>
            <div className="h-8 w-8 rounded-full bg-[#f4f2ef] text-[#1a4034] border border-[#e6e2db] flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#1a4034] font-tabular">
              {formatTon(totalPlantCap, { decimals: 0 })}
            </span>
            <span className="text-xs font-semibold text-[#787470]">Ton</span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#787470] border-t border-[#efece6] pt-2">
            14 Gudang Penyimpanan (Unit 5 Karawang)
          </div>
        </div>

        {/* Card 4: Status Konfigurasi */}
        <div className="fore-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#787470] uppercase tracking-[0.12em]">
              Status Master
            </span>
            <div className="h-8 w-8 rounded-full bg-[#e7f0ee] text-[#006041] flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-extrabold text-[#1a4034]">
              {config.lastUpdated ? 'Kustom Terdaftar' : 'Standar Spindo'}
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-[#787470] border-t border-[#efece6] pt-2 truncate">
            {config.lastUpdated ? `Update: ${config.lastUpdated}` : 'Default Standar Pabrik'}
          </div>
        </div>
      </div>

      {/* 3. Filter Bar, Search & Contextual Edit Actions */}
      <div className="fore-card p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Tabs */}
          <div className="inline-flex p-1 rounded-full bg-[#f4f2ef] border border-[#e6e2db] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-all cursor-pointer',
                filterType === 'ALL'
                  ? 'bg-[#006041] text-white font-bold shadow-2xs'
                  : 'text-[#59575c] hover:text-[#006041]'
              )}
            >
              Semua Gudang ({ALL_SPINDO_GUDANGS.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('PIPE')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-all cursor-pointer',
                filterType === 'PIPE'
                  ? 'bg-[#006041] text-white font-bold shadow-2xs'
                  : 'text-[#59575c] hover:text-[#006041]'
              )}
            >
              Gudang Pipa
            </button>
            <button
              type="button"
              onClick={() => setFilterType('COIL')}
              className={cn(
                'px-3.5 py-1.5 rounded-full transition-all cursor-pointer',
                filterType === 'COIL'
                  ? 'bg-[#006041] text-white font-bold shadow-2xs'
                  : 'text-[#59575c] hover:text-[#006041]'
              )}
            >
              Gudang Coil / Strip
            </button>
          </div>
        </div>

        {/* Search Bar + Edit Action Buttons (only shown when user edits) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto lg:justify-end">
          <div className="relative flex-1 sm:flex-initial sm:w-64 min-w-[200px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#9d9992]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID gudang atau area..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#faf8f5] border border-[#ddd8cf] rounded-full focus:outline-hidden focus:ring-4 focus:ring-[#006041]/10 focus:border-[#006041] focus:bg-white transition-all"
            />
          </div>

          {canEdit && (isDirty || isSaving || saveSuccess) && (
            <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-150">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-[#3d3c42] bg-[#faf8f5] hover:bg-[#f1eee9] border border-[#ddd8cf] transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#787470]" />
                  <span>Reset Standar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all shadow-xs',
                  saveSuccess && !isDirty
                    ? 'bg-[#e7f0ee] text-[#006041] border border-[#cde0d9] cursor-default'
                    : 'fore-pill-primary cursor-pointer active:scale-95 disabled:opacity-60'
                )}
              >
                {isSaving ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : saveSuccess && !isDirty ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#006041]" />
                    <span>Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 text-[#d0d784]" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Interactive Master Table */}
      <div className="fore-card overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-[#e6e2db] bg-[#faf8f5]/95 backdrop-blur-xs text-[#59575c] font-semibold text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th className="py-3 px-3.5 font-bold text-[#1a4034] w-28" rowSpan={2}>
                  Gudang / SLoc
                </th>
                <th className="py-3 px-3.5 font-bold text-[#1a4034] min-w-[180px]" rowSpan={2}>
                  Keterangan Area / Bay
                </th>
                <th className="py-2 px-3 font-bold text-center border-l border-r border-[#e6e2db] bg-[#e7f0ee]/80 text-[#006041]" colSpan={3}>
                  Kapasitas &amp; Utilisasi Pipa
                </th>
                <th className="py-2 px-3 font-bold text-center border-r border-[#e6e2db] bg-amber-50/80 text-amber-950" colSpan={3}>
                  Kapasitas &amp; Utilisasi Coil / Strip
                </th>
                <th className="py-3 px-3.5 font-bold text-center text-[#1a4034] w-32" rowSpan={2}>
                  Status Limit
                </th>
              </tr>
              <tr>
                <th className="py-2 px-3 text-right font-bold border-l border-[#e6e2db] bg-[#e7f0ee]/45 text-[#006041] w-36">
                  Limit Kapasitas (Ton)
                </th>
                <th className="py-2 px-3 text-right font-semibold bg-[#e7f0ee]/20 text-[#59575c] w-28">
                  Stok Aktual
                </th>
                <th className="py-2 px-3 text-right font-semibold border-r border-[#e6e2db] bg-[#e7f0ee]/20 text-[#59575c] w-24">
                  % Terisi
                </th>

                <th className="py-2 px-3 text-right font-bold bg-amber-50/40 text-amber-900 w-36">
                  Limit Kapasitas (Ton)
                </th>
                <th className="py-2 px-3 text-right font-semibold bg-amber-50/20 text-[#59575c] w-28">
                  Stok Aktual
                </th>
                <th className="py-2 px-3 text-right font-semibold border-r border-[#e6e2db] bg-amber-50/20 text-[#59575c] w-24">
                  % Terisi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efece6]">
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
                    className="hover:bg-[#faf8f5] transition-colors group"
                  >
                    {/* Gudang ID + SAP SLoc */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-[#1a4034] text-xs">
                          {g}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#f4f2ef] text-[#59575c] border border-[#e6e2db]">
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
                          className="w-full px-2.5 py-1 text-xs bg-[#faf8f5] border border-transparent hover:border-[#d5cfc5] focus:border-[#006041] focus:bg-white rounded-xl transition-all"
                        />
                      ) : (
                        <span className="text-[#3d3c42] font-medium text-xs">
                          {areaVal || `Area ${g}`}
                        </span>
                      )}
                    </td>

                    {/* Pipe Capacity Input */}
                    <td className="py-2.5 px-3 text-right border-l border-[#e6e2db] bg-[#e7f0ee]/20">
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
                            className="w-28 text-right px-2.5 py-1 font-mono font-bold text-xs bg-white border border-[#ddd8cf] hover:border-[#006041]/60 focus:border-[#006041] focus:ring-2 focus:ring-[#006041]/15 rounded-xl transition-all"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-[#1a4034]">
                          {formatTon(pipeCapVal, { decimals: 1 })}
                        </span>
                      )}
                    </td>

                    {/* Actual Pipe Stock */}
                    <td className="py-2.5 px-3 text-right font-mono text-[#59575c] font-medium bg-[#e7f0ee]/10">
                      {formatTon(actPipeStock, { decimals: 1 })}
                    </td>

                    {/* Pipe % Utilization */}
                    <td className="py-2.5 px-3 text-right border-r border-[#e6e2db] bg-[#e7f0ee]/10">
                      {pipeCapVal > 0 ? (
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                            isOverPipe
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isWarnPipe
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-[#e7f0ee] text-[#006041] border border-[#cde0d9]'
                          )}
                        >
                          {formatPercent(pipePct)}
                        </span>
                      ) : (
                        <span className="text-[#9d9992] text-[10px] font-mono">-</span>
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
                            className="w-28 text-right px-2.5 py-1 font-mono font-bold text-xs bg-white border border-[#ddd8cf] hover:border-amber-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 rounded-xl transition-all"
                          />
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-[#1a4034]">
                          {formatTon(coilCapVal, { decimals: 0 })}
                        </span>
                      )}
                    </td>

                    {/* Actual Coil Stock */}
                    <td className="py-2.5 px-3 text-right font-mono text-[#59575c] font-medium bg-amber-50/10">
                      {formatTon(actCoilStock, { decimals: 1 })}
                    </td>

                    {/* Coil % Utilization */}
                    <td className="py-2.5 px-3 text-right border-r border-[#e6e2db] bg-amber-50/10">
                      {coilCapVal > 0 ? (
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold',
                            isOverCoil
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isWarnCoil
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-[#e7f0ee] text-[#006041] border border-[#cde0d9]'
                          )}
                        >
                          {formatPercent(coilPct)}
                        </span>
                      ) : (
                        <span className="text-[#9d9992] text-[10px] font-mono">-</span>
                      )}
                    </td>

                    {/* Status Limit Indicator */}
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {isOverPipe || isOverCoil ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overcapacity</span>
                        </span>
                      ) : isWarnPipe || isWarnCoil ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Info className="h-3 w-3" />
                          <span>Mendekati Limit</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#e7f0ee] text-[#006041] border border-[#cde0d9]">
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
        <div className="px-4 py-3 bg-[#faf8f5] border-t border-[#efece6] text-[#787470] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-[#006041] shrink-0" />
            <span>
              Kapasitas yang diatur di menu ini akan langsung mempengaruhi grafik utilisasi, perhitungan sisa ruang, dan peringatan batas aman di seluruh dashboard Spindo.
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#787470] whitespace-nowrap">
            Menampilkan {filteredGudangs.length} dari {ALL_SPINDO_GUDANGS.length} Gudang
          </span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18191f]/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] max-w-md w-full p-5 shadow-2xl border border-[#e6e2db] space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1a4034]">
                  Reset ke Default Standar Spindo?
                </h3>
                <p className="text-xs text-[#787470] mt-1 leading-relaxed">
                  Tindakan ini akan mengembalikan kapasitas seluruh gudang (Pipa dan Coil) ke angka spesifikasi standar awal pabrik Spindo (Unit 5 Karawang).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#efece6]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-[#3d3c42] bg-[#f4f2ef] hover:bg-[#e8e4dd] rounded-full transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-full transition-colors shadow-xs cursor-pointer"
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
