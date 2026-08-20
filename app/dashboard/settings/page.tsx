import { AccountSettings } from "@stackframe/stack";
import { Card } from "@/components/ui/card";
import { DonationBoxesSettingsToggle } from "@/components/donation-boxes-settings-toggle";
import { getCurrentAppUser } from "@/lib/current-user";

export default async function SettingsPage() {
  const user = await getCurrentAppUser();

  return (
    <div className="space-y-6">
      <header>
        <p className="font-label-sm text-label-sm text-primary">Konto</p>
        <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
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