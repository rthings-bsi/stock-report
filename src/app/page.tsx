'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Clock,
  Disc,
  ShieldAlert,
  TrendingUp,
  RefreshCcw,
  AlertTriangle,
  LayoutDashboard,
  Boxes,
  PackageX
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MetricCard } from '@/components/MetricCard';
import { PipeCapacityView } from '@/components/PipeCapacityView';
import { FastSlowView } from '@/components/FastSlowView';
import { CoilStripView } from '@/components/CoilStripView';
import { NCQualityView } from '@/components/NCQualityView';
import { LooFulfillmentView } from '@/components/LooFulfillmentView';
import { UnfifoView } from '@/components/UnfifoView';
import { DamagedPackagingView } from '@/components/DamagedPackagingView';
import { UploadModal } from '@/components/UploadModal';
import {
  initialPipeCapacityData,
  initialFastSlowData,
  initialCoilStripData,
  initialNCWarehouseData,
  initialNCItems,
  initialTop10LooAllAreaST,
  initialTop10LooAllAreaLT,
  initialUnfifoData
} from '@/lib/mockData';
import { initialDamagedPackagingData } from '@/lib/damagedPackagingData';
import {
  WarehousePipeCapacity,
  FastSlowPipe,
  CoilStripArea,
  PipeNCWarehouse,
  PipeNCItem,
  LooComparisonItem,
  UnfifoItem,
  UnfifoCoilItem,
  UnfifoPipeItem,
  DamagedPackagingItem
} from '@/types/warehouse';
import { ParsedWarehouseState } from '@/lib/parser';
import { cn, formatTon, formatPercent } from '@/lib/utils';
import { UIThemeConfig, DEFAULT_UI_THEME, COLOR_PRESETS, RADIUS_PRESETS } from '@/types/theme';
import { UIThemeModal } from '@/components/UIThemeModal';

