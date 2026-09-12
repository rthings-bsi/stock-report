'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  ShieldAlert,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  Building2,
  RotateCcw,
  Eye,
  EyeOff,
  AlertCircle,
  Sliders,
  Shield,
  Layers,
  Clock,
  Disc,
  RefreshCcw,
  TrendingUp,
  PackageX,
  PackageCheck,
  Upload,
  Download,
  Settings,
  Database,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  UserRole,
  UserSession,
  StoredAccount,
  CustomRole,
  RolePermissions,
  PRESET_ROLES,
  DEFAULT_STAFF_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS
} from '@/types/auth';

interface UserManagementViewProps {
  currentUser: UserSession;
  onRolesUpdated?: (roles: CustomRole[]) => void;
}

const EMPTY_USER_FORM: {
  id?: number;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  department: string;
  unit: string;
} = {
  username: '',
  password: '',
  name: '',
  role: 'staff',
  department: 'Warehouse Staff',
  unit: 'Unit 5 - Spindo'
};

const EMPTY_ROLE_FORM: {
  id?: number;
  key: string;
  name: string;
  description: string;
  color: string;
  permissions: RolePermissions;
} = {
  key: '',
  name: '',
  description: '',
  color: 'sky',
  permissions: { ...DEFAULT_STAFF_PERMISSIONS }
};

