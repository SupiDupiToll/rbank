import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

type RateLimitPolicy = {
  key: string;
  limit: number;
  window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
  windowMs: number;
};

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const inMemoryStore = new Map<string, { count: number; reset: number }>();
const upstashRedis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN
      })
    : null;

const ratelimiters = new Map<string, Ratelimit>();

function getRatelimiter(policy: RateLimitPolicy) {
  if (!upstashRedis) {
    return null;
  }

  const existing = ratelimiters.get(policy.key);
  if (existing) {
    return existing;
  }

  const created = new Ratelimit({
    redis: upstashRedis,
    limiter: Ratelimit.slidingWindow(policy.limit, policy.window),
    analytics: true,
    prefix: `rbank:${policy.key}`,
    ephemeralCache: new Map()
  });
  ratelimiters.set(policy.key, created);
  return created;
}

async function checkInMemoryRateLimit(policy: RateLimitPolicy, identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `${policy.key}:${identifier}`;
  const current = inMemoryStore.get(key);

  if (!current || current.reset <= now) {
    const reset = now + policy.windowMs;
    inMemoryStore.set(key, { count: 1, reset });
    return {
      success: true,
      limit: policy.limit,
      remaining: policy.limit - 1,
      reset
    };
  }

  current.count += 1;
  inMemoryStore.set(key, current);

  return {
    success: current.count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - current.count),
    reset: current.reset
  };
}

export async function checkRateLimit(policy: RateLimitPolicy, identifier: string): Promise<RateLimitResult> {
  const ratelimiter = getRatelimiter(policy);
  if (!ratelimiter) {
    return checkInMemoryRateLimit(policy, identifier);
  }

  const result = await ratelimiter.limit(identifier);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  };
}

export function createRateLimitResponse(result: RateLimitResult) {
  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return NextResponse.json(
    { error: "Zu viele Anfragen." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}

export const rateLimitPolicies = {
  adminApi: { key: "admin-api", limit: 60, window: "1 m", windowMs: 60_000 },
  auth: { key: "auth", limit: 10, window: "15 m", windowMs: 15 * 60_000 },
  customerApi: { key: "customer-api", limit: 60, window: "1 m", windowMs: 60_000 },
  customerTransfer: { key: "customer-transfer", limit: 10, window: "1 m", windowMs: 60_000 }
} satisfies Record<string, RateLimitPolicy>;
