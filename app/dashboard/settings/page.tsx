import { AccountSettings } from "@stackframe/stack";
import { Card } from "@/components/ui/card";

export default function SettingsPage() {
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
    </div>
  );
}
