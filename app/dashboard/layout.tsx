import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";
import { CustomerShell } from "@/components/customer-shell";
import { PinSetupGate } from "@/components/pin-setup-gate";
import { PWAInstallBanner } from "@/components/pwa-install-banner";

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
    <CustomerShell
      customerId={user.customerId}
      displayName={user.displayName}
      showDonationBoxesList={user.showDonationBoxesList}
    >
      <PinSetupGate hasPin={Boolean(user.paymentPinHash)}>{children}</PinSetupGate>
      <PWAInstallBanner />
    </CustomerShell>
  );
}
