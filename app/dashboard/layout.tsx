import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { CustomerShell } from "@/components/customer-shell";
import { PinSetupGate } from "@/components/pin-setup-gate";
import {
  PWAInstallBanner,
  PWARegistration,
} from "@/components/pwa-install-banner";
import { env } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (user.role !== "CUSTOMER") {
    redirect("/admin");
  }

  return (
    <CustomerShell customerId={user.customerId} displayName={user.displayName}>
      <PinSetupGate hasPin={Boolean(user.pinHash)}>{children}</PinSetupGate>
      <PWAInstallBanner />
      <PWARegistration
        userId={user.id}
        vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      />
    </CustomerShell>
  );
}
