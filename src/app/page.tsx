'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '@/lib/chartSetup';
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
  PackageX,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Upload,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  PackageCheck,
  Users,
  UserCog,
  X
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { LoginPage } from '@/components/LoginPage';
import {
  UserSession,
  RolePermissions,
  CustomRole,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS
} from '@/types/auth';
import { MetricCard } from '@/components/MetricCard';
import { PipeCapacityView } from '@/components/PipeCapacityView';
import { FastSlowView } from '@/components/FastSlowView';
import { CoilStripView } from '@/components/CoilStripView';
import { NCQualityView } from '@/components/NCQualityView';
import { LooFulfillmentView } from '@/components/LooFulfillmentView';
import { UnfifoView } from '@/components/UnfifoView';
import { DamagedPackagingView } from '@/components/DamagedPackagingView';
import { IncomingPackagingView } from '@/components/IncomingPackagingView';
import { UserManagementView } from '@/components/UserManagementView';
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
import { initialIncomingPackagingData } from '@/lib/incomingPackagingData';
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
  DamagedPackagingItem,
  IncomingPackagingItem
} from '@/types/warehouse';
import { ParsedWarehouseState } from '@/lib/parser';
import { cn, formatTon, formatPercent } from '@/lib/utils';
import { UIThemeConfig, DEFAULT_UI_THEME, COLOR_PRESETS, RADIUS_PRESETS } from '@/types/theme';
import { UIThemeModal } from '@/components/UIThemeModal';

const VALID_TABS = [
  'capacity',
  'fastslow',
  'coilstrip',
  'nc',
  'loo',
  'unfifo',
  'packaging',
  'incoming_pkg',
  'users',
] as const;

