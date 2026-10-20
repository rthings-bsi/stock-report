import { NextResponse } from 'next/server';
import {
  clearSessionCookie,
  createSessionToken,
  getRolePermissions,
  isAuthContext,
  rejectCrossOrigin,
  requireAuth,
  sessionCookie,
  verifyCredentials,
} from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request, username: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  return `${ip}:${username.trim().toLowerCase()}`;
}

function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function clearFailures(key: string) {
  attempts.delete(key);
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const rememberMe = Boolean(body?.rememberMe);

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'Username dan password wajib diisi.' },
      { status: 400 }
    );
  }
  if (username.length > 100 || password.length > 256) {
    return NextResponse.json(
      { success: false, error: 'Username atau password tidak valid.' },
      { status: 400 }
    );
  }

  const key = clientKey(request, username);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    recordFailure(key);
    return NextResponse.json(
      { success: false, error: 'Username atau password tidak sesuai.' },
      { status: 401 }
    );
  }

  clearFailures(key);

  const permissions = await getRolePermissions(user.role);
  const { token, maxAge } = createSessionToken(user, rememberMe);

  const response = NextResponse.json({
    success: true,
    user: { ...user, permissions: permissions || {} },
  });
  response.headers.append('Set-Cookie', sessionCookie(token, maxAge));
  return response;
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  return NextResponse.json({ success: true, user: auth.user });
}

export async function DELETE(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', clearSessionCookie());
  return response;
}
