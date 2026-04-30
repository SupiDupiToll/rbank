import { AccountSettings } from "@stackframe/stack";
import { Card } from "@/components/ui/card";
import { DonationBoxesSettingsToggle } from "@/components/donation-boxes-settings-toggle";
import { getCurrentAppUser } from "@/lib/current-user";

export default async function SettingsPage() {
  const user = await getCurrentAppUser();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Konto
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">
          Einstellungen
        </h2>
      </header>

      <Card className="overflow-hidden p-0">
        <AccountSettings />
      </Card>

      {user ? (
        <DonationBoxesSettingsToggle
          initialEnabled={user.showDonationBoxesList}
        />
      ) : null}
    </div>
  );
}
