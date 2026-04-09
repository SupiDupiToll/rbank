import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/current-user";

export default async function AuthFinishPage() {
  const user = await getCurrentAppUser();

  if (!user) {
    return redirect("/handler/sign-in");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/dashboard");
}
