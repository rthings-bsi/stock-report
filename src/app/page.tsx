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
  X,
  GitFork
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
import { NCProgressView } from '@/components/NCProgressView';
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
import { initialNCProgressData } from '@/lib/ncProgressData';
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
  IncomingPackagingItem,
  NCProgressTransaction
} from '@/types/warehouse';
import { ParsedWarehouseState } from '@/lib/parser';
import { cn, formatTon, formatPercent } from '@/lib/utils';

const VALID_TABS = [
  'capacity',
  'fastslow',
  'coilstrip',
  'nc',
  'nc_progress',
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
  const [ncProgressData, setNcProgressData] = useState<NCProgressTransaction[]>(initialNCProgressData);
  const [customerBreakdown, setCustomerBreakdown] = useState<Record<string, Array<{ customer: string; qty: number; tonase: number }>>>({});

  // Application State
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('02.09.2026 - 07:31 WIB');
  const [isCustomData, setIsCustomData] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isCustomizingLayout, setIsCustomizingLayout] = useState<boolean>(false);
  const [selectedSnapshotKey, setSelectedSnapshotKey] = useState<string>('latest');
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState<boolean>(false);
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

  // Load saved auth session (sessionStorage takes precedence; fallback to valid rememberMe in localStorage)
  useEffect(() => {
    try {
      // 1. Cek active session dari sessionStorage (hilang saat tab/browser ditutup)
      const sessionAuth = sessionStorage.getItem('spindo_auth_session');
      if (sessionAuth) {
        setCurrentUser(JSON.parse(sessionAuth));
        setIsAuthChecking(false);
        return;
      }

      // 2. Cek apakah ada opsi "Ingat Saya" (dengan masa berlaku 7 hari)
      const rememberAuthStr = localStorage.getItem('spindo_auth_remember');
      if (rememberAuthStr) {
        const rememberData = JSON.parse(rememberAuthStr);
        if (rememberData.expiresAt && Date.now() < rememberData.expiresAt && rememberData.user) {
          setCurrentUser(rememberData.user);
          sessionStorage.setItem('spindo_auth_session', JSON.stringify(rememberData.user));
          setIsAuthChecking(false);
          return;
        } else {
          // Token expired, hapus
          localStorage.removeItem('spindo_auth_remember');
        }
      }

      // Bersihkan legacy permanent login jika ada
      localStorage.removeItem('spindo_auth_user');
    } catch {}
    setIsAuthChecking(false);
  }, []);

  const handleLogin = (session: UserSession, rememberMe: boolean = false) => {
    setCurrentUser(session);
    try {
      // Selalu simpan di sessionStorage agar aktif selama tab/window terbuka
      sessionStorage.setItem('spindo_auth_session', JSON.stringify(session));

      if (rememberMe) {
        // Simpan di localStorage dengan masa berlaku 7 hari
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem(
          'spindo_auth_remember',
          JSON.stringify({ user: session, expiresAt })
        );
      } else {
        localStorage.removeItem('spindo_auth_remember');
      }

      // Hapus legacy permanent auth key
      localStorage.removeItem('spindo_auth_user');
    } catch {}
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsCustomizingLayout(false);
    try {
      sessionStorage.removeItem('spindo_auth_session');
      localStorage.removeItem('spindo_auth_remember');
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

  // Load specific snapshot key
  const loadSnapshotByKey = async (key: string) => {
    setIsLoadingSnapshot(true);
    setSelectedSnapshotKey(key);
    try {
      const res = await fetch(`/api/warehouse?key=${encodeURIComponent(key)}`, { cache: 'no-store' });
      const json = await res.json();
      if (json?.success && json?.data) {
        const d = json.data;
        setPipeCapacities(d.pipeCapacities || []);
        setFastSlowData(d.fastSlowData || []);
        setCoilStripData(d.coilStripData || []);
        setNcWarehouseData(d.ncWarehouseData || []);
        setNcItems(d.ncItems || []);
        setLooSTData(d.looSTData || []);
        setLooLTData(d.looLTData || []);
        setUnfifoData(d.unfifoData || []);
        setUnfifoCoilData(d.unfifoCoilData || []);
        setUnfifoPipeData(d.unfifoPipeData || []);
        setDamagedPackagingData(d.damagedPackagingData || []);
        setIncomingPackagingData(d.incomingPackagingData || []);
        setNcProgressData(d.ncProgressData || []);
        setCustomerBreakdown(d.customerBreakdown || {});
        setLastUpdated(d.lastUpdated || '');
        setIsCustomData(true);
      }
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    } finally {
      setIsLoadingSnapshot(false);
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
          if (d.unfifoCoilData?.length > 0) setUnfifoCoilData(d.unfifoCoilData);
          if (d.unfifoPipeData?.length > 0) setUnfifoPipeData(d.unfifoPipeData);
          if (d.damagedPackagingData?.length > 0) setDamagedPackagingData(d.damagedPackagingData);
          if (d.incomingPackagingData?.length > 0) setIncomingPackagingData(d.incomingPackagingData);
          if (d.ncProgressData?.length > 0) setNcProgressData(d.ncProgressData);
          if (d.customerBreakdown && Object.keys(d.customerBreakdown).length > 0) setCustomerBreakdown(d.customerBreakdown);
          if (d.lastUpdated) setLastUpdated(d.lastUpdated);
          setIsCustomData(true);
        }
      } catch (err) {
        console.error('Failed to parse localStorage cache:', err);
      }

      // 2. Sinkronkan dengan server database Supabase / SQLite
      try {
        const [whRes, pkgRes] = await Promise.allSettled([
          fetch('/api/warehouse', { cache: 'no-store' }),
          fetch('/api/incoming-packaging', { cache: 'no-store' })
        ]);

        if (whRes.status === 'fulfilled') {
          const json = await whRes.value.json();
          if (json?.success) {
            if (json.data) {
              const d = json.data;
              if (d.pipeCapacities?.length > 0) setPipeCapacities(d.pipeCapacities);
              if (d.fastSlowData?.length > 0) setFastSlowData(d.fastSlowData);
              if (d.coilStripData?.length > 0) setCoilStripData(d.coilStripData);
              if (d.ncWarehouseData?.length > 0) setNcWarehouseData(d.ncWarehouseData);
              if (d.ncItems?.length > 0) setNcItems(d.ncItems);
              if (d.looSTData?.length > 0) setLooSTData(d.looSTData);
              if (d.looLTData?.length > 0) setLooLTData(d.looLTData);
              if (d.unfifoData?.length > 0) setUnfifoData(d.unfifoData);
              if (d.unfifoCoilData?.length > 0) setUnfifoCoilData(d.unfifoCoilData);
              if (d.unfifoPipeData?.length > 0) setUnfifoPipeData(d.unfifoPipeData);
              if (d.damagedPackagingData?.length > 0) setDamagedPackagingData(d.damagedPackagingData);
              if (d.ncProgressData?.length > 0) setNcProgressData(d.ncProgressData);
              if (d.customerBreakdown && Object.keys(d.customerBreakdown).length > 0) setCustomerBreakdown(d.customerBreakdown);
              if (d.lastUpdated) setLastUpdated(d.lastUpdated);
              setIsCustomData(true);
            }
          }
        }

        // Load incoming packaging dari tabel terpisah
        if (pkgRes.status === 'fulfilled') {
          const pkgJson = await pkgRes.value.json();
          if (pkgJson?.success && Array.isArray(pkgJson.items)) {
            setIncomingPackagingData(pkgJson.items);
          }
        }
      } catch (err) {
        console.error('Failed to auto-load saved state from server:', err);
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
      ncProgressData,
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
    let currentSaved: Partial<ParsedWarehouseState> = {};
    try {
      const localSaved = localStorage.getItem('spindo_warehouse_saved_state');
      if (localSaved) {
        currentSaved = JSON.parse(localSaved);
      }
    } catch (e) {
      console.error('Failed to read localStorage:', e);
    }

    const hasPipe = Boolean(newState.pipeCapacities && newState.pipeCapacities.length > 0);
    const hasCoil = Boolean(newState.coilStripData && newState.coilStripData.length > 0);
    const hasLoo = Boolean((newState.looSTData && newState.looSTData.length > 0) || (newState.looLTData && newState.looLTData.length > 0));
    const hasDamagedPkg = Boolean(newState.damagedPackagingData && newState.damagedPackagingData.length > 0);
    const hasIncomingPkg = Boolean(newState.incomingPackagingData && newState.incomingPackagingData.length > 0);
    const hasProgressNC = Boolean(newState.ncProgressData && newState.ncProgressData.length > 0);

    const nextPipeCapacities = hasPipe ? newState.pipeCapacities! : (pipeCapacities.length > 0 ? pipeCapacities : (currentSaved.pipeCapacities || []));
    const nextFastSlowData = hasPipe && newState.fastSlowData ? newState.fastSlowData : (fastSlowData.length > 0 ? fastSlowData : (currentSaved.fastSlowData || []));
    const nextNcWarehouseData = hasPipe && newState.ncWarehouseData ? newState.ncWarehouseData : (ncWarehouseData.length > 0 ? ncWarehouseData : (currentSaved.ncWarehouseData || []));
    const nextNcItems = hasPipe && newState.ncItems ? newState.ncItems : (ncItems.length > 0 ? ncItems : (currentSaved.ncItems || []));
    const nextUnfifoPipeData = hasPipe && newState.unfifoPipeData ? newState.unfifoPipeData : (unfifoPipeData.length > 0 ? unfifoPipeData : (currentSaved.unfifoPipeData || []));
    const nextCustomerBreakdown = hasPipe && newState.customerBreakdown ? newState.customerBreakdown : (Object.keys(customerBreakdown).length > 0 ? customerBreakdown : (currentSaved.customerBreakdown || {}));
    const nextUnfifoData = (hasPipe || hasCoil) && newState.unfifoData ? newState.unfifoData : (unfifoData.length > 0 ? unfifoData : (currentSaved.unfifoData || []));

    const nextCoilStripData = hasCoil ? newState.coilStripData! : (coilStripData.length > 0 ? coilStripData : (currentSaved.coilStripData || []));
    const nextUnfifoCoilData = hasCoil && newState.unfifoCoilData ? newState.unfifoCoilData : (unfifoCoilData.length > 0 ? unfifoCoilData : (currentSaved.unfifoCoilData || []));

    const nextLooSTData = hasLoo && newState.looSTData ? newState.looSTData : (looSTData.length > 0 ? looSTData : (currentSaved.looSTData || []));
    const nextLooLTData = hasLoo && newState.looLTData ? newState.looLTData : (looLTData.length > 0 ? looLTData : (currentSaved.looLTData || []));

    const nextDamagedPackagingData = hasDamagedPkg ? newState.damagedPackagingData! : (damagedPackagingData.length > 0 ? damagedPackagingData : (currentSaved.damagedPackagingData || []));
    const nextIncomingPackagingData = hasIncomingPkg ? newState.incomingPackagingData! : (incomingPackagingData.length > 0 ? incomingPackagingData : (currentSaved.incomingPackagingData || []));
    const nextNcProgressData = hasProgressNC ? newState.ncProgressData! : (ncProgressData.length > 0 ? ncProgressData : (currentSaved.ncProgressData || []));

    const snapshotKey = newState.snapshotKey || `snap_${new Date().toISOString().slice(0, 10)}`;
    const nowStr = newState.lastUpdated || new Date().toLocaleString('id-ID');

    if (hasPipe) {
      setPipeCapacities(nextPipeCapacities);
      setFastSlowData(nextFastSlowData);
      setNcWarehouseData(nextNcWarehouseData);
      setNcItems(nextNcItems);
      setUnfifoPipeData(nextUnfifoPipeData);
      setCustomerBreakdown(nextCustomerBreakdown);
    }
    if (hasCoil) {
      setCoilStripData(nextCoilStripData);
      setUnfifoCoilData(nextUnfifoCoilData);
    }
    if (hasLoo || hasPipe) {
      setLooSTData(nextLooSTData);
      setLooLTData(nextLooLTData);
    }
    if (hasPipe || hasCoil) {
      setUnfifoData(nextUnfifoData);
    }
    if (hasDamagedPkg) {
      setDamagedPackagingData(nextDamagedPackagingData);
    }
    if (hasIncomingPkg) {
      setIncomingPackagingData(nextIncomingPackagingData);
    }
    if (hasProgressNC) {
      setNcProgressData(nextNcProgressData);
    }

    setLastUpdated(nowStr);
    setIsCustomData(true);
    setSelectedSnapshotKey(snapshotKey);
    setIsUploadOpen(false);

    const mergedFullState: ParsedWarehouseState = {
      pipeCapacities: nextPipeCapacities,
      fastSlowData: nextFastSlowData,
      coilStripData: nextCoilStripData,
      ncWarehouseData: nextNcWarehouseData,
      ncItems: nextNcItems,
      looSTData: nextLooSTData,
      looLTData: nextLooLTData,
      unfifoData: nextUnfifoData,
      unfifoCoilData: nextUnfifoCoilData,
      unfifoPipeData: nextUnfifoPipeData,
      damagedPackagingData: nextDamagedPackagingData,
      incomingPackagingData: nextIncomingPackagingData,
      ncProgressData: nextNcProgressData,
      customerBreakdown: nextCustomerBreakdown,
      lastUpdated: nowStr,
      snapshotKey: snapshotKey,
      targetDate: newState.targetDate,
    };

    // Auto-save ganda (LocalStorage + Server API)
    try {
      localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(mergedFullState));
      const res = await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedFullState),
      });

      const resJson = await res.json().catch(() => null);
      if (!res.ok || !resJson?.success) {
        console.error('Server save error:', resJson);
      }

      if (hasIncomingPkg && newState.incomingPackagingData) {
        await fetch('/api/incoming-packaging', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newState.incomingPackagingData),
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to sync uploaded data to server:', err);
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
    setNcProgressData(initialNCProgressData);
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
  const canUploadSAP =
    currentUser?.role === 'admin' ||
    Boolean(
      userPermissions.canUploadPipe ||
      userPermissions.canUploadCoil ||
      userPermissions.canUploadLoo ||
      userPermissions.canUploadDamagedPkg ||
      userPermissions.canUploadIncomingPkg ||
      userPermissions.canUploadProgressNC ||
      userPermissions.canUploadSAP
    );
  const canCustomizeLayout = currentUser?.role === 'admin' || Boolean(userPermissions.canCustomizeLayout);
  const canEditIncomingPkg = currentUser?.role === 'admin' || Boolean(userPermissions.canEditIncomingPkg);
  const canEditDamagedPkg = currentUser?.role === 'admin' || Boolean(userPermissions.canEditDamagedPkg);
  const canEditProgressNC = currentUser?.role === 'admin' || Boolean(userPermissions.canEditProgressNC);
  const isEditable = canManageUsers || canUploadSAP;

  // Master definition of all possible menu items with their required permission keys
  const allDashboardMenuItems = useMemo(() => [
    { id: 'capacity', label: 'Stock Pipa vs Kapasitas', icon: Layers, desc: '% Terisi & Free Stock', permKey: 'viewCapacity' },
    { id: 'fastslow', label: 'Fast vs Slow Moving', icon: Clock, desc: 'Analisis PASM Pipa', permKey: 'viewFastSlow' },
    { id: 'coilstrip', label: 'Coil & Strip', icon: Disc, desc: 'Bahan Baku Induk', permKey: 'viewCoilStrip' },
    { id: 'nc', label: 'Stock NC', icon: ShieldAlert, desc: 'Grade E & Mutu C', permKey: 'viewNC' },
    { id: 'nc_progress', label: 'Progres NC & Repair', icon: GitFork, desc: 'MVT 309, 261 & 101', permKey: 'viewProgressNC' },
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
    { id: 'incoming_pkg', label: 'Audit Harian Packaging', icon: PackageCheck, desc: 'Audit Mutasi & Kondisi RTP', permKey: 'viewIncomingPkg' },
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
                <span className="text-xs font-bold font-mono tracking-wider text-slate-800 uppercase">Menu Sistem</span>
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

            {/* Section 1: Monitoring Gudang (Mobile) */}
            {dashboardMenuItems.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Monitoring Gudang
                </div>
                <nav className="space-y-1">
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
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all text-left cursor-pointer",
                          isActive
                            ? "bg-emerald-700 text-white shadow-sm font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-white" : "text-slate-400")} strokeWidth={isActive ? 2.2 : 1.8} />
                          <span className="truncate leading-normal">{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Section 2: Operasional & Input Data (Mobile) */}
            {operationalMenuItems.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Operasional
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
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all text-left cursor-pointer",
                          isActive
                            ? "bg-emerald-700 text-white shadow-sm font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-white" : "text-slate-400")} strokeWidth={isActive ? 2.2 : 1.8} />
                          <span className="truncate leading-normal">{item.label}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                          isActive ? "bg-white/20 text-white border-white/20" : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                        )}>
                          Input
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Menu Kelola Data & Hak Akses: Mobile */}
            {(canUploadSAP || canManageUsers) && (
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pengaturan &amp; Data
                </div>
                <div className="space-y-1">
                  {canUploadSAP && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUploadOpen(true);
                        setIsMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Upload className="h-4.5 w-4.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                        <span className="truncate leading-normal">Upload Raw Data SAP</span>
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
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
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all cursor-pointer",
                        activeTab === 'users'
                          ? "bg-emerald-700 text-white shadow-sm font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Users className={cn("h-4.5 w-4.5 shrink-0", activeTab === 'users' ? "text-white" : "text-slate-400")} strokeWidth={activeTab === 'users' ? 2.2 : 1.8} />
                        <span className="truncate leading-normal">Kelola Pengguna</span>
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                        activeTab === 'users' ? "bg-white/20 text-white border-white/20" : "bg-slate-100 text-slate-600 border-slate-200/60"
                      )}>
                        RBAC
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mobile User Profile Footer */}
            <div className="pt-3 border-t border-slate-100 mt-auto">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 text-xs truncate leading-snug">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate leading-snug">
                      {currentUser.role === 'admin' ? 'Administrator' : 'Staff Operasional'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Layout Container with Sidebar */}
      <div className="flex-1 flex w-full mx-auto px-3 sm:px-6 lg:px-8 2xl:px-10 py-5 gap-5">
        {/* Modern Clean Sidebar (Expandable / Collapsible Rail) */}
        <aside
          className={cn(
            "shrink-0 hidden md:flex flex-col transition-all duration-200",
            isSidebarOpen ? "w-64" : "w-14"
          )}
        >
          {isSidebarOpen ? (
            /* FULL SIDEBAR (w-64) */
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm space-y-4">

              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Menu Navigasi
                </span>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Kecilkan Sidebar (Ctrl+B)"
                >
                  <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {/* Menu Section 1: Monitoring Gudang */}
              {dashboardMenuItems.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Monitoring Gudang
                  </div>
                  <nav className="space-y-1">
                    {dashboardMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-${item.id}`}
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all text-left cursor-pointer group",
                            isActive
                              ? "bg-emerald-700 text-white shadow-sm font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={cn(
                                "h-4.5 w-4.5 shrink-0 transition-colors",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-700"
                              )}
                              strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            <span className="truncate leading-normal">
                              {item.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Menu Section 2: Operasional & Input Data (Desktop) */}
              {operationalMenuItems.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Operasional
                  </div>
                  <nav className="space-y-1">
                    {operationalMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-${item.id}`}
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all text-left cursor-pointer group",
                            isActive
                              ? "bg-emerald-700 text-white shadow-sm font-semibold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon
                              className={cn(
                                "h-4.5 w-4.5 shrink-0 transition-colors",
                                isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-700"
                              )}
                              strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            <span className="truncate leading-normal">
                              {item.label}
                            </span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 transition-colors",
                            isActive
                              ? "bg-white/20 text-white border-white/20"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          )}>
                            Input
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              )}

              {/* Menu Kelola Data & Hak Akses: Desktop */}
              {(canUploadSAP || canManageUsers) && (
                <div className="pt-3 border-t border-slate-100 space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Pengaturan &amp; Data
                  </div>
                  <div className="space-y-1">
                    {canUploadSAP && (
                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(true)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Upload className="h-4.5 w-4.5 text-slate-400 group-hover:text-emerald-700 shrink-0 transition-colors" strokeWidth={1.8} />
                          <span className="truncate leading-normal">Upload Raw Data SAP</span>
                        </div>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200/60 shrink-0">
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
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-all text-left cursor-pointer group",
                          activeTab === 'users'
                            ? "bg-emerald-700 text-white shadow-sm font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Users className={cn("h-4.5 w-4.5 shrink-0 transition-colors", activeTab === 'users' ? "text-white" : "text-slate-400 group-hover:text-emerald-700")} strokeWidth={activeTab === 'users' ? 2.2 : 1.8} />
                          <span className="truncate leading-normal">Kelola Pengguna</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 transition-colors",
                          activeTab === 'users' ? "bg-white/20 text-white border-white/20" : "bg-slate-100 text-slate-600 border-slate-200/60"
                        )}>
                          RBAC
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* User Profile Snippet in Sidebar Footer */}
              <div className="pt-3 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2.5 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs truncate leading-snug">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate leading-snug">
                        {currentUser.role === 'admin' ? 'Administrator' : 'Staff Operasional'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                    title="Keluar / Ganti Akun"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* COMPACT ICON RAIL (w-14) */
            <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm flex flex-col items-center gap-2">
              {/* Expand Toggle */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                title="Perluas Sidebar (Ctrl+B)"
              >
                <PanelLeftOpen className="h-4.5 w-4.5" strokeWidth={2} />
              </button>

              <div className="w-6 h-[1px] bg-slate-100" />

              {/* Dashboard Items */}
              <div className="space-y-1 w-full flex flex-col items-center">
                {dashboardMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={cn(
                        "h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer",
                        isActive
                          ? "bg-emerald-700 text-white shadow-sm font-semibold"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                      title={item.label}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                    </button>
                  );
                })}
              </div>

              {/* Operational Items */}
              {operationalMenuItems.length > 0 && (
                <>
                  <div className="w-6 h-[1px] bg-slate-100" />
                  <div className="space-y-1 w-full flex flex-col items-center">
                    {operationalMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={cn(
                            "h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer",
                            isActive
                              ? "bg-emerald-700 text-white shadow-sm font-semibold"
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                          )}
                          title={`${item.label} (Input RTP)`}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Admin Tools */}
              {(canUploadSAP || canManageUsers) && (
                <>
                  <div className="w-6 h-[1px] bg-slate-100" />
                  <div className="space-y-1 w-full flex flex-col items-center">
                    {canUploadSAP && (
                      <button
                        type="button"
                        onClick={() => setIsUploadOpen(true)}
                        className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
                        title="Upload Raw Data SAP"
                      >
                        <Upload className="h-4.5 w-4.5" strokeWidth={1.8} />
                      </button>
                    )}
                    {canManageUsers && (
                      <button
                        type="button"
                        onClick={() => handleSelectTab('users')}
                        className={cn(
                          "h-9 w-9 flex items-center justify-center rounded-xl transition-all cursor-pointer",
                          activeTab === 'users'
                            ? "bg-emerald-700 text-white shadow-sm font-semibold"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        title="Kelola Pengguna & Roles"
                      >
                        <Users className="h-4.5 w-4.5" strokeWidth={activeTab === 'users' ? 2.2 : 1.8} />
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* User Avatar */}
              <div className="w-6 h-[1px] bg-slate-100 mt-auto" />
              <div
                className="h-8 w-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </aside>

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

          {/* Historical Snapshot Notice Banner */}
          {selectedSnapshotKey !== 'latest' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/95 p-3.5 text-xs text-amber-950 shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-900">
                    Mode Snapshot Historis Aktif (Tanggal: {selectedSnapshotKey.replace('snap_', '')})
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Menampilkan data snapshot arsip per {lastUpdated}. Modifikasi data baru tidak mengubah arsip ini.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadSnapshotByKey('latest')}
                disabled={isLoadingSnapshot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white font-bold transition-all shadow-2xs cursor-pointer text-[11px] shrink-0 disabled:opacity-50"
              >
                <RefreshCcw className={cn("h-3 w-3", isLoadingSnapshot && "animate-spin")} />
                <span>Kembali ke Data Terkini</span>
              </button>
            </div>
          )}

          {/* Global Alert Notification Banner (Hidden on Mobile) */}
          {overcapacityWh && (
            <div className="hidden sm:flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50/90 p-3.5 text-xs text-amber-900 shadow-2xs">
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

            {activeTab === 'nc_progress' && (currentUser.role === 'admin' || userPermissions.viewProgressNC) && (
              <NCProgressView
                data={ncProgressData}
                isAdmin={currentUser?.role === 'admin' || canUploadSAP}
                canEdit={canEditProgressNC}
                onDataUpdate={async (newData) => {
                  setNcProgressData(newData);
                  setIsCustomData(true);
                  try {
                    const localSaved = localStorage.getItem('spindo_warehouse_saved_state');
                    const prev = localSaved ? JSON.parse(localSaved) : {};
                    const updatedState = { ...prev, ncProgressData: newData };
                    localStorage.setItem('spindo_warehouse_saved_state', JSON.stringify(updatedState));
                    await fetch('/api/warehouse', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedState),
                    });
                  } catch (err) {
                    console.error('Failed to sync NC progress data:', err);
                  }
                }}
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
                    // Sync langsung ke tabel database terpisah incoming_packaging
                    await fetch('/api/incoming-packaging', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newData),
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
        userPermissions={userPermissions}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  );
}
