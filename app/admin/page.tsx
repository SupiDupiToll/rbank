import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { getCurrentAppUser } from "@/lib/current-user";

export default async function AdminPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminPanel />;
}