export default function Home() {
  // State for all warehouse data sets
  const [pipeCapacities, setPipeCapacities] = useState<WarehousePipeCapacity[]>(initialPipeCapacityData);
  const [fastSlowData, setFastSlowData] = useState<FastSlowPipe[]>(initialFastSlowData);
  const [coilStripData, setCoilStripData] = useState<CoilStripArea[]>(initialCoilStripData);
  const [ncWarehouseData, setNcWarehouseData] = useState<PipeNCWarehouse[]>(initialNCWarehouseData);
  const [ncItems, setNcItems] = useState<PipeNCItem[]>(initialNCItems);
  const [looSTData, setLooSTData] = useState<LooComparisonItem[]>(initialTop10LooAllAreaST);
  const [looLTData, setLooLTData] = useState<LooComparisonItem[]>(initialTop10LooAllAreaLT);
  const [unfifoData, setUnfifoData] = useState<UnfifoItem[]>(initialUnfifoData);
  const [unfifoCoilData, setUnfifoCoilData] = useState<UnfifoCoilItem[]>([]);
  const [unfifoPipeData, setUnfifoPipeData] = useState<UnfifoPipeItem[]>([]);
  const [damagedPackagingData, setDamagedPackagingData] = useState<DamagedPackagingItem[]>(initialDamagedPackagingData);
  const [customerBreakdown, setCustomerBreakdown] = useState<Record<string, Array<{ customer: string; qty: number; tonase: number }>>>({});

  // Application State
  const [lastUpdated, setLastUpdated] = useState<string>('02.09.2026 - 07:31 WIB');
  const [isCustomData, setIsCustomData] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [uiTheme, setUiTheme] = useState<UIThemeConfig>(DEFAULT_UI_THEME);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCustomizingLayout, setIsCustomizingLayout] = useState<boolean>(false);
  const [selectedSnapshotKey, setSelectedSnapshotKey] = useState<string>('latest');
  const [activeTab, setActiveTab] = useState<
    'capacity' | 'fastslow' | 'coilstrip' | 'nc' | 'loo' | 'unfifo' | 'packaging'
  >('capacity');
  const [selectedGudangFilter, setSelectedGudangFilter] = useState<string>('ALL');

  // Load saved theme from localStorage on mount and apply CSS variables
  const applyThemeToDOM = (t: UIThemeConfig) => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    
    // 1. Primary color mapping
    const colorPreset = COLOR_PRESETS.find((c) => c.id === t.primaryColor) || COLOR_PRESETS[0];
    root.style.setProperty('--primary-banner', colorPreset.bannerHex);
    root.style.setProperty('--primary-header', colorPreset.headerHex);

    // 2. Card Radius mapping
    const radiusPreset = RADIUS_PRESETS.find((r) => r.id === t.cardRadius) || RADIUS_PRESETS[2];
    root.style.setProperty('--card-radius', radiusPreset.px);

    // 3. Background Pattern mapping
    body.classList.remove('bg-theme-clean-slate', 'bg-theme-soft-ambient', 'bg-theme-pure-white', 'bg-theme-cool-grey');
    body.classList.add(`bg-theme-${t.bgPattern || 'clean-slate'}`);
  };

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('spindo_ui_theme');
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        setUiTheme(parsed);
        applyThemeToDOM(parsed);
      } else {
        applyThemeToDOM(DEFAULT_UI_THEME);
      }
    } catch {}
  }, []);

  const handleSaveTheme = (newTheme: UIThemeConfig) => {
    setUiTheme(newTheme);
    applyThemeToDOM(newTheme);
    try {
      localStorage.setItem('spindo_ui_theme', JSON.stringify(newTheme));
    } catch {}
  };

  // Load specific snapshot key
  const loadSnapshotByKey = async (key: string) => {
    setSelectedSnapshotKey(key);
    try {
      const res = await fetch(`/api/warehouse?key=${encodeURIComponent(key)}`);
      const json = await res.json();
      if (json?.success && json?.data) {
        const d = json.data;
        if (d.pipeCapacities?.length > 0) setPipeCapacities(d.pipeCapacities);
        if (d.fastSlowData?.length > 0) setFastSlowData(d.fastSlowData);
        if (d.coilStripData?.length > 0) setCoilStripData(d.coilStripData);
        if (d.ncWarehouseData?.length > 0) setNcWarehouseData(d.ncWarehouseData);
        if (d.ncItems?.length > 0) setNcItems(d.ncItems);
        if (d.looSTData?.length > 0) setLooSTData(d.looSTData);
        if (d.looLTData?.length > 0) setLooLTData(d.looLTData);
        if (d.unfifoData?.length > 0) setUnfifoData(d.unfifoData);
        setUnfifoCoilData(d.unfifoCoilData || []);
        setUnfifoPipeData(d.unfifoPipeData || []);
        if (d.customerBreakdown) setCustomerBreakdown(d.customerBreakdown);
        if (d.lastUpdated) setLastUpdated(d.lastUpdated);
        setIsCustomData(true);
      }
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    }
  };

  // Load latest state from SQLite DB & localStorage on mount
  useEffect(() => {
    async function loadSavedData() {
      // 1. Coba load dari localStorage terlebih dahulu untuk respon instan offline
      try {
        const localSaved = localStorage.getItem('spindo_warehouse_saved_state');
        if (localSaved) {
          const d = JSON.parse(localSaved);
          if (d.pipeCapacities?.length > 0) setPipeCapacities(d.pipeCapacities);
          if (d.fastSlowData?.length > 0) setFastSlowData(d.fastSlowData);
          if (d.coilStripData?.length > 0) setCoilStripData(d.coilStripData);
          if (d.ncWarehouseData?.length > 0) setNcWarehouseData(d.ncWarehouseData);
          if (d.ncItems?.length > 0) setNcItems(d.ncItems);
          if (d.looSTData?.length > 0) setLooSTData(d.looSTData);
          if (d.looLTData?.length > 0) setLooLTData(d.looLTData);
          if (d.unfifoData?.length > 0) setUnfifoData(d.unfifoData);
          setUnfifoCoilData(d.unfifoCoilData || []);
          setUnfifoPipeData(d.unfifoPipeData || []);
          if (d.customerBreakdown) setCustomerBreakdown(d.customerBreakdown);
          if (d.lastUpdated) setLastUpdated(d.lastUpdated);
          setIsCustomData(true);
        }
      } catch (err) {
        console.error('Failed to parse localStorage cache:', err);
      }

      // 2. Sinkronkan dengan server database SQLite
      try {
        const res = await fetch('/api/warehouse');
        const json = await res.json();
        if (json?.success && json?.data) {
          const d = json.data;
          if (d.pipeCapacities?.length > 0) setPipeCapacities(d.pipeCapacities);
          if (d.fastSlowData?.length > 0) setFastSlowData(d.fastSlowData);
          if (d.coilStripData?.length > 0) setCoilStripData(d.coilStripData);
          if (d.ncWarehouseData?.length > 0) setNcWarehouseData(d.ncWarehouseData);
          if (d.ncItems?.length > 0) setNcItems(d.ncItems);
          if (d.looSTData?.length > 0) setLooSTData(d.looSTData);
          if (d.looLTData?.length > 0) setLooLTData(d.looLTData);
          if (d.unfifoData?.length > 0) setUnfifoData(d.unfifoData);
          setUnfifoCoilData(d.unfifoCoilData || []);
          setUnfifoPipeData(d.unfifoPipeData || []);
          if (d.customerBreakdown) setCustomerBreakdown(d.customerBreakdown);
          if (d.lastUpdated) setLastUpdated(d.lastUpdated);
          setIsCustomData(true);
          // Sync balik ke localStorage
          localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(d));
        }
      } catch (err) {
        console.error('Failed to auto-load saved state from SQLite:', err);
      }
    }
    loadSavedData();
  }, []);

  // Simpan manual / Simpan Otomatis state aktif ke Database & LocalStorage
  const handleSaveData = async () => {
    setIsSaving(true);
    const currentState: ParsedWarehouseState = {
      pipeCapacities,
      fastSlowData,
      coilStripData,
      ncWarehouseData,
      ncItems,
      looSTData,
      looLTData,
      unfifoData,
      unfifoCoilData,
      unfifoPipeData,
      customerBreakdown,
      lastUpdated: new Date().toLocaleString('id-ID'),
    };

    // 1. Simpan ke Browser LocalStorage
    try {
      localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(currentState));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // 2. Simpan ke SQLite Database Backend
    try {
      await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentState),
      });
      setLastUpdated(currentState.lastUpdated);
      setIsCustomData(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to persist state to SQLite:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle new parsed data from Excel and auto-save
  const handleDataParsed = async (newState: ParsedWarehouseState) => {
    if (newState.pipeCapacities.length > 0) setPipeCapacities(newState.pipeCapacities);
    if (newState.fastSlowData.length > 0) setFastSlowData(newState.fastSlowData);
    if (newState.coilStripData.length > 0) setCoilStripData(newState.coilStripData);
    if (newState.ncWarehouseData.length > 0) setNcWarehouseData(newState.ncWarehouseData);
    if (newState.ncItems.length > 0) setNcItems(newState.ncItems);
    if (newState.looSTData.length > 0) setLooSTData(newState.looSTData);
    if (newState.looLTData.length > 0) setLooLTData(newState.looLTData);
    if (newState.unfifoData.length > 0) setUnfifoData(newState.unfifoData);
    
    setUnfifoCoilData(newState.unfifoCoilData || []);
    setUnfifoPipeData(newState.unfifoPipeData || []);
    if (newState.customerBreakdown) setCustomerBreakdown(newState.customerBreakdown);

    setLastUpdated(newState.lastUpdated);
    if (newState.damagedPackagingData && newState.damagedPackagingData.length > 0) {
      setDamagedPackagingData(newState.damagedPackagingData);
    }
    setIsCustomData(true);
    setIsUploadOpen(false);

    // Auto-save ganda (LocalStorage + SQLite)
    try {
      localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(newState));
      await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to sync uploaded data to SQLite:', err);
    }
  };

  const handleResetData = async () => {
    localStorage.removeItem('spindo_warehouse_saved_state');
    setPipeCapacities(initialPipeCapacityData);
    setFastSlowData(initialFastSlowData);
    setCoilStripData(initialCoilStripData);
    setNcWarehouseData(initialNCWarehouseData);
    setNcItems(initialNCItems);
    setLooSTData(initialTop10LooAllAreaST);
    setLooLTData(initialTop10LooAllAreaLT);
    setUnfifoData(initialUnfifoData);
    setUnfifoCoilData([]);
    setUnfifoPipeData([]);
    setCustomerBreakdown({});
    setIsCustomData(false);

    try {
      await fetch('/api/warehouse', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to reset SQLite snapshot:', err);
    }
  };

  // Aggregated KPI numbers
  const totalStockPipa = pipeCapacities.reduce((acc, curr) => acc + curr.stock, 0);
  const totalKapPipa = pipeCapacities.reduce((acc, curr) => acc + curr.kapasitas, 0);
  const pipeUtilisasiPct = totalKapPipa > 0 ? (totalStockPipa / totalKapPipa) * 100 : 0;

  const totalCoilStripTon = coilStripData.reduce((acc, curr) => acc + curr.totalTon, 0);
  const totalSlowMovingTon = fastSlowData.reduce((acc, curr) => acc + curr.slowTon, 0);
  const slowMovingPct = totalStockPipa > 0 ? (totalSlowMovingTon / totalStockPipa) * 100 : 0;
  const totalGradeETon = ncWarehouseData.reduce((acc, curr) => acc + curr.gradeE, 0);
  const totalGradeCTon = ncWarehouseData.reduce((acc, curr) => acc + curr.gradeC, 0);
  const totalNCTon = totalGradeETon + totalGradeCTon;
  const totalPipeUnfifoTon = unfifoPipeData.reduce((acc, curr) => acc + curr.tonase, 0);
  const totalPipeUnfifoQty = unfifoPipeData.reduce((acc, curr) => acc + curr.qtyBtg, 0);
  const totalLooSTTon = looSTData.reduce((acc, curr) => acc + curr.looTon, 0);

  // Dynamic overcapacity detection
  const overcapacityWh = pipeCapacities.find((p) => p.persenTerisi > 100);

  const navMenuItems = [
    { id: 'capacity', label: 'Stock Pipa vs Kapasitas', icon: Layers, desc: 'Utilisasi & Free Stock' },
    { id: 'fastslow', label: 'Fast vs Slow Moving', icon: Clock, desc: 'Analisis PASM Pipa' },
    { id: 'coilstrip', label: 'Coil & Strip', icon: Disc, desc: 'Bahan Baku Induk' },
    { id: 'nc', label: 'Stock NC', icon: ShieldAlert, desc: 'Grade E & Mutu C' },
    { id: 'unfifo', label: 'UNFIFO', icon: RefreshCcw, desc: 'Audit Alur Pengeluaran' },
    { id: 'loo', label: 'Stock Pipa vs LOO', icon: TrendingUp, desc: 'Pemenuhan Target LOO' },
    { id: 'packaging', label: 'Data Packaging Rusak', icon: PackageX, desc: 'Temuan & Status Repack' },
  ] as const;

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-emerald-900 selection:text-white">
      {/* Navbar Component */}
      <Navbar
        lastUpdated={lastUpdated}
        onOpenUpload={() => setIsUploadOpen(true)}
        onResetData={handleResetData}
        onSaveData={handleSaveData}
        onSelectSnapshot={loadSnapshotByKey}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        appTitle="Spindo Unit 5 - Warehouse"
        isCustomizingLayout={isCustomizingLayout}
        onToggleCustomizeLayout={() => setIsCustomizingLayout(!isCustomizingLayout)}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        isCustomData={isCustomData}
        selectedSnapshotKey={selectedSnapshotKey}
      />

      {/* Theme Customizer Modal */}
      <UIThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={uiTheme}
        onSaveTheme={handleSaveTheme}
      />

      {/* Main Layout Container with Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Modern Clean Sidebar */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col gap-6">
          <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Dashboard
            </div>

            <nav className="space-y-0.5">
              {navMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold transition-all text-left group cursor-pointer",
                      isActive
                        ? "bg-emerald-800 text-white font-bold shadow-2xs"
                        : "text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-950"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-800"
                      )}
                      strokeWidth={2}
                    />
                    <span className="truncate leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* KPI Snapshot Widget in Sidebar */}
          <div className="rounded-md border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-800" />
                <span>Stock Overview</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                Summary
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
                <span className="text-slate-600 font-sans font-medium">
                  Total Stock Pipa
                </span>
                <span className="font-bold text-slate-900">{formatTon(totalStockPipa, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 transition-colors">
                <span className="text-slate-500 font-sans font-medium">
                  Kapasitas Pipa
                </span>
                <span className="font-semibold text-slate-700">{formatTon(totalKapPipa, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50/80 border border-amber-200/60">
                <span className="text-amber-900 font-sans font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0"></span>
                  Pipa UNFIFO
                </span>
                <span className="font-bold text-amber-900">{formatTon(totalPipeUnfifoTon, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50/80 border border-amber-200/60">
                <span className="text-amber-900 font-sans font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0"></span>
                  Slow Moving
                </span>
                <span className="font-bold text-amber-900">{formatTon(totalSlowMovingTon, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50/50 border border-amber-100">
                <span className="text-amber-800/90 font-sans font-medium">
                  Grade E (NC)
                </span>
                <span className="font-bold text-amber-900">{formatTon(totalGradeETon, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2 rounded bg-amber-50/50 border border-amber-100">
                <span className="text-amber-800/90 font-sans font-medium">
                  Grade C (NC)
                </span>
                <span className="font-bold text-amber-900">{formatTon(totalGradeCTon, { showUnit: true })}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 px-1.5">
                <span className="text-slate-600 font-sans font-medium">
                  Coil & Strip
                </span>
                <span className="font-bold text-slate-900">{formatTon(totalCoilStripTon, { showUnit: true })}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Executive Overview KPI Cards (Hidden based on preference) */}
          {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="Stock Pipa"
              value={formatTon(totalStockPipa, { showUnit: true })}
              description={`Utilisasi ${formatPercent(pipeUtilisasiPct)}`}
              icon={Boxes}
              variant="blue"
            />
            <MetricCard
              title="Slow Moving"
              value={formatTon(totalSlowMovingTon, { showUnit: true })}
              description={`${formatPercent(slowMovingPct)} dari total stock`}
              icon={Clock}
              variant={slowMovingPct > 35 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Stock NC"
              value={formatTon(totalNCTon, { showUnit: true })}
              description="Grade E & C"
              icon={ShieldAlert}
              variant={totalNCTon > 300 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Coil & Strip"
              value={formatTon(totalCoilStripTon, { showUnit: true })}
              description="Raw Material"
              icon={Disc}
              variant="blue"
            />
            <MetricCard
              title="Pipa UNFIFO"
              value={formatTon(totalPipeUnfifoTon, { showUnit: true })}
              description={`${unfifoPipeData.length} Item Pipa`}
              icon={RefreshCcw}
              variant={unfifoPipeData.length > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Top LOO ST"
              value={formatTon(totalLooSTTon, { showUnit: true })}
              description="Target Order Terbuka"
              icon={TrendingUp}
              variant="blue"
            />
          </div> */}

          {/* Global Alert Notification Banner */}
          {overcapacityWh && (
            <div className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Peringatan Utilisasi Melebihi Kapasitas: </span>
                {overcapacityWh.gudang} saat ini mencapai <strong>{formatPercent(overcapacityWh.persenTerisi)}</strong> ({formatTon(overcapacityWh.stock, { showUnit: true })} / Kapasitas {formatTon(overcapacityWh.kapasitas, { showUnit: true })}). Disarankan evaluasi relokasi atau percepatan pengiriman order.
              </div>
            </div>
          )}

          {/* Active Tab View */}
          <div className="space-y-6">
            {activeTab === 'capacity' && (
              <PipeCapacityView
                data={pipeCapacities}
                selectedGudang={selectedGudangFilter}
                onSelectGudang={setSelectedGudangFilter}
                customerBreakdown={customerBreakdown}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'fastslow' && (
              <FastSlowView
                data={fastSlowData}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'coilstrip' && (
              <CoilStripView
                data={coilStripData}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'nc' && (
              <NCQualityView
                ncWarehouseData={ncWarehouseData}
                ncItems={ncItems}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'unfifo' && (
              <UnfifoView
                coilData={unfifoCoilData}
                pipeData={unfifoPipeData}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'loo' && (
              <LooFulfillmentView
                stData={looSTData}
                ltData={looLTData}
                isCustomizing={isCustomizingLayout}
              />
            )}

            {activeTab === 'packaging' && (
              <DamagedPackagingView
                data={damagedPackagingData}
                isCustomizing={isCustomizingLayout}
              />
            )}
          </div>
        </main>
      </div>

      {/* Excel Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataParsed={handleDataParsed}
      />
    </div>
  );
}
