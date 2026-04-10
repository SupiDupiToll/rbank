import type { Route } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { AUTH_REDIRECT_COOKIE_NAME, normalizeAuthRedirect } from "@/lib/auth-redirect";

export default async function AuthFinishPage() {
  const user = await getCurrentAppUser();
  const cookieStore = await cookies();
  const requestedRedirect = normalizeAuthRedirect(cookieStore.get(AUTH_REDIRECT_COOKIE_NAME)?.value);

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect((requestedRedirect ?? "/dashboard") as Route);
}
