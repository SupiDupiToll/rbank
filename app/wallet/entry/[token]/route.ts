import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/current-user";
import { AUTH_REDIRECT_COOKIE_NAME } from "@/lib/auth-redirect";
import { verifyWalletLinkToken } from "@/lib/wallet/links";

const REDIRECT_COOKIE = {
  name: AUTH_REDIRECT_COOKIE_NAME,
  path: "/",
  maxAge: 60 * 10,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const verified = verifyWalletLinkToken(token);

  if (!verified) {
    const response = NextResponse.redirect(new URL("/dashboard", _request.url));
    return response;
  }

  const user = await getCurrentAppUser();

  if (user && user.id === verified.userId) {
    return NextResponse.redirect(new URL(verified.path, _request.url));
  }

  const response = NextResponse.redirect(
    new URL("/handler/sign-in", _request.url),
  );
  response.cookies.set(REDIRECT_COOKIE.name, verified.path, REDIRECT_COOKIE);
  return response;
}