type TabType = (typeof VALID_TABS)[number];

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
  const [incomingPackagingData, setIncomingPackagingData] = useState<IncomingPackagingItem[]>(initialIncomingPackagingData);
  const [customerBreakdown, setCustomerBreakdown] = useState<Record<string, Array<{ customer: string; qty: number; tonase: number }>>>({});

  // Application State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('02.09.2026 - 07:31 WIB');
  const [isCustomData, setIsCustomData] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [uiTheme, setUiTheme] = useState<UIThemeConfig>(DEFAULT_UI_THEME);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCustomizingLayout, setIsCustomizingLayout] = useState<boolean>(false);
  const [selectedSnapshotKey, setSelectedSnapshotKey] = useState<string>('latest');
  const [activeTab, setActiveTab] = useState<TabType>('capacity');
  const [selectedGudangFilter, setSelectedGudangFilter] = useState<string>('ALL');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isDashboardGroupOpen, setIsDashboardGroupOpen] = useState<boolean>(true);
  const [systemRoles, setSystemRoles] = useState<CustomRole[]>([]);

  // Fetch all system & custom roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/roles');
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.roles)) {
          setSystemRoles(data.roles);
          localStorage.setItem('spindo_custom_roles', JSON.stringify(data.roles));
        }
      } catch {
        const local = localStorage.getItem('spindo_custom_roles');
        if (local) setSystemRoles(JSON.parse(local));
      }
    };
    fetchRoles();
  }, []);

  // Sync active tab from query param ?tab= or localStorage so tab persists across refresh without hash (#)
  useEffect(() => {
    try {
      // 1. Cek query param ?tab=
      const params = new URLSearchParams(window.location.search);
      const queryTab = params.get('tab') as TabType;
      if (queryTab && VALID_TABS.includes(queryTab)) {
        setActiveTab(queryTab);
        localStorage.setItem('spindo_active_tab', queryTab);
        return;
      }

      // 2. Cek localStorage
      const savedTab = localStorage.getItem('spindo_active_tab') as TabType;
      if (savedTab && VALID_TABS.includes(savedTab)) {
        setActiveTab(savedTab);
      }
    } catch {}
  }, []);

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('spindo_active_tab', tab);
      // Bersihkan hash lama jika ada dan gunakan clean history state
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {}
  };

  // Load saved auth session
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('spindo_auth_user');
      if (savedAuth) {
        setCurrentUser(JSON.parse(savedAuth));
      }
    } catch {}
    setIsAuthChecking(false);
  }, []);

  const handleLogin = (session: UserSession) => {
    setCurrentUser(session);
    try {
      localStorage.setItem('spindo_auth_user', JSON.stringify(session));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsCustomizingLayout(false);
    try {
      localStorage.removeItem('spindo_auth_user');
    } catch {}
  };

  // Load saved sidebar preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spindo_sidebar_open');
      if (saved !== null) {
        setIsSidebarOpen(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('spindo_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut Ctrl+B / Cmd+B for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        if (d.damagedPackagingData?.length > 0) setDamagedPackagingData(d.damagedPackagingData);
        if (d.incomingPackagingData?.length > 0) setIncomingPackagingData(d.incomingPackagingData);
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
          if (d.damagedPackagingData?.length > 0) setDamagedPackagingData(d.damagedPackagingData);
          if (d.incomingPackagingData?.length > 0) setIncomingPackagingData(d.incomingPackagingData);
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
          if (d.damagedPackagingData?.length > 0) setDamagedPackagingData(d.damagedPackagingData);
          if (d.incomingPackagingData?.length > 0) setIncomingPackagingData(d.incomingPackagingData);
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
      damagedPackagingData,
      incomingPackagingData,
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
    if (newState.incomingPackagingData && newState.incomingPackagingData.length > 0) {
      setIncomingPackagingData(newState.incomingPackagingData);
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
    setDamagedPackagingData(initialDamagedPackagingData);
    setIncomingPackagingData(initialIncomingPackagingData);
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

  // Unified list of customer names from all warehouse stock data
  const allStockCustomers = React.useMemo(() => {
    const set = new Set<string>();
    Object.values(customerBreakdown).forEach((arr) => {
      arr.forEach((c) => {
        if (c.customer) set.add(c.customer.trim());
      });
    });
    ncItems.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    looSTData.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    looLTData.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    unfifoPipeData.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    damagedPackagingData.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    incomingPackagingData.forEach((i) => {
      if (i.customer) set.add(i.customer.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [customerBreakdown, ncItems, looSTData, looLTData, unfifoPipeData, damagedPackagingData, incomingPackagingData]);

  // Dynamic overcapacity detection
  const overcapacityWh = pipeCapacities.find((p) => p.persenTerisi > 100);

  // Evaluate user role permissions dynamically
  const userPermissions: RolePermissions = useMemo(() => {
    if (!currentUser) return DEFAULT_STAFF_PERMISSIONS;
    if (currentUser.role === 'admin') return DEFAULT_ADMIN_PERMISSIONS;

    // 1. Cek dari systemRoles state
    const matchedFromState = systemRoles.find((r) => r.key.toLowerCase() === currentUser.role.toLowerCase());
    if (matchedFromState && matchedFromState.permissions) {
      return matchedFromState.permissions;
    }

    // 2. Cek dari currentUser session
    if (currentUser.permissions) return currentUser.permissions;

    // 3. Cek dari localStorage cache
    try {
      const savedRolesStr = localStorage.getItem('spindo_custom_roles');
      if (savedRolesStr) {
        const savedRoles: CustomRole[] = JSON.parse(savedRolesStr);
        const matched = savedRoles.find((r) => r.key.toLowerCase() === currentUser.role.toLowerCase());
        if (matched && matched.permissions) return matched.permissions;
      }
    } catch {}

    return DEFAULT_STAFF_PERMISSIONS;
  }, [currentUser, systemRoles]);

  const canManageUsers = currentUser?.role === 'admin' || Boolean(userPermissions.canManageUsers);
  const canUploadSAP = currentUser?.role === 'admin' || Boolean(userPermissions.canUploadSAP);
  const canCustomizeLayout = currentUser?.role === 'admin' || Boolean(userPermissions.canCustomizeLayout);
  const canEditIncomingPkg = currentUser?.role === 'admin' || Boolean(userPermissions.canEditIncomingPkg);
  const canEditDamagedPkg = currentUser?.role === 'admin' || Boolean(userPermissions.canEditDamagedPkg);
  const isEditable = canManageUsers || canUploadSAP;

  // Master definition of all possible menu items with their required permission keys
  const allDashboardMenuItems = useMemo(() => [
    { id: 'capacity', label: 'Stock Pipa vs Kapasitas', icon: Layers, desc: '% Terisi & Free Stock', permKey: 'viewCapacity' },
    { id: 'fastslow', label: 'Fast vs Slow Moving', icon: Clock, desc: 'Analisis PASM Pipa', permKey: 'viewFastSlow' },
    { id: 'coilstrip', label: 'Coil & Strip', icon: Disc, desc: 'Bahan Baku Induk', permKey: 'viewCoilStrip' },
    { id: 'nc', label: 'Stock NC', icon: ShieldAlert, desc: 'Grade E & Mutu C', permKey: 'viewNC' },
    { id: 'unfifo', label: 'UNFIFO', icon: RefreshCcw, desc: 'Audit Alur Pengeluaran', permKey: 'viewUnfifo' },
    { id: 'loo', label: 'Stock Pipa vs LOO', icon: TrendingUp, desc: 'Pemenuhan Target LOO', permKey: 'viewLoo' },
    { id: 'packaging', label: 'Data Packaging Rusak', icon: PackageX, desc: 'Temuan & Status Repack', permKey: 'viewDamagedPkg' },
  ] as const, []);

  // Filter dashboard menu items dynamically strictly based on role permissions
  const dashboardMenuItems = useMemo(() => {
    return allDashboardMenuItems.filter((item) => {
      if (currentUser?.role === 'admin') return true;
      return Boolean(userPermissions[item.permKey as keyof RolePermissions]);
    });
  }, [allDashboardMenuItems, currentUser, userPermissions]);

  const allOperationalMenuItems = useMemo(() => [
    { id: 'incoming_pkg', label: 'Incoming Packaging', icon: PackageCheck, desc: 'Input & Mutasi Stock RTP', permKey: 'viewIncomingPkg' },
  ] as const, []);

  // Filter operational menu items dynamically based on role permissions
  const operationalMenuItems = useMemo(() => {
    return allOperationalMenuItems.filter((item) => {
      if (currentUser?.role === 'admin') return true;
      return Boolean(userPermissions[item.permKey as keyof RolePermissions]);
    });
  }, [allOperationalMenuItems, currentUser, userPermissions]);

  // Compute all available tabs allowed for current user
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = [];
    dashboardMenuItems.forEach((i) => tabs.push(i.id as TabType));
    operationalMenuItems.forEach((i) => tabs.push(i.id as TabType));
    if (canManageUsers) tabs.push('users');
    return tabs;
  }, [dashboardMenuItems, operationalMenuItems, canManageUsers]);

  // If active tab is not allowed for current role, automatically redirect to first permitted tab
  useEffect(() => {
    if (currentUser && availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
      try {
        localStorage.setItem('spindo_active_tab', availableTabs[0]);
      } catch {}
    }
  }, [availableTabs, activeTab, currentUser]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center font-mono text-xs text-slate-500">
        Memeriksa sesi login...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-slate-900 flex flex-col font-sans selection:bg-emerald-900 selection:text-white">
      {/* Navbar Component */}
      <Navbar
        lastUpdated={lastUpdated}
        onOpenUpload={() => {
          if (canUploadSAP) setIsUploadOpen(true);
        }}
        onResetData={handleResetData}
        onSaveData={handleSaveData}
        onSelectSnapshot={loadSnapshotByKey}
        onOpenThemeModal={() => {
          if (canCustomizeLayout) setIsThemeModalOpen(true);
        }}
        isCustomizingLayout={canCustomizeLayout ? isCustomizingLayout : false}
        onToggleCustomizeLayout={canCustomizeLayout ? () => setIsCustomizingLayout(!isCustomizingLayout) : undefined}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        isCustomData={isCustomData}
        selectedSnapshotKey={selectedSnapshotKey}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Theme Customizer Modal */}
      <UIThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentTheme={uiTheme}
        onSaveTheme={handleSaveTheme}
      />

      {/* Mobile Drawer Navigation */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white p-4 shadow-xl overflow-y-auto space-y-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 items-center justify-center rounded-md bg-white p-1 border border-slate-200 shadow-2xs shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/spindo-logo.png"
                    alt="SPINDO Logo"
                    className="h-6 w-auto object-contain"
                  />
                </div>
                <span className="text-sm font-bold text-slate-900">Menu Navigasi</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Dashboard Utama */}
            {dashboardMenuItems.length > 0 && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsDashboardGroupOpen(!isDashboardGroupOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold text-slate-800 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 transition-all border border-slate-200 cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="h-4 w-4 text-emerald-800 shrink-0" strokeWidth={2} />
                    <span>Dashboard Utama</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold bg-white text-emerald-900 px-1.5 py-0.5 rounded border border-slate-200">
                      {dashboardMenuItems.length}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-slate-500 transition-transform duration-200",
                        isDashboardGroupOpen ? "rotate-0" : "-rotate-90"
                      )}
                      strokeWidth={2}
                    />
                  </div>
                </button>

                {isDashboardGroupOpen && (
                  <nav className="ml-3 pl-2.5 border-l-2 border-emerald-800/20 space-y-1 pt-1">
                    {dashboardMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            handleSelectTab(item.id);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-semibold transition-all text-left group cursor-pointer",
                            isActive
                              ? "bg-emerald-800 text-white font-bold shadow-2xs"
                              : "text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-950"
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-white" : "text-slate-400")} strokeWidth={2} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            )}

            {/* Section 2: Operasional & Input Data (Mobile) */}
            {operationalMenuItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Operasional &amp; Input Data
                </div>
                <nav className="space-y-1">
                  {operationalMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          handleSelectTab(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer border shadow-2xs",
                          isActive
                            ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-1 ring-emerald-700/50"
                            : "text-emerald-950 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/90 hover:border-emerald-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-emerald-800")} strokeWidth={2.2} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
                          isActive ? "bg-emerald-950/80 text-emerald-100 border-emerald-700/80" : "bg-emerald-100/80 text-emerald-900 border-emerald-200"
                        )}>
                          Input RTP
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Menu Kelola Data & Hak Akses: Mobile */}
            {(canUploadSAP || canManageUsers) && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Kelola Data &amp; Hak Akses
                </div>
                <div className="space-y-1">
                  {canUploadSAP && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold text-slate-800 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 transition-all border border-slate-200 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <Upload className="h-4 w-4 text-emerald-800" strokeWidth={2} />
                        <span>Upload Raw SAP</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200">
                        Excel
                      </span>
                    </button>
                  )}

                  {canManageUsers && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectTab('users');
                        setIsMobileSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer border shadow-2xs",
                        activeTab === 'users'
                          ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-1 ring-emerald-700/50"
                          : "text-slate-800 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-950 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className={cn("h-4 w-4 shrink-0", activeTab === 'users' ? "text-white" : "text-emerald-800")} strokeWidth={2} />
                        <span>Kelola Pengguna</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                        activeTab === 'users' ? "bg-emerald-950/80 text-emerald-100 border-emerald-700" : "bg-white text-emerald-900 border-emerald-200"
                      )}>
                        Roles
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mobile User Profile Footer */}
            <div className="pt-2 border-t border-slate-100">
              <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500">{currentUser.department}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer shrink-0"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Container with Sidebar */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Modern Clean Sidebar */}
        {isSidebarOpen && (
          <aside className="w-64 shrink-0 hidden md:flex flex-col gap-6 animate-in fade-in slide-in-from-left-2 duration-150">
            <div className="rounded-md border border-slate-200/80 bg-white p-2.5 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Navigasi
                </span>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title="Sembunyikan Sidebar (Ctrl+B)"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </div>

              {/* Menu Section 1: Dashboard Utama (Parent Group) */}
              {dashboardMenuItems.length > 0 && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setIsDashboardGroupOpen(!isDashboardGroupOpen)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold text-slate-800 bg-slate-50/90 hover:bg-emerald-50/80 hover:text-emerald-950 transition-all border border-slate-200/80 cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutDashboard className="h-4 w-4 text-emerald-800 shrink-0 group-hover:scale-105 transition-transform" strokeWidth={2} />
                      <span className="leading-tight">Dashboard Utama</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-white text-emerald-900 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                        {dashboardMenuItems.length}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-slate-500 transition-transform duration-200",
                          isDashboardGroupOpen ? "rotate-0" : "-rotate-90"
                        )}
                        strokeWidth={2}
                      />
                    </div>
                  </button>

                  {/* Sub-menu Items */}
                  {isDashboardGroupOpen && (
                    <nav className="mt-1.5 ml-2.5 pl-2.5 border-l-2 border-emerald-800/20 space-y-0.5 animate-in fade-in duration-150">
                      {dashboardMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`sidebar-${item.id}`}
                            onClick={() => handleSelectTab(item.id)}
                            className={cn(
                              "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-all text-left group cursor-pointer",
                              isActive
                                ? "bg-emerald-800 text-white font-bold shadow-2xs"
                                : "text-slate-600 font-medium hover:bg-emerald-50/70 hover:text-emerald-950"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-105",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-800"
                              )}
                              strokeWidth={2}
                            />
                            <span className="truncate leading-tight text-[11.5px]">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  )}
                </div>
              )}

              {/* Menu Section 2: Operasional & Input Data (Desktop) */}
              {operationalMenuItems.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Operasional &amp; Input Data
                  </div>
                  <nav className="space-y-0.5">
                    {operationalMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-${item.id}`}
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer border shadow-2xs group",
                            isActive
                              ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-1 ring-emerald-700/50"
                              : "text-emerald-950 bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200/90 hover:border-emerald-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                                isActive ? "text-white" : "text-emerald-800"
                              )}
                              strokeWidth={2.2}
                            />
                            <span className="truncate leading-tight text-[11.5px]">
                              {item.label}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border",
                            isActive ? "bg-emerald-950/80 text-emerald-100 border-emerald-700/80" : "bg-emerald-100/80 text-emerald-900 border-emerald-200"
                          )}>
                            Input RTP
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Menu Kelola Data & Hak Akses: Desktop */}
              {(canUploadSAP || canManageUsers) && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Kelola Data &amp; Hak Akses
                  </div>
                  <div className="space-y-1">
                    {canUploadSAP && (
                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(true)}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold text-slate-700 bg-slate-50/70 hover:bg-emerald-50/80 hover:text-emerald-950 transition-all border border-slate-200/80 hover:border-emerald-300 cursor-pointer shadow-2xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <Upload className="h-4 w-4 text-emerald-700 group-hover:scale-105 transition-transform" strokeWidth={2} />
                          <span>Upload Data SAP</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200">
                          Excel
                        </span>
                      </button>
                    )}

                    {canManageUsers && (
                      <button
                        type="button"
                        id="sidebar-users"
                        onClick={() => handleSelectTab('users')}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-bold transition-all text-left cursor-pointer border shadow-2xs group",
                          activeTab === 'users'
                            ? "bg-emerald-800 text-white border-emerald-900 shadow-xs ring-1 ring-emerald-700/50"
                            : "text-slate-700 bg-slate-50/70 hover:bg-emerald-50/80 hover:text-emerald-950 border-slate-200/80 hover:border-emerald-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", activeTab === 'users' ? "text-white" : "text-emerald-700")} strokeWidth={2} />
                          <span>Kelola Pengguna</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
                          activeTab === 'users' ? "bg-emerald-950/80 text-emerald-100 border-emerald-700" : "bg-emerald-100 text-emerald-900 border-emerald-200"
                        )}>
                          Roles
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* User Profile Snippet in Sidebar Footer */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-2 rounded-md bg-slate-50/90 border border-slate-200/90 flex items-center justify-between text-xs font-mono">
                  <div className="min-w-0 pr-1">
                    <div className="font-bold text-slate-900 truncate text-[11px] leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{currentUser.department}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors cursor-pointer shrink-0"
                    title="Keluar / Ganti Akun"
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Content Area */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Executive Overview KPI Cards (Hidden based on preference) */}
          {/* <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              title="Stock Pipa"
              value={formatTon(totalStockPipa, { showUnit: true })}
              description={`Terisi ${formatPercent(pipeUtilisasiPct)}`}
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
                <span className="font-bold">Peringatan Kapasitas Terisi Melebihi Batas: </span>
                {overcapacityWh.gudang} saat ini mencapai <strong>{formatPercent(overcapacityWh.persenTerisi)}</strong> ({formatTon(overcapacityWh.stock, { showUnit: true })} / Kapasitas {formatTon(overcapacityWh.kapasitas, { showUnit: true })}). Disarankan evaluasi relokasi atau percepatan pengiriman order.
              </div>
            </div>
          )}

          {/* Active Tab View */}
          <div className="space-y-6">
            {activeTab === 'capacity' && (currentUser.role === 'admin' || userPermissions.viewCapacity) && (
              <PipeCapacityView
                data={pipeCapacities}
                selectedGudang={selectedGudangFilter}
                onSelectGudang={setSelectedGudangFilter}
                customerBreakdown={customerBreakdown}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'fastslow' && (currentUser.role === 'admin' || userPermissions.viewFastSlow) && (
              <FastSlowView
                data={fastSlowData}
                pipeData={unfifoPipeData}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'coilstrip' && (currentUser.role === 'admin' || userPermissions.viewCoilStrip) && (
              <CoilStripView
                data={coilStripData}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'nc' && (currentUser.role === 'admin' || userPermissions.viewNC) && (
              <NCQualityView
                ncWarehouseData={ncWarehouseData}
                ncItems={ncItems}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'unfifo' && (currentUser.role === 'admin' || userPermissions.viewUnfifo) && (
              <UnfifoView
                coilData={unfifoCoilData}
                pipeData={unfifoPipeData}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'loo' && (currentUser.role === 'admin' || userPermissions.viewLoo) && (
              <LooFulfillmentView
                stData={looSTData}
                ltData={looLTData}
                pipeCapacities={pipeCapacities}
                isCustomizing={canCustomizeLayout ? isCustomizingLayout : false}
              />
            )}

            {activeTab === 'packaging' && (currentUser.role === 'admin' || userPermissions.viewDamagedPkg) && (
              <DamagedPackagingView
                data={damagedPackagingData}
                isCustomizing={canEditDamagedPkg ? isCustomizingLayout : false}
                onDataUpdate={async (newData) => {
                  setDamagedPackagingData(newData);
                  setIsCustomData(true);
                  try {
                    const localSaved = localStorage.getItem('spindo_warehouse_saved_state');
                    const prev = localSaved ? JSON.parse(localSaved) : {};
                    const updatedState = { ...prev, damagedPackagingData: newData };
                    localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(updatedState));
                    await fetch('/api/warehouse', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedState),
                    });
                  } catch (err) {
                    console.error('Failed to sync damaged packaging data:', err);
                  }
                }}
              />
            )}

            {activeTab === 'incoming_pkg' && (currentUser.role === 'admin' || userPermissions.viewIncomingPkg) && (
              <IncomingPackagingView
                data={incomingPackagingData}
                stockCustomers={allStockCustomers}
                isAdmin={currentUser?.role === 'admin' || canUploadSAP}
                isCustomizing={canEditIncomingPkg ? isCustomizingLayout : false}
                onDataUpdate={async (newData) => {
                  setIncomingPackagingData(newData);
                  setIsCustomData(true);
                  try {
                    const localSaved = localStorage.getItem('spindo_warehouse_saved_state');
                    const prev = localSaved ? JSON.parse(localSaved) : {};
                    const updatedState = { ...prev, incomingPackagingData: newData };
                    localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(updatedState));
                    await fetch('/api/warehouse', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedState),
                    });
                  } catch (err) {
                    console.error('Failed to sync incoming packaging data:', err);
                  }
                }}
              />
            )}

            {activeTab === 'users' && canManageUsers && (
              <UserManagementView
                currentUser={currentUser}
                onRolesUpdated={(updatedRoles) => setSystemRoles(updatedRoles)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Excel Upload Modal (Authorized Users Only) */}
      <UploadModal
        isOpen={canUploadSAP && isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataParsed={handleDataParsed}
      />
    </div>
  );
}
