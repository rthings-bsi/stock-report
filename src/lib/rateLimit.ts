/**
 * Bounded In-Memory Rate Limiter
 *
 * Mencegah Memory Exhaustion (DoS) dengan membatasi jumlah entri maksimal (maxEntries),
 * melakukan pembersihan periodik (pruning) terhadap entri kedaluwarsa,
 * dan mendukung pelacakan berbasis akun (username) serta IP.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class BoundedRateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private readonly maxEntries: number;
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(opts?: { maxEntries?: number; windowMs?: number; maxAttempts?: number }) {
    this.maxEntries = opts?.maxEntries ?? 3000;
    this.windowMs = opts?.windowMs ?? 15 * 60 * 1000; // 15 menit
    this.maxAttempts = opts?.maxAttempts ?? 8;
  }

  private prune() {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.resetAt) {
        this.map.delete(key);
      }
    }
    // Jika masih melebihi batas, hapus entri tertua (FIFO eviction)
    if (this.map.size > this.maxEntries) {
      const excess = this.map.size - this.maxEntries;
      const keys = this.map.keys();
      for (let i = 0; i < excess; i++) {
        const next = keys.next();
        if (next.done) break;
        this.map.delete(next.value);
      }
    }
  }

  isLimited(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) {
      this.map.delete(key);
      return false;
    }
    return entry.count >= this.maxAttempts;
  }

  recordFailure(key: string): void {
    const now = Date.now();
    if (this.map.size >= this.maxEntries) {
      this.prune();
    }
    const entry = this.map.get(key);
    if (!entry || now > entry.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    entry.count += 1;
  }

  clear(key: string): void {
    this.map.delete(key);
  }
}

export const authRateLimiter = new BoundedRateLimiter({
  maxEntries: 3000,
  windowMs: 15 * 60 * 1000,
  maxAttempts: 8,
});
