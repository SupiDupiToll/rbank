import { StackClientApp } from "@stackframe/stack";
import "@/lib/public-env";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    signOut: "/handler/sign-out",
    accountSettings: "/handler/account-settings",
    afterSignIn: "/auth/finish",
    afterSignOut: "/handler/sign-in"
  }
});
