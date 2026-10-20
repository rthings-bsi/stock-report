import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { PRESET_ROLES, RolePermissions, StoredAccount, UserSession } from '@/types/auth';

export const SESSION_COOKIE = 'spindo_session';

const SESSION_TTL_REMEMBER = 7 * 24 * 60 * 60; // 7 hari
const SESSION_TTL_SESSION = 12 * 60 * 60; // 12 jam

export interface SessionPayload {
  sub: string;
  role: string;
  name: string;
  department: string;
  unit: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: UserSession;
  permissions: RolePermissions | null;
}

let devSessionSecret: string | null = null;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diisi (minimal 32 karakter) di production.');
  }

  // Development tanpa SESSION_SECRET: pakai secret acak per proses (bukan
  // hardcoded). Sesi akan hilang saat server restart / hot reload.
  if (!devSessionSecret) {
    devSessionSecret = randomBytes(32).toString('base64url');
    console.warn(
      '[SECURITY] SESSION_SECRET belum diisi. Memakai secret acak sementara untuk development.'
    );
  }
  return devSessionSecret;
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

export function createSessionToken(
  user: UserSession,
  rememberMe: boolean
): { token: string; maxAge?: number } {
  const ttl = rememberMe ? SESSION_TTL_REMEMBER : SESSION_TTL_SESSION;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.username,
    role: user.role,
    name: user.name,
    department: user.department,
    unit: user.unit,
    iat: now,
    exp: now + ttl,
  };

  const body = toBase64Url(JSON.stringify(payload));
  const signature = toBase64Url(
    createHmac('sha256', getSessionSecret()).update(body).digest()
  );

  return {
    token: `${body}.${signature}`,
    // Tanpa Max-Age = session cookie (hilang saat browser ditutup).
    maxAge: rememberMe ? ttl : undefined,
  };
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  try {
    const expected = createHmac('sha256', getSessionSecret()).update(body).digest();
    const actual = fromBase64Url(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }

    const payload = JSON.parse(fromBase64Url(body).toString('utf8')) as SessionPayload;
    if (!payload?.sub || !payload?.role || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, maxAge?: number): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}

export function clearSessionCookie(): string {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function getSessionPayload(request: Request): SessionPayload | null {
  const token = readCookie(request, SESSION_COOKIE);
  return token ? verifySessionToken(token) : null;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  // Non-browser clients (curl, health check) tidak mengirim Origin.
  if (!origin) return true;

  const allowedHosts = new Set<string>();
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) allowedHosts.add(forwardedHost.split(',')[0].trim());
  const host = request.headers.get('host');
  if (host) allowedHosts.add(host);
  try {
    allowedHosts.add(new URL(request.url).host);
  } catch {}

  try {
    return allowedHosts.has(new URL(origin).host);
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request): NextResponse | null {
  if (isSameOrigin(request)) return null;
  return NextResponse.json(
    { success: false, error: 'Permintaan lintas-origin ditolak.' },
    { status: 403 }
  );
}

export async function getRolePermissions(roleKey: string): Promise<RolePermissions | null> {
  if (db && typeof db.prepare === 'function') {
    try {
      const row = db
        .prepare('SELECT permissions FROM roles WHERE LOWER(key) = LOWER(?)')
        .get(roleKey) as { permissions?: string } | undefined;
      if (row?.permissions) {
        return typeof row.permissions === 'string'
          ? (JSON.parse(row.permissions) as RolePermissions)
          : (row.permissions as unknown as RolePermissions);
      }
    } catch {}
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('roles')
        .select('permissions')
        .ilike('key', roleKey)
        .maybeSingle();
      if (data?.permissions) {
        return typeof data.permissions === 'string'
          ? (JSON.parse(data.permissions) as RolePermissions)
          : (data.permissions as RolePermissions);
      }
    } catch {}
  }

  const preset = PRESET_ROLES.find(
    (r) => r.key.toLowerCase() === roleKey.toLowerCase()
  );
  return preset?.permissions || null;
}

/**
 * Ambil data user terkini dari sumber data. Dipakai saat memvalidasi sesi agar
 * perubahan role / penghapusan user langsung berlaku, bukan menunggu cookie
 * kedaluwarsa.
 */
