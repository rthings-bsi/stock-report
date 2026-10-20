import { NextResponse } from 'next/server';
import {
  isAuthContext,
  rejectCrossOrigin,
  requireAuth,
  verifyCredentials,
} from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

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

  const key = `${auth.user.username.toLowerCase()}:${request.headers.get('x-forwarded-for') || 'local'}`;
  if (isRateLimited(key)) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
      { status: 429 }
    );
  }

  const verified = await verifyCredentials(auth.user.username, password);
  if (!verified) {
    const entry = attempts.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    } else {
      entry.count += 1;
    }
    return NextResponse.json(
      { success: false, error: 'Password salah.' },
      { status: 401 }
    );
  }

  attempts.delete(key);
  return NextResponse.json({ success: true });
}
