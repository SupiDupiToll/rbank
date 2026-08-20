import { Card } from "@/components/ui/card";

const supportChannels = [
  {
    title: "E-Mail",
    value: "support@familybank.example",
    description: "Antwort innerhalb von 24 Stunden an Werktagen.",
  },
  {
    title: "Telefon",
    value: "+49 800 000 0000",
    description: "Mo–Fr, 9:00–18:00 Uhr.",
  },
  {
    title: "Chat",
    value: "Im Kundenbereich",
    description: "Direkt aus dem Online-Banking erreichbar.",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
          Hilfe
        </p>
        <h2 className="mt-2 text-3xl font-display text-slate-100">Support</h2>
        <p className="mt-3 max-w-lg text-sm text-slate-400">
          Wir helfen dir bei Fragen zu deinem Konto, deinen Konten, der Family
          Card und AirCoin.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {supportChannels.map((channel) => (
          <Card key={channel.title} className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/80">
              {channel.title}
            </p>
            <p className="mt-3 font-semibold text-slate-100">{channel.value}</p>
            <p className="mt-2 text-sm text-slate-400">{channel.description}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary/80">
          Sicherheit
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Family Bank fragt niemals per Telefon, E-Mail oder SMS nach deiner PIN
          oder deinem Passwort. Gib Zugangsdaten ausschliesslich im
          Online-Banking ein.
        </p>
      </Card>
    </div>
  );
}
