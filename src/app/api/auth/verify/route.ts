import { NextResponse } from 'next/server';
import {
  isAuthContext,
  rejectCrossOrigin,
  requireAuth,
  verifyCredentials,
} from '@/lib/auth-server';
import { authRateLimiter } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const auth = await requireAuth(request);
  if (!isAuthContext(auth)) return auth;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Format permintaan tidak valid.' },
      { status: 400 }
    );
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json(
      { success: false, error: 'Password wajib diisi.' },
      { status: 400 }
    );
  }

  const userKey = `user:${auth.user.username.toLowerCase()}`;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
  const ipKey = `ip:${ip}`;

  if (authRateLimiter.isLimited(userKey) || authRateLimiter.isLimited(ipKey)) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  const verified = await verifyCredentials(auth.user.username, password);
  if (!verified) {
    authRateLimiter.recordFailure(userKey);
    authRateLimiter.recordFailure(ipKey);
    return NextResponse.json(
      { success: false, error: 'Password salah.' },
      { status: 401 }
    );
  }

  authRateLimiter.clear(userKey);
  authRateLimiter.clear(ipKey);
  return NextResponse.json({ success: true });
}
