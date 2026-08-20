import { createHash } from "node:crypto";
import { appOrigin } from "@/lib/env";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import {
  WALLET_LINK_LABELS,
  WALLET_LINK_TARGETS,
  walletConfig,
  type WalletLinkTarget,
} from "@/lib/wallet/config";
import { maskedCardNumber } from "@/lib/wallet/card-number";
import { createWalletLinkUrl } from "@/lib/wallet/links";

export type WalletPassState = "ACTIVE" | "LOCKED" | "REVOKED";

export type WalletPassData = {
  userId: string;
  customerId: string;
  displayName: string;
  eurBalanceCents: number;
  airBalanceUnits: number;
  state: WalletPassState;
};

export function computePassContentHash(data: WalletPassData) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        name: data.displayName,
        eur: data.eurBalanceCents,
        air: data.airBalanceUnits,
        card: maskedCardNumber(data.userId),
        state: data.state,
      }),
    )
    .digest("hex");
}

export function walletStateLabel(state: WalletPassState) {
  switch (state) {
    case "ACTIVE":
      return "Aktiv";
    case "LOCKED":
      return "Gesperrt";
    case "REVOKED":
      return "Widerrufen";
  }
}

function buildField(key: string, label: string, value: string) {
  return { key, label, value };
}

function buildLinks(userId: string) {
  return WALLET_LINK_TARGETS.map((target: WalletLinkTarget) => ({
    key: `link-${target}`,
    label: WALLET_LINK_LABELS[target],
    value: createWalletLinkUrl(userId, target),
  }));
}

export function buildPassJson(
  passData: WalletPassData,
  serialNumber: string,
  authenticationToken: string,
) {
  const eurBalance = formatEuroFromCents(passData.eurBalanceCents);
  const airBalance = formatAirFromUnits(passData.airBalanceUnits);
  const cardNumber = maskedCardNumber(passData.userId);
  const statusLabel = walletStateLabel(passData.state);

  const generic: Record<string, unknown> = {
    primaryFields: [
      buildField("holder", "Karteninhaber", passData.displayName || "Family Bank Kunde"),
    ],
    secondaryFields: [
      buildField("eur", "Girokonto", eurBalance),
      buildField("air", "AirCoin", airBalance),
    ],
    auxiliaryFields: [
      buildField("card", "Karte", cardNumber),
      buildField("status", "Status", statusLabel),
    ],
    backFields: [
      buildField("org", "Family Bank", "Family Card · Digitale Bankkarte"),
      buildField("benutzer", "Benutzer", passData.displayName || "Family Bank Kunde"),
      buildField("girokonto", "Girokonto", eurBalance),
      buildField("aircoin", "AirCoin", airBalance),
      buildField("karte", "Karte", cardNumber),
      buildField("status", "Status", statusLabel),
      ...buildLinks(passData.userId),
      buildField(
        "hinweis",
        "Hinweis",
        "Die auf dieser Karte angezeigten Salden dienen ausschliesslich der Anzeige. Massgeblich ist stets der im Online-Banking hinterlegte Kontostand.",
      ),
      buildField("support", "Support", `${appOrigin}/dashboard/support`),
    ],
  };

  const pass: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier: walletConfig.passTypeIdentifier,
    serialNumber,
    teamIdentifier: walletConfig.teamIdentifier,
    webServiceURL: walletConfig.webServiceUrl,
    authenticationToken,
    organizationName: walletConfig.organizationName,
    description: walletConfig.passDescription,
    logoText: walletConfig.logoText,
    foregroundColor: "rgb(255, 255, 255)",
    backgroundColor: "rgb(10, 14, 24)",
    labelColor: "rgb(125, 211, 252)",
    generic,
  };

  if (walletConfig.featuredActionsEnabled) {
    pass.featuredActions = [
      {
        id: "transfer",
        type: "openURL",
        value: createWalletLinkUrl(passData.userId, "transfer"),
      },
      {
        id: "transactions",
        type: "openURL",
        value: createWalletLinkUrl(passData.userId, "transactions"),
      },
    ];
  }

  return pass;
}
