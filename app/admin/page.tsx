import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { getCurrentAppUser } from "@/lib/current-user";
import { PWAInstallBanner } from "@/components/pwa-install-banner";

export default async function AdminPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const data = await getAdminDashboardData();

  return (
    <>
      <AdminPanel
        initialAirInCirculation={data.airInCirculation}
        initialAirTransactions={data.airTransactions}
        initialFestgeldAccounts={data.festgeldAccounts}
        initialMerchants={data.merchants}
        initialSelectedCustomerId={data.users[0]?.customerId ?? ""}
        initialTransactions={data.initialTransactions}
        initialUsers={data.users}
        initialLoanProducts={data.loanProducts}
        initialPendingLoans={data.pendingLoans}
        initialActiveLoans={data.activeLoans}
        initialCompletedLoans={data.completedLoans}
      />
      <PWAInstallBanner />
    </>
  );
}
