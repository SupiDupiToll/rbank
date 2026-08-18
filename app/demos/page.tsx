import { DemoShell } from "@/components/demos/demo-shell";

export const metadata = {
  title: "RBank Demo – Alle Ansichten",
  description:
    "Interaktive Demo-Vorschau aller RBank-Ansichten mit Dummy-Daten – ohne echte Buchungen.",
};

type DemosPageProps = {
  searchParams: Promise<{ view?: string; embed?: string }>;
};

export default async function DemosPage({ searchParams }: DemosPageProps) {
  const params = await searchParams;
  return (
    <DemoShell
      initialView={params.view}
      embed={params.embed === "1"}
    />
  );
}
