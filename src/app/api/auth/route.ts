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
import { authRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
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

  const ip = getClientIp(request);
  const userKey = `user:${username.toLowerCase()}`;
  const ipKey = `ip:${ip}`;

  if (authRateLimiter.isLimited(userKey) || authRateLimiter.isLimited(ipKey)) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  const user = await verifyCredentials(username, password);
  if (!user) {
    authRateLimiter.recordFailure(userKey);
    authRateLimiter.recordFailure(ipKey);
    return NextResponse.json(
      { success: false, error: 'Username atau password tidak sesuai.' },
      { status: 401 }
    );
  }

  authRateLimiter.clear(userKey);
  authRateLimiter.clear(ipKey);

  const permissions = await getRolePermissions(user.role);

  let token: string;
  let maxAge: number | undefined;
  try {
    ({ token, maxAge } = createSessionToken(user, rememberMe));
  } catch (error) {
    console.error('Gagal membuat sesi login:', error);
    return NextResponse.json(
      { success: false, error: 'Konfigurasi server login belum lengkap. Hubungi administrator.' },
      { status: 500 }
    );
  }

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