const COLOR_OPTIONS = [
  { key: 'emerald', label: 'Emerald (Hijau)', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { key: 'sky', label: 'Sky (Biru)', bg: 'bg-sky-100 text-sky-900 border-sky-300' },
  { key: 'indigo', label: 'Indigo (Ungu Biru)', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  { key: 'amber', label: 'Amber (Oranye)', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  { key: 'purple', label: 'Purple (Ungu)', bg: 'bg-purple-100 text-purple-900 border-purple-300' },
  { key: 'rose', label: 'Rose (Merah)', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
  { key: 'slate', label: 'Slate (Abu-abu)', bg: 'bg-slate-100 text-slate-900 border-slate-300' }
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser, onRolesUpdated }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');

  // Users State
  const [users, setUsers] = useState<StoredAccount[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>(PRESET_ROLES);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);

  // Search & Filter
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>('');

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<StoredAccount | null>(null);
  const [userFormData, setUserFormData] = useState(EMPTY_USER_FORM);
  const [userFormError, setUserFormError] = useState<string>('');
  const [isSubmittingUser, setIsSubmittingUser] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleFormData, setRoleFormData] = useState(EMPTY_ROLE_FORM);
  const [roleFormError, setRoleFormError] = useState<string>('');
  const [isSubmittingRole, setIsSubmittingRole] = useState<boolean>(false);

  // Delete Modals
  const [deleteUserTarget, setDeleteUserTarget] = useState<StoredAccount | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<CustomRole | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Feedback Notification
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        try {
          localStorage.setItem('spindo_users_list', JSON.stringify(data.users));
        } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));}
      }
    } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));
      const local = localStorage.getItem('spindo_users_list');
      if (local) setUsers(JSON.parse(local));
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch Roles
  const fetchRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.roles)) {
        setRoles(data.roles);
        if (onRolesUpdated) onRolesUpdated(data.roles);
        try {
          localStorage.setItem('spindo_custom_roles', JSON.stringify(data.roles));
        } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));}
      }
    } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));
      const local = localStorage.getItem('spindo_custom_roles');
      if (local) setRoles(JSON.parse(local));
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // --- USER HANDLERS ---
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserFormData(EMPTY_USER_FORM);
    setUserFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: StoredAccount) => {
    setEditingUser(user);
    setUserFormData({
      id: user.id,
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      department: user.department || 'Warehouse Staff',
      unit: user.unit || 'Unit 5 - Spindo'
    });
    setUserFormError('');
    setShowPassword(false);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    setIsSubmittingUser(true);

    try {
      const payload: any = {
        username: userFormData.username.trim().toLowerCase(),
        name: userFormData.name.trim(),
        role: userFormData.role,
        department: userFormData.department.trim(),
        unit: userFormData.unit.trim()
      };

      if (editingUser) {
        payload.id = editingUser.id;
        payload.action = 'update';
        if (userFormData.password && userFormData.password.trim() !== '') {
          payload.password = userFormData.password.trim();
        }
      } else {
        if (!userFormData.password || userFormData.password.trim() === '') {
          setUserFormError('Password wajib diisi untuk user baru.');
          setIsSubmittingUser(false);
          return;
        }
        payload.password = userFormData.password.trim();
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsUserModalOpen(false);
        showFeedback(data.message || 'Data user berhasil disimpan.', 'success');
        await fetchUsers();
      } else {
        setUserFormError(data.error || 'Gagal menyimpan user.');
      }
    } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));
      setUserFormError('Terjadi kesalahan koneksi server (Fetch Error).');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/users?id=${deleteUserTarget.id}&username=${encodeURIComponent(deleteUserTarget.username)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDeleteUserTarget(null);
        showFeedback(data.message || 'User berhasil dihapus.', 'success');
        await fetchUsers();
      } else {
        setDeleteError(data.error || 'Gagal menghapus user.');
      }
    } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));
      setDeleteError('Terjadi kesalahan koneksi saat menghapus.');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- ROLE HANDLERS ---
  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({
      key: '',
      name: '',
      description: '',
      color: 'sky',
      permissions: { ...DEFAULT_STAFF_PERMISSIONS }
    });
    setRoleFormError('');
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: CustomRole) => {
    setEditingRole(role);
    const p = role.permissions || ({} as RolePermissions);
    const legacyUpload = Boolean(p.canUploadSAP);
    setRoleFormData({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description || '',
      color: role.color || 'slate',
      permissions: {
        ...DEFAULT_STAFF_PERMISSIONS,
        ...p,
        canUploadPipe: p.canUploadPipe !== undefined ? p.canUploadPipe : legacyUpload,
        canUploadCoil: p.canUploadCoil !== undefined ? p.canUploadCoil : legacyUpload,
        canUploadLoo: p.canUploadLoo !== undefined ? p.canUploadLoo : legacyUpload,
        canUploadDamagedPkg: p.canUploadDamagedPkg !== undefined ? p.canUploadDamagedPkg : legacyUpload,
        canUploadIncomingPkg: p.canUploadIncomingPkg !== undefined ? p.canUploadIncomingPkg : legacyUpload
      }
    });
    setRoleFormError('');
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (key: keyof RolePermissions) => {
    setRoleFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSetAllPermissions = (value: boolean) => {
    setRoleFormData((prev) => {
      const updated = { ...prev.permissions };
      (Object.keys(updated) as (keyof RolePermissions)[]).forEach((k) => {
        updated[k] = value;
      });
      return { ...prev, permissions: updated };
    });
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormError('');
    setIsSubmittingRole(true);

    try {
      const payload: any = {
        key: roleFormData.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name: roleFormData.name.trim(),
        description: roleFormData.description.trim(),
        color: roleFormData.color,
        permissions: roleFormData.permissions
      };

      if (editingRole) {
        payload.id = editingRole.id;
        payload.action = 'update';
      }

      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsRoleModalOpen(false);
        showFeedback(data.message || 'Data role berhasil disimpan.', 'success');
        await fetchRoles();
      } else {
        setRoleFormError(data.error || 'Gagal menyimpan data role.');
      }
    } catch (err: any) {
      console.error('Role Fetch Error:', err);
      setRoleFormError(`Gagal (Client/JSON): ${err.message}`);
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/roles?key=${encodeURIComponent(deleteRoleTarget.key)}&id=${deleteRoleTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDeleteRoleTarget(null);
        showFeedback(data.message || 'Role berhasil dihapus.', 'success');
        await fetchRoles();
      } else {
        setDeleteError(data.error || 'Gagal menghapus role.');
      }
    } catch (err: any) { console.error("Fetch Error:", err); setRoleFormError("Error: " + (err.message || "Koneksi server."));
      setDeleteError('Terjadi kesalahan koneksi saat menghapus role.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper mapping role color badge
  const getRoleBadgeClasses = (roleKey: string) => {
    const matched = roles.find((r) => r.key.toLowerCase() === roleKey.toLowerCase());
    const c = matched?.color || (roleKey === 'admin' ? 'emerald' : roleKey === 'staff' ? 'sky' : 'slate');
    switch (c) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-950 border-emerald-300';
      case 'sky':
        return 'bg-sky-100 text-sky-950 border-sky-300';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-950 border-indigo-300';
      case 'amber':
        return 'bg-amber-100 text-amber-950 border-amber-300';
      case 'purple':
        return 'bg-purple-100 text-purple-950 border-purple-300';
      case 'rose':
        return 'bg-rose-100 text-rose-950 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const getRoleDisplayName = (roleKey: string) => {
    const matched = roles.find((r) => r.key.toLowerCase() === roleKey.toLowerCase());
    return matched?.name || (roleKey === 'admin' ? 'Administrator' : roleKey === 'staff' ? 'Staff Operasional' : roleKey);
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchQuery =
        !userSearchQuery ||
        u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (u.department && u.department.toLowerCase().includes(userSearchQuery.toLowerCase()));
      return matchRole && matchQuery;
    });
  }, [users, userRoleFilter, userSearchQuery]);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      return (
        !roleSearchQuery ||
        r.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        r.key.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(roleSearchQuery.toLowerCase()))
      );
    });
  }, [roles, roleSearchQuery]);

  return (
    <div className="space-y-5 font-sans">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-md text-xs font-mono font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-700" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-700" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-emerald-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-emerald-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700/80 text-emerald-200">
            {activeSubTab === 'users' ? (
              <Users className="h-4.5 w-4.5" strokeWidth={2.4} />
            ) : (
              <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.4} />
            )}
          </div>
          <h1 className="text-base font-bold text-white font-sans tracking-tight">
            {activeSubTab === 'users'
              ? 'Manajemen Pengguna (User Accounts)'
              : 'Pengaturan Peran & Hak Akses (Roles & Permissions)'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchUsers();
              fetchRoles();
            }}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-700 bg-emerald-950/80 hover:bg-emerald-900 text-white font-semibold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Segarkan Data"
          >
            <RotateCcw className="h-3.5 w-3.5 text-emerald-300" />
            <span>Segarkan</span>
          </button>

          {activeSubTab === 'users' ? (
            <button
              type="button"
              onClick={handleOpenCreateUser}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <UserPlus className="h-4 w-4 text-emerald-800" strokeWidth={2.5} />
              <span>Tambah User Baru</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateRole}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-950 font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-800" strokeWidth={2.5} />
              <span>Buat Role Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB NAVIGATOR (PILLS) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 font-mono text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          className={`px-3.5 py-2 rounded-md font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs border ${
            activeSubTab === 'users'
              ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
              : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Daftar Pengguna ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('roles')}
          className={`px-3.5 py-2 rounded-md font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs border ${
            activeSubTab === 'roles'
              ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
              : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 border-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Pengaturan Peran &amp; Hak Akses ({roles.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER MANAGEMENT VIEW                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* KPI STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
                <span>Total Pengguna</span>
                <Users className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold text-slate-900">{users.length} Akun</div>
              <div className="text-[10px] text-slate-500 font-sans">Database Terdaftar</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-300/90 shadow-2xs space-y-1 ring-1 ring-emerald-500/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 flex items-center justify-between font-sans">
                <span>Administrator</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-800" />
              </div>
              <div className="text-base font-black text-emerald-950">
                {users.filter((u) => u.role === 'admin').length} Akun
              </div>
              <div className="text-[10px] text-emerald-800 font-sans">Akses Penuh Master</div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-sky-200/90 shadow-2xs space-y-1 bg-sky-50/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 flex items-center justify-between font-sans">
                <span>Role Operasional</span>
                <UserCheck className="h-3.5 w-3.5 text-sky-600" />
              </div>
              <div className="text-base font-bold text-sky-800">
                {users.filter((u) => u.role !== 'admin').length} Akun
              </div>
              <div className="text-[10px] text-slate-500 font-sans">Staff, Viewer, Custom</div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-amber-200/90 shadow-2xs space-y-1 bg-amber-50/20">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between font-sans">
                <span>Akun Anda</span>
                <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-base font-bold text-amber-900 truncate uppercase">{currentUser.role}</div>
              <div className="text-[10px] text-slate-500 font-sans truncate">{currentUser.name}</div>
            </div>
          </div>

          {/* FILTER & SEARCH USERS */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs font-mono text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[240px]">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari username, nama, departemen..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="py-1.5 px-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="ALL">Semua Role ({users.length})</option>
                  {roles.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name} ({users.filter((u) => u.role === r.key).length})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-600">
                <span>Menampilkan:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/90">
                  {filteredUsers.length}
                </span>
                <span className="text-slate-400">/ {users.length} akun</span>
              </div>
              {(userRoleFilter !== 'ALL' || userSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setUserRoleFilter('ALL');
                    setUserSearchQuery('');
                  }}
                  className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* MAIN USERS TABLE */}
          <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 shadow-2xs">
                  <tr className="bg-slate-100 text-slate-700 text-[10px] font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center border-r border-slate-200/80 bg-slate-100 w-10">#</th>
                    <th className="py-2.5 px-3 border-r border-slate-200/80 bg-slate-100">Username</th>
                    <th className="py-2.5 px-3 border-r border-slate-200/80 bg-slate-100">Nama Lengkap</th>
                    <th className="py-2.5 px-3 border-r border-slate-200/80 bg-slate-100 text-center">Hak Akses (Role)</th>
                    <th className="py-2.5 px-3 border-r border-slate-200/80 bg-slate-100">Departemen</th>
                    <th className="py-2.5 px-3 border-r border-slate-200/80 bg-slate-100">Unit Kerja</th>
                    <th className="py-2.5 px-3 text-center bg-slate-100 text-slate-700 w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] bg-white">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        Memuat daftar pengguna...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <div className="space-y-2">
                          <p>Tidak ada data pengguna yang sesuai filter pencarian.</p>
                          <button
                            type="button"
                            onClick={handleOpenCreateUser}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-800 text-white font-bold text-xs shadow-2xs hover:bg-emerald-900 cursor-pointer"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-emerald-200" />
                            <span>Tambah User Baru</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => {
                      const isMasterAdmin = user.username === 'admin';
                      const isCurrentSessionUser = user.username === currentUser.username;
                      const badgeClass = getRoleBadgeClasses(user.role);
                      const roleName = getRoleDisplayName(user.role);

                      return (
                        <tr key={user.id || user.username} className="hover:bg-slate-50/90 transition-colors group">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-bold border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono">{user.username}</span>
                              {isCurrentSessionUser && (
                                <span className="text-[9px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  Anda
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-100">
                            {user.name}
                          </td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-100 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border shadow-2xs ${badgeClass}`}>
                              {user.role === 'admin' ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                              <span>{roleName}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100">
                            {user.department || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 border-r border-slate-100 whitespace-nowrap">
                            {user.unit || 'Unit 5 - Spindo'}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUser(user)}
                                className="p-1 rounded hover:bg-emerald-50 text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                                title="Edit User & Role"
                              >
                                <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                              <button
                                type="button"
                                disabled={isMasterAdmin || isCurrentSessionUser}
                                onClick={() => {
                                  setDeleteError('');
                                  setDeleteUserTarget(user);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  isMasterAdmin || isCurrentSessionUser
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer'
                                }`}
                                title={
                                  isMasterAdmin
                                    ? 'User master tidak dapat dihapus'
                                    : isCurrentSessionUser
                                    ? 'Tidak dapat menghapus akun sendiri yang sedang aktif'
                                    : 'Hapus User'
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROLES & PERMISSIONS MANAGEMENT VIEW                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'roles' && (
        <div className="space-y-4">
          {/* KPI STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-white border border-slate-200/90 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between font-sans">
                <span>Total Role Terdefinisi</span>
                <Shield className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <div className="text-base font-bold text-slate-900">{roles.length} Peran</div>
              <div className="text-[10px] text-slate-500 font-sans">Sistem &amp; Kustom</div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-300/90 shadow-2xs space-y-1 ring-1 ring-emerald-500/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 flex items-center justify-between font-sans">
                <span>Role Bawaan Sistem</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-800" />
              </div>
              <div className="text-base font-black text-emerald-950">
                {roles.filter((r) => r.isSystem).length} Role Master
              </div>
              <div className="text-[10px] text-emerald-800 font-sans">Administrator &amp; Staff</div>
            </div>

            <div className="p-3 rounded-lg bg-white border border-indigo-200/90 shadow-2xs space-y-1 bg-indigo-50/20 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 flex items-center justify-between font-sans">
                <span>Role Kustom Tambahan</span>
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="text-base font-bold text-indigo-900">
                {roles.filter((r) => !r.isSystem).length} Role
              </div>
              <div className="text-[10px] text-slate-500 font-sans">Dapat dikustomisasi penuh</div>
            </div>
          </div>

          {/* SEARCH ROLES */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200/90 shadow-2xs font-mono text-xs">
            <div className="relative min-w-[280px]">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode role, nama peran, deskripsi..."
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs transition-colors"
              />
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Total <strong>{filteredRoles.length}</strong> role tersedia
            </div>
          </div>

          {/* ROLES CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRoles.map((role) => {
              const badgeClass = getRoleBadgeClasses(role.key);
              const assignedCount = users.filter((u) => u.role === role.key).length;
              const perms = role.permissions || {};

              // Calculate active permissions
              const viewPermsList = [
                { key: 'viewCapacity', label: 'Stock Pipa' },
                { key: 'viewFastSlow', label: 'Fast/Slow' },
                { key: 'viewCoilStrip', label: 'Coil & Strip' },
                { key: 'viewNC', label: 'Stock NC' },
                { key: 'viewUnfifo', label: 'UNFIFO' },
                { key: 'viewLoo', label: 'LOO' },
                { key: 'viewDamagedPkg', label: 'Packaging Rusak' },
                { key: 'viewIncomingPkg', label: 'Audit Packaging' },
                { key: 'viewUserManagement', label: 'Kelola User' }
              ] as const;

              const uploadPermsList = [
                { key: 'canUploadPipe', label: 'Stock Pipa' },
                { key: 'canUploadCoil', label: 'Coil/Strip' },
                { key: 'canUploadLoo', label: 'Data LOO' },
                { key: 'canUploadDamagedPkg', label: 'Pkg Rusak' },
                { key: 'canUploadIncomingPkg', label: 'Incoming RTP' }
              ] as const;

              const actionPermsList = [
                { key: 'canEditIncomingPkg', label: 'Input RTP' },
                { key: 'canEditDamagedPkg', label: 'Edit Packaging' },
                { key: 'canExportExcel', label: 'Export Excel' },
                { key: 'canCustomizeLayout', label: 'Ubah Layout' },
                { key: 'canManageUsers', label: 'Kelola Hak Akses' },
                { key: 'canSaveSnapshot', label: 'Simpan DB' }
              ] as const;

              const activeViewCount = viewPermsList.filter((p) => perms[p.key as keyof RolePermissions]).length;
              const activeUploadCount = uploadPermsList.filter((p) => perms[p.key as keyof RolePermissions] ?? perms.canUploadSAP).length;
              const activeActionCount = actionPermsList.filter((p) => perms[p.key as keyof RolePermissions]).length;
              return (
                <div
                  key={role.key}
                  className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between space-y-4 transition-all hover:border-emerald-300"
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border shadow-2xs ${badgeClass}`}>
                          {role.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          key: {role.key}
                        </span>
                      </div>
                      {role.isSystem ? (
                        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          Sistem
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                          Kustom
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-sans leading-relaxed">
                      {role.description || 'Tidak ada deskripsi tambahan.'}
                    </p>
                  </div>

                  {/* Permissions Summary Matrix */}
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200/80 space-y-2.5 font-mono text-xs">
                    {/* View Permissions */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Akses Modul ({activeViewCount}/{viewPermsList.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {viewPermsList.map((p) => {
                          const isGranted = perms[p.key as keyof RolePermissions];
                          return (
                            <span
                              key={p.key}
                              className={`text-[9.5px] px-1.5 py-0.5 rounded border ${
                                isGranted
                                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                              }`}
                            >
                              {p.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {/* Upload Permissions */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Izin Upload Raw ({activeUploadCount}/{uploadPermsList.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {uploadPermsList.map((p) => {
                          const isGranted = perms[p.key as keyof RolePermissions] ?? perms.canUploadSAP;
                          return (
                            <span
                              key={p.key}
                              className={`text-[9.5px] px-1.5 py-0.5 rounded border ${
                                isGranted
                                  ? 'bg-amber-50 text-amber-950 border-amber-200 font-bold'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                              }`}
                            >
                              {p.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Permissions */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        <span>Hak Aksi &amp; Edit ({activeActionCount}/{actionPermsList.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {actionPermsList.map((p) => {
                          const isGranted = perms[p.key as keyof RolePermissions];
                          return (
                            <span
                              key={p.key}
                              className={`text-[9.5px] px-1.5 py-0.5 rounded border ${
                                isGranted
                                  ? 'bg-sky-50 text-sky-950 border-sky-200 font-bold'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                              }`}
                            >
                              {p.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Info & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 font-mono text-xs">
                    <span className="text-[11px] text-slate-500">
                      Pengguna: <strong className="text-slate-900">{assignedCount}</strong> akun
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRole(role)}
                        className="px-2.5 py-1 rounded-md border border-slate-300 bg-white hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-950 font-bold text-slate-700 transition-all cursor-pointer flex items-center gap-1"
                        title="Edit Peran & Matriks Izin"
                      >
                        <Pencil className="h-3 w-3 text-emerald-700" />
                        <span>Atur Izin</span>
                      </button>

                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeleteRoleTarget(role);
                          }}
                          className="px-2 py-1 rounded-md border border-rose-200 bg-white hover:bg-rose-50 font-bold text-rose-700 transition-all cursor-pointer flex items-center gap-1"
                          title="Hapus Role"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT USER                                              */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 p-4 bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs font-bold font-mono text-xs">
                  {editingUser ? <Pencil className="h-4 w-4 text-emerald-200" /> : <UserPlus className="h-4 w-4 text-emerald-200" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingUser ? 'Edit Akun Pengguna' : 'Tambah User Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-600 font-sans">
                    {editingUser ? 'Ubah informasi pengguna atau hak akses peran' : 'Daftarkan pengguna baru ke sistem warehouse'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 font-mono text-xs max-h-[80vh] overflow-y-auto">
              {userFormError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Username *</label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="contoh: budi_warehouse"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs lowercase"
                />
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="contoh: Budi Setiawan"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                />
              </div>

              {/* Dynamic Role Selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Pilihan Hak Akses (Role) *</label>
                <div className="space-y-1.5 font-sans max-h-48 overflow-y-auto p-1">
                  {roles.map((r) => {
                    const isSelected = userFormData.role === r.key;
                    return (
                      <label
                        key={r.key}
                        className={`p-2.5 rounded-md border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-600/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="userRole"
                            value={r.key}
                            checked={isSelected}
                            onChange={() => setUserFormData({ ...userFormData, role: r.key })}
                            className="hidden"
                          />
                          {r.key === 'admin' ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-slate-600 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-bold">{r.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal truncate max-w-[240px]">
                              {r.description || `Role ${r.key}`}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-700 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center justify-between">
                  <span>{editingUser ? 'Password Baru (Kosongkan jika tetap)' : 'Password *'}</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder={editingUser ? 'Ketik password baru...' : 'Masukkan password'}
                    className="w-full pl-2.5 pr-8 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Departemen & Unit */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Departemen</label>
                  <input
                    type="text"
                    value={userFormData.department}
                    onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                    placeholder="Warehouse"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Unit Kerja</label>
                  <input
                    type="text"
                    value={userFormData.unit}
                    onChange={(e) => setUserFormData({ ...userFormData, unit: e.target.value })}
                    placeholder="Unit 5 - Spindo"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ring-1 ring-emerald-700/50 disabled:opacity-70"
                >
                  <Check className="h-4 w-4 text-emerald-200" strokeWidth={2.5} />
                  <span>{isSubmittingUser ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT ROLE & PERMISSIONS MATRIX                          */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans">
          <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-emerald-100 p-4 bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white shadow-2xs font-bold font-mono text-xs">
                  <ShieldCheck className="h-4 w-4 text-emerald-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingRole ? `Konfigurasi Role: ${editingRole.name}` : 'Buat Role Baru & Aturan Izin'}
                  </h3>
                  <p className="text-[10px] text-slate-600 font-sans">
                    Tentukan modul yang dapat dilihat dan aksi yang diizinkan untuk peran ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveRole} className="p-5 space-y-4 font-mono text-xs max-h-[82vh] overflow-y-auto">
              {roleFormError && (
                <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>{roleFormError}</span>
                </div>
              )}

              {/* Row 1: Role Key & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Kode Role (Key) *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.isSystem}
                    value={roleFormData.key}
                    onChange={(e) => setRoleFormData({ ...roleFormData, key: e.target.value })}
                    placeholder="contoh: supervisor"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs lowercase disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nama Tampilan Role *</label>
                  <input
                    type="text"
                    required
                    value={roleFormData.name}
                    onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                    placeholder="contoh: Supervisor Gudang"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Deskripsi & Warna Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Deskripsi Peran</label>
                  <input
                    type="text"
                    value={roleFormData.description}
                    onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                    placeholder="contoh: Pengawasan operasional & input RTP"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs font-sans text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Warna Badge</label>
                  <select
                    value={roleFormData.color}
                    onChange={(e) => setRoleFormData({ ...roleFormData, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20 shadow-2xs font-sans text-xs cursor-pointer"
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Shortcut Bar */}
              <div className="flex items-center justify-between p-2 rounded-md bg-slate-100 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 font-sans">
                  Pintasan Pengaturan Matriks Izin:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(true)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-900 border border-slate-300 font-bold text-[10px] cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllPermissions(false)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-rose-50 text-rose-900 border border-slate-300 font-bold text-[10px] cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              {/* SECTION A: IZIN AKSES MODUL DASHBOARD */}
              <div className="space-y-2 pt-1 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Layers className="h-3.5 w-3.5 text-emerald-700" />
                    <span>A. Izin Akses Modul / Tampilan Dashboard</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'viewCapacity', label: 'Stock Pipa vs Kapasitas', desc: 'Melihat Utilisasi & Free Stock' },
                    { key: 'viewFastSlow', label: 'Fast vs Slow Moving', desc: 'Analisis PASM & Pergerakan Pipa' },
                    { key: 'viewCoilStrip', label: 'Coil & Strip', desc: 'Monitoring Bahan Baku Induk' },
                    { key: 'viewNC', label: 'Stock NC Quality', desc: 'Data Pipa Grade E & Mutu C' },
                    { key: 'viewUnfifo', label: 'UNFIFO Audit', desc: 'Audit Alur Pengeluaran Barang' },
                    { key: 'viewLoo', label: 'Stock Pipa vs LOO', desc: 'Pemenuhan Target Order Terbuka' },
                    { key: 'viewDamagedPkg', label: 'Data Packaging Rusak', desc: 'Temuan Kerusakan & Status Repack' },
                    { key: 'viewIncomingPkg', label: 'Audit Harian Packaging (RTP)', desc: 'Pencatatan Audit Harian & Mutasi Stock RTP' },
                    { key: 'viewUserManagement', label: 'Menu Kelola Pengguna & Roles', desc: 'Akses Tab Manajemen User/Roles' }
                  ].map((item) => {
                    const isChecked = Boolean(roleFormData.permissions[item.key as keyof RolePermissions]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleTogglePermission(item.key as keyof RolePermissions)}
                        className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                          isChecked
                            ? 'border-emerald-600 bg-emerald-50/60 text-slate-900 ring-1 ring-emerald-600/30 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-700" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs leading-tight">{item.label}</div>
                          <div className="text-[10.5px] text-slate-500">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B: IZIN UPLOAD RAW DATA SAP & PACKAGING */}
              <div className="space-y-2 pt-2 border-t border-slate-200 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Upload className="h-3.5 w-3.5 text-amber-700" />
                    <span>B. Izin Upload Raw Data SAP &amp; Packaging</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'canUploadPipe', label: 'Upload Raw Stock Pipa', desc: 'File zppshstock / MB52 export SAP' },
                    { key: 'canUploadCoil', label: 'Upload Raw Stock Coil & Strip', desc: 'File master stock bahan baku SAP' },
                    { key: 'canUploadLoo', label: 'Upload Raw Order LOO', desc: 'File open order delivery LOO SAP' },
                    { key: 'canUploadDamagedPkg', label: 'Upload Raw Packaging Rusak', desc: 'File spreadsheet temuan packaging rusak (NG)' },
                    { key: 'canUploadIncomingPkg', label: 'Upload Raw Incoming RTP', desc: 'File audit harian mutasi incoming packaging' }
                  ].map((item) => {
                    const isChecked = Boolean(roleFormData.permissions[item.key as keyof RolePermissions]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleTogglePermission(item.key as keyof RolePermissions)}
                        className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                          isChecked
                            ? 'border-amber-600 bg-amber-50/60 text-slate-900 ring-1 ring-amber-600/30 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-amber-700" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs leading-tight">{item.label}</div>
                          <div className="text-[10.5px] text-slate-500">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION C: IZIN HAK AKSI & OPERASIONAL */}
              <div className="space-y-2 pt-2 border-t border-slate-200 font-sans">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Settings className="h-3.5 w-3.5 text-sky-700" />
                    <span>C. Izin Tindakan &amp; Operasional Modifikasi</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'canEditIncomingPkg', label: 'Tambah & Edit Data RTP', desc: 'Input / ubah data mutasi packaging' },
                    { key: 'canEditDamagedPkg', label: 'Ubah Status Repack Packaging', desc: 'Update status perbaikan fisik' },
                    { key: 'canExportExcel', label: 'Export Data Spreadsheet Excel', desc: 'Download laporan ke Excel (.xlsx)' },
                    { key: 'canCustomizeLayout', label: 'Kustomisasi Layout Dashboard', desc: 'Mengatur urutan kartu & widget' },
                    { key: 'canManageUsers', label: 'Kelola Akun User & Roles', desc: 'Menambah & mengubah akses user' },
                    { key: 'canSaveSnapshot', label: 'Simpan Snapshot Database', desc: 'Menyimpan snapshot data SQLite' }
                  ].map((item) => {
                    const isChecked = Boolean(roleFormData.permissions[item.key as keyof RolePermissions]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => handleTogglePermission(item.key as keyof RolePermissions)}
                        className={`p-2.5 rounded-md border cursor-pointer flex items-start gap-2.5 transition-all select-none ${
                          isChecked
                            ? 'border-sky-600 bg-sky-50/60 text-slate-900 ring-1 ring-sky-600/30 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-sky-700" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs leading-tight">{item.label}</div>
                          <div className="text-[10.5px] text-slate-500">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 font-mono">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ring-1 ring-emerald-700/50 disabled:opacity-70"
                >
                  <Check className="h-4 w-4 text-emerald-200" strokeWidth={2.5} />
                  <span>{isSubmittingRole ? 'Menyimpan...' : editingRole ? 'Simpan Izin Role' : 'Buat Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE USER CONFIRM MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-mono text-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus User</h3>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Apakah Anda yakin ingin menghapus akun pengguna <strong>"{deleteUserTarget.username}"</strong> ({deleteUserTarget.name})?
            </p>
            {deleteError && (
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteUser}
                className="px-3 py-1.5 rounded-md bg-rose-700 text-white hover:bg-rose-800 font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Akun'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE ROLE CONFIRM MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteRoleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-mono text-xs">
          <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">Konfirmasi Hapus Role</h3>
            </div>
            <p className="text-slate-600 font-sans text-xs">
              Apakah Anda yakin ingin menghapus role <strong>"{deleteRoleTarget.name}"</strong> (key: {deleteRoleTarget.key})?
            </p>
            {deleteError && (
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                {deleteError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRoleTarget(null)}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteRole}
                className="px-3 py-1.5 rounded-md bg-rose-700 text-white hover:bg-rose-800 font-bold shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Role'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
