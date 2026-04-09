import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE_NAME } from "@/lib/csrf";
import { checkRateLimit, rateLimitPolicies } from "@/lib/rate-limit";

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/handler/sign-in") {
    const rateLimit = await checkRateLimit(rateLimitPolicies.auth, getRequestIp(request));
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000)))
          }
        }
      );
    }
  }

  const response = NextResponse.next();

  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: crypto.randomUUID(),
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
