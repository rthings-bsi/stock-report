export type UserRole = string;

export interface RolePermissions {
  // Views / Tabs Access
  viewCapacity: boolean;       // Stock Pipa vs Kapasitas
  viewFastSlow: boolean;       // Fast vs Slow Moving
  viewCoilStrip: boolean;      // Coil & Strip
  viewNC: boolean;             // Stock NC
  viewUnfifo: boolean;         // UNFIFO
  viewLoo: boolean;            // Stock Pipa vs LOO
  viewDamagedPkg: boolean;     // Data Packaging Rusak
  viewIncomingPkg: boolean;    // Input & Kelola Incoming Packaging (RTP)
  viewUserManagement: boolean; // Kelola Pengguna & Roles

  // Upload Raw Data Permissions (Pecahan Upload Data Raw SAP & Packaging)
  canUploadSAP?: boolean;         // Master flag / fallback compatibility
  canUploadPipe: boolean;        // Upload Raw Stock Pipa (zppshstock)
  canUploadCoil: boolean;        // Upload Raw Stock Coil & Strip (Bahan Baku)
  canUploadLoo: boolean;         // Upload Raw Data LOO (Delivery Order)
  canUploadDamagedPkg: boolean;  // Upload Raw Packaging Rusak (RTP NG)
  canUploadIncomingPkg: boolean; // Upload Raw Mutasi & Incoming Packaging (RTP)

  // Action & Operational Permissions
  canEditIncomingPkg: boolean; // Tambah/Edit/Hapus Data RTP
  canEditDamagedPkg: boolean;  // Edit Status Repack Packaging Rusak
  canExportExcel: boolean;     // Download spreadsheet Excel
  canCustomizeLayout: boolean; // Ubah tata letak/sembunyikan card
  canManageUsers: boolean;     // Tambah/Edit/Hapus User & Role
  canSaveSnapshot: boolean;    // Simpan snapshot ke database
};
export interface CustomRole {
  id?: number;
  key: string;         // 'admin' | 'staff' | 'supervisor' | etc.
  name: string;        // 'Administrator', 'Staff Operasional', etc.
  description: string; // Deskripsi hak akses peran
  isSystem?: boolean;  // true for admin & staff to prevent deletion of master roles
  color?: string;      // Badge color identifier (emerald, sky, amber, purple, etc.)
  permissions: RolePermissions;
  created_at?: string;
  updated_at?: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: UserRole;
  department: string;
  unit: string;
  permissions?: RolePermissions;
}

export interface StoredAccount {
  id?: number;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  department: string;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_ADMIN_PERMISSIONS: RolePermissions = {
  viewCapacity: true,
  viewFastSlow: true,
  viewCoilStrip: true,
  viewNC: true,
  viewUnfifo: true,
  viewLoo: true,
  viewDamagedPkg: true,
  viewIncomingPkg: true,
  viewUserManagement: true,
  canUploadSAP: true,
  canUploadPipe: true,
  canUploadCoil: true,
  canUploadLoo: true,
  canUploadDamagedPkg: true,
  canUploadIncomingPkg: true,
  canEditIncomingPkg: true,
  canEditDamagedPkg: true,
  canExportExcel: true,
  canCustomizeLayout: true,
  canManageUsers: true,
  canSaveSnapshot: true
};

export const DEFAULT_STAFF_PERMISSIONS: RolePermissions = {
  viewCapacity: true,
  viewFastSlow: true,
  viewCoilStrip: true,
  viewNC: true,
  viewUnfifo: true,
  viewLoo: true,
  viewDamagedPkg: true,
  viewIncomingPkg: true,
  viewUserManagement: false,
  canUploadSAP: false,
  canUploadPipe: false,
  canUploadCoil: false,
  canUploadLoo: false,
  canUploadDamagedPkg: false,
  canUploadIncomingPkg: false,
  canEditIncomingPkg: true,
  canEditDamagedPkg: false,
  canExportExcel: true,
  canCustomizeLayout: false,
  canManageUsers: false,
  canSaveSnapshot: false
};

export const DEFAULT_VIEWER_PERMISSIONS: RolePermissions = {
  viewCapacity: true,
  viewFastSlow: true,
  viewCoilStrip: true,
  viewNC: true,
  viewUnfifo: true,
  viewLoo: true,
  viewDamagedPkg: true,
  viewIncomingPkg: true,
  viewUserManagement: false,
  canUploadSAP: false,
  canUploadPipe: false,
  canUploadCoil: false,
  canUploadLoo: false,
  canUploadDamagedPkg: false,
  canUploadIncomingPkg: false,
  canEditIncomingPkg: false,
  canEditDamagedPkg: false,
  canExportExcel: true,
  canCustomizeLayout: false,
  canManageUsers: false,
  canSaveSnapshot: false
};

export const PRESET_ROLES: CustomRole[] = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Hak akses tertinggi: kelola seluruh modul, upload SAP, manajemen user & roles, edit semua data.',
    isSystem: true,
    color: 'emerald',
    permissions: DEFAULT_ADMIN_PERMISSIONS
  },
  {
    key: 'staff',
    name: 'Staff Operasional',
    description: 'Akses monitoring warehouse dan pencatatan mutasi operasional RTP Incoming Packaging.',
    isSystem: true,
    color: 'sky',
    permissions: DEFAULT_STAFF_PERMISSIONS
  },
  {
    key: 'viewer',
    name: 'Viewer / Auditor',
    description: 'Akses pemantauan visual (view-only) tanpa izin modifikasi data atau upload file.',
    isSystem: false,
    color: 'slate',
    permissions: DEFAULT_VIEWER_PERMISSIONS
  }
];

export const PRESET_ACCOUNTS: StoredAccount[] = [
  {
    id: 1,
    username: 'admin',
    password: '123',
    name: 'Administrator Warehouse',
    role: 'admin',
    department: 'Warehouse Section Head',
    unit: 'Unit 5 - Spindo'
  },
  {
    id: 2,
    username: 'staff',
    password: '123',
    name: 'Staff Operasional Warehouse',
    role: 'staff',
    department: 'Warehouse Monitoring Staff',
    unit: 'Unit 5 - Spindo'
  }
];