export async function getUserRecord(username: string): Promise<UserSession | null> {
  const cleanUsername = username.trim();
  if (!cleanUsername) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('username, name, role, department, unit')
        .ilike('username', cleanUsername)
        .maybeSingle();
      if (user) {
        return {
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department || 'Warehouse Staff',
          unit: user.unit || 'Unit 5 - Spindo',
        };
      }
    } catch (err) {
      console.warn('Supabase session user lookup error:', err);
    }
  }

  if (db && typeof db.prepare === 'function') {
    try {
      const user = db
        .prepare(
          'SELECT username, name, role, department, unit FROM users WHERE LOWER(username) = LOWER(?)'
        )
        .get(cleanUsername) as any;
      if (user) {
        return {
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department || 'Warehouse Staff',
          unit: user.unit || 'Unit 5 - Spindo',
        };
      }
    } catch (err) {
      console.warn('SQLite session user lookup error:', err);
    }
  }

  const users = readUsersFromJson();
  const user = users.find(
    (u) => u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
  );
  if (!user) return null;

  return {
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department || 'Warehouse Staff',
    unit: user.unit || 'Unit 5 - Spindo',
  };
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const payload = getSessionPayload(request);
  if (!payload) return null;

  // Token hanya membuktikan identitas. Role & data user diambil ulang dari
  // database agar perubahan role / user yang dihapus langsung berlaku.
  const currentUser = await getUserRecord(payload.sub);
  if (!currentUser) return null;

  const permissions = await getRolePermissions(currentUser.role);
  return {
    user: {
      ...currentUser,
      permissions: permissions || undefined,
    },
    permissions,
  };
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Sesi login tidak valid atau sudah kedaluwarsa.' },
    { status: 401 }
  );
}

export async function requireAuth(
  request: Request
): Promise<AuthContext | NextResponse> {
  const ctx = await getAuthContext(request);
  return ctx || unauthorized();
}

export function isAuthContext(value: AuthContext | NextResponse): value is AuthContext {
  return Boolean(value && (value as AuthContext).user);
}

export function hasPermission(ctx: AuthContext, permission: keyof RolePermissions): boolean {
  if (ctx.user.role === 'admin') return true;
  return Boolean(ctx.permissions?.[permission]);
}

export async function requirePermission(
  request: Request,
  permission: keyof RolePermissions
): Promise<AuthContext | NextResponse> {
  const result = await requireAuth(request);
  if (!isAuthContext(result)) return result;

  if (!hasPermission(result, permission)) {
    return NextResponse.json(
      { success: false, error: 'Akses ditolak untuk peran Anda.' },
      { status: 403 }
    );
  }
  return result;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 12);
}

export function verifyPassword(plain: string, stored: string): boolean {
  if (!plain || !stored) return false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
    try {
      return bcrypt.compareSync(plain, stored);
    } catch {
      return false;
    }
  }
  return plain === stored;
}

function getUsersFilePath(): string {
  return path.join(process.cwd(), 'data', 'users.json');
}

function readUsersFromJson(): StoredAccount[] {
  try {
    const filePath = getUsersFilePath();
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsersToJson(users: StoredAccount[]) {
  try {
    const filePath = getUsersFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Gagal menyimpan users.json:', err);
  }
}

/**
 * Verifikasi kredensial pada satu sumber data utama saja.
 * Penting: jika user ditemukan di suatu sumber, hasil verifikasi sumber itu
 * bersifat final — tidak boleh fallback ke sumber lain (mencegah login pintas).
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<UserSession | null> {
  const cleanUsername = username.trim();
  if (!cleanUsername || !password) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, username, password, name, role, department, unit')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (user) {
        if (!verifyPassword(password, user.password)) return null;

        if (!String(user.password).startsWith('$2')) {
          await supabase
            .from('users')
            .update({ password: hashPassword(password) })
            .eq('id', user.id);
        }

        return {
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department || 'Warehouse Staff',
          unit: user.unit || 'Unit 5 - Spindo',
        };
      }
    } catch (err) {
      console.warn('Supabase auth error:', err);
    }
  }

  if (db && typeof db.prepare === 'function') {
    try {
      const user = db
        .prepare(
          'SELECT id, username, password, name, role, department, unit FROM users WHERE LOWER(username) = LOWER(?)'
        )
        .get(cleanUsername) as any;

      if (user) {
        if (!verifyPassword(password, user.password)) return null;

        if (!String(user.password).startsWith('$2')) {
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(
            hashPassword(password),
            user.id
          );
        }

        return {
          username: user.username,
          name: user.name,
          role: user.role,
          department: user.department || 'Warehouse Staff',
          unit: user.unit || 'Unit 5 - Spindo',
        };
      }
    } catch (err) {
      console.warn('SQLite auth error:', err);
    }
  }

  const users = readUsersFromJson();
  const user = users.find(
    (u) => u.username.trim().toLowerCase() === cleanUsername.toLowerCase()
  );
  if (!user) return null;
  if (!verifyPassword(password, user.password || '')) return null;

  if (user.password && !user.password.startsWith('$2')) {
    user.password = hashPassword(password);
    writeUsersToJson(users);
  }

  return {
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department || 'Warehouse Staff',
    unit: user.unit || 'Unit 5 - Spindo',
  };
}
