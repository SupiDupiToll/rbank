import { StackServerApp } from "@stackframe/stack";
import "@/lib/env";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    signOut: "/handler/sign-out",
    accountSettings: "/dashboard/settings",
    afterSignIn: "/auth/finish",
    afterSignOut: "/handler/sign-in",
  },
});
