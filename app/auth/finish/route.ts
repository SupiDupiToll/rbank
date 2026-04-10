import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { AUTH_REDIRECT_COOKIE_NAME, normalizeAuthRedirect } from "@/lib/auth-redirect";

export async function GET(request: Request) {
  const user = await getCurrentAppUser();
  const cookieStore = await cookies();
  const requestedRedirect = normalizeAuthRedirect(cookieStore.get(AUTH_REDIRECT_COOKIE_NAME)?.value);

  const targetPath = !user ? "/handler/sign-in" : user.role === "ADMIN" ? "/admin" : requestedRedirect ?? "/dashboard";
  const response = NextResponse.redirect(new URL(targetPath, request.url));

  response.cookies.set(AUTH_REDIRECT_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax"
  });

  return response;
}
