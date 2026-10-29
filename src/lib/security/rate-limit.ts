import "server-only";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Wspólne liczniki limitów (rozdział 6.4 i 8): Redis przy wielu instancjach,
 * w przeciwnym razie pamięć procesu.
 */
type Store = {
  incr(key: string, windowSec: number): Promise<number>;
  get(key: string): Promise<number>;
  del(key: string): Promise<void>;
  getRaw(key: string): Promise<string | null>;
  setRaw(key: string, value: string, ttlSec: number): Promise<void>;
};

const memory = new Map<string, { value: string; expiresAt: number }>();

const memoryStore: Store = {
  async incr(key, windowSec) {
    const now = Date.now();
    const e = memory.get(key);
    if (!e || e.expiresAt < now) {
      memory.set(key, { value: "1", expiresAt: now + windowSec * 1000 });
      return 1;
    }
    const v = Number(e.value) + 1;
    e.value = String(v);
    return v;
  },
  async get(key) {
    const e = memory.get(key);
    return e && e.expiresAt > Date.now() ? Number(e.value) : 0;
  },
  async del(key) {
    memory.delete(key);
  },
  async getRaw(key) {
    const e = memory.get(key);
    return e && e.expiresAt > Date.now() ? e.value : null;
  },
  async setRaw(key, value, ttlSec) {
    memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
  },
};

const globalForRedis = globalThis as unknown as { __dostepnikRedis?: Redis | null };

function redisClient(): Redis | null {
  if (!env.REDIS_URL) return null;
  if (globalForRedis.__dostepnikRedis === undefined) {
    const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
    client.on("error", (error) => logger.warn("redis.error", { error: error.message }));
    globalForRedis.__dostepnikRedis = client;
  }
  return globalForRedis.__dostepnikRedis;
}

function redisStore(r: Redis): Store {
  return {
    async incr(key, windowSec) {
      const [[, v]] = (await r.multi().incr(key).expire(key, windowSec, "NX").exec()) as [[null, number]];
      return v;
    },
    async get(key) {
      return Number((await r.get(key)) ?? 0);
    },
    async del(key) {
      await r.del(key);
    },
    async getRaw(key) {
      return r.get(key);
    },
    async setRaw(key, value, ttlSec) {
      await r.set(key, value, "EX", ttlSec);
    },
  };
}

/** Wybiera Redis, a gdy jest niedostępny — pamięć procesu (degradacja zamiast awarii logowania). */
async function withStore<T>(fn: (s: Store) => Promise<T>): Promise<T> {
  const r = redisClient();
  if (r && r.status === "ready") {
    try {
      return await fn(redisStore(r));
    } catch (error) {
      logger.warn("ratelimit.redis_fallback", { error });
    }
  }
  return fn(memoryStore);
}

export const limiter = {
  incr: (key: string, windowSec: number) => withStore((s) => s.incr(`dstp:rl:${key}`, windowSec)),
  get: (key: string) => withStore((s) => s.get(`dstp:rl:${key}`)),
  reset: (key: string) => withStore((s) => s.del(`dstp:rl:${key}`)),
  getRaw: (key: string) => withStore((s) => s.getRaw(`dstp:kv:${key}`)),
  setRaw: (key: string, value: string, ttl: number) => withStore((s) => s.setRaw(`dstp:kv:${key}`, value, ttl)),
};

/** Sprawdza limit i zwraca, czy żądanie jest dozwolone. */
export async function hit(key: string, max: number, windowSec: number): Promise<{ allowed: boolean; count: number }> {
  const c = await limiter.incr(key, windowSec);
  return { allowed: c <= max, count: c };
}

// --- Logowanie: limit na konto i adres IP, blokada czasowa, CAPTCHA -----------------

export const LOGIN_POLICY = {
  windowSec: 15 * 60,
  captchaAfter: 3,
  lockAfter: 10,
  lockSec: 15 * 60,
  ipMax: 50,
};

export async function loginState(email: string, ip: string | null) {
  const [emailFails, ipFails, locked] = await Promise.all([
    limiter.get(`login-fail:email:${email}`),
    ip ? limiter.get(`login-fail:ip:${ip}`) : Promise.resolve(0),
    limiter.getRaw(`login-lock:${email}`),
  ]);
  return {
    locked: Boolean(locked) || ipFails >= LOGIN_POLICY.ipMax,
    captchaRequired: emailFails >= LOGIN_POLICY.captchaAfter || ipFails >= LOGIN_POLICY.captchaAfter * 3,
  };
}

export async function recordLoginFailure(email: string, ip: string | null) {
  const n = await limiter.incr(`login-fail:email:${email}`, LOGIN_POLICY.windowSec);
  if (ip) await limiter.incr(`login-fail:ip:${ip}`, LOGIN_POLICY.windowSec);
  if (n >= LOGIN_POLICY.lockAfter) await limiter.setRaw(`login-lock:${email}`, "1", LOGIN_POLICY.lockSec);
  return n;
}

export async function clearLoginFailures(email: string) {
  await limiter.reset(`login-fail:email:${email}`);
}
