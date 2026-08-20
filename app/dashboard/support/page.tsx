import { Card } from "@/components/ui/card";

const supportChannels = [
  {
    title: "E-Mail",
    value: "support@sdtoll.de",
    description: "Antwort innerhalb von 24 Stunden an Werktagen.",
    icon: "mail",
  },
  {
    title: "Telefon",
    value: "+49 800 000 0000",
    description: "Mo–Fr, 9:00–18:00 Uhr.",
    icon: "call",
  },
  {
    title: "Chat",
    value: "Im Kundenbereich",
    description: "Direkt aus dem Online-Banking erreichbar.",
    icon: "forum",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-8 pb-8">
      <header>
        <p className="font-label-sm text-label-sm text-primary">Hilfe</p>
        <h2 className="font-headline-md text-headline-md mt-2 text-on-surface">
          Support
        </h2>
        <p className="mt-3 max-w-lg text-sm text-on-surface-variant">
          Wir helfen dir bei Fragen zu deinem Konto, deinen Konten, der Family
          Card und AirCoin.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {supportChannels.map((channel) => (
          <Card key={channel.title} className="glass-card mesh-gradient p-5">
            <div className="glass-card flex h-10 w-10 items-center justify-center rounded-full">
              <span className="material-symbols-outlined text-primary">
                {channel.icon}
              </span>
            </div>
            <p className="font-label-sm text-label-sm mt-4 text-on-surface-variant">
              {channel.title}
            </p>
            <p className="mt-2 font-semibold text-on-surface">
              {channel.value}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {channel.description}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="font-label-sm text-label-sm text-primary">Sicherheit</p>
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
          RBank fragt niemals per Telefon, E-Mail oder SMS nach deiner PIN oder
          deinem Passwort. Gib Zugangsdaten ausschliesslich im Online-Banking
          ein.
        </p>
      </Card>
    </div>
  );
}
