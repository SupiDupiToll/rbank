import { z } from "zod";
import { NextResponse } from "next/server";
import { appOrigin } from "@/lib/env";
import { getCurrentAppUser } from "@/lib/current-user";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";
import { rateLimitPolicies } from "@/lib/rate-limit";

type RateLimitPolicy = (typeof rateLimitPolicies)[keyof typeof rateLimitPolicies];

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return null;
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function requireAuth() {
  return getCurrentAppUser();
}

export async function requireAdmin() {
  const user = await requireAuth();

  if (!user) {
    return {
      error: jsonError("Nicht authentifiziert.", 401),
      user: null
    };
  }

  if (user.role !== "ADMIN") {
    return {
      error: jsonError("Zugriff verweigert.", 403),
      user: null
    };
  }

  return { error: null, user };
}

export async function requireCustomer() {
  const user = await requireAuth();

  if (!user) {
    return {
      error: jsonError("Nicht authentifiziert.", 401),
      user: null
    };
  }

  if (user.role !== "CUSTOMER") {
    return {
      error: jsonError("Zugriff verweigert.", 403),
      user: null
    };
  }

  return { error: null, user };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }

  return schema.parse(rawBody);
}

export function parseInput<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): z.infer<TSchema> {
  return schema.parse(input);
}

export async function enforceRateLimit(_request: Request, policy: RateLimitPolicy, identifier: string) {
  const result = await checkRateLimit(policy, identifier);
  if (!result.success) {
    return createRateLimitResponse(result);
  }

  return null;
}

export function enforceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin || origin !== appOrigin) {
    return jsonError("Ungueltige Anfrage.", 403);
  }

  return null;
}

export function enforceCsrf(request: Request) {
  const cookieToken = getCookieValue(request, CSRF_COOKIE_NAME);
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return jsonError("Ungueltige Anfrage.", 403);
  }

  return null;
}

export function isMutatingMethod(method: string) {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export async function safeRoute(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError("Ungueltige Eingabedaten.", 400);
    }

    if (error instanceof z.ZodError) {
      return jsonError("Ungueltige Eingabedaten.", 400);
    }

    console.error("Unhandled API error", error);
    return jsonError("Interner Serverfehler.", 500);
  }
}
