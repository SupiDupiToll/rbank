import { appOrigin } from "@/lib/env";

export type WalletLinkTarget =
  | "transfer"
  | "transactions"
  | "loans"
  | "account"
  | "aircoin"
  | "card"
  | "profile"
  | "support";

export const WALLET_LINK_TARGETS: WalletLinkTarget[] = [
  "transfer",
  "transactions",
  "loans",
  "account",
  "aircoin",
  "card",
  "profile",
  "support",
];

const TARGET_PATHS: Record<WalletLinkTarget, string> = {
  transfer: "/dashboard/transfer",
  transactions: "/dashboard/transactions",
  loans: "/dashboard/kredite",
  account: "/dashboard",
  aircoin: "/dashboard",
  card: "/dashboard#family-card",
  profile: "/dashboard/settings",
  support: "/dashboard/support",
};

export const WALLET_LINK_LABELS: Record<WalletLinkTarget, string> = {
  transfer: "Überweisen",
  transactions: "Transaktionen",
  loans: "Kredite",
  account: "Girokonto",
  aircoin: "AirCoin",
  card: "Karte",
  profile: "Profil",
  support: "Support",
};

export function walletLinkTargetPath(target: WalletLinkTarget): string {
  return TARGET_PATHS[target];
}

function readSecret(name: string, value: string | undefined) {
  if (!value || value.length < 32) {
    throw new Error(
      `${name} muss gesetzt sein und mindestens 32 Zeichen lang sein.`,
    );
  }
  return value;
}

export const walletConfig = {
  passTypeIdentifier:
    process.env.APPLE_WALLET_PASS_TYPE_IDENTIFIER ?? "pass.com.rbank.familycard",
  teamIdentifier: process.env.APPLE_WALLET_TEAM_IDENTIFIER ?? "",
  organizationName: process.env.APPLE_WALLET_ORGANIZATION_NAME ?? "Family Bank",
  passDescription:
    process.env.APPLE_WALLET_PASS_DESCRIPTION ?? "Family Bank · Family Card",
  logoText: process.env.APPLE_WALLET_LOGO_TEXT ?? "Family Bank",
  linkSecret: process.env.APPLE_WALLET_LINK_SECRET,
  cardSecret: process.env.APPLE_WALLET_CARD_SECRET,
  passCertPath: process.env.APPLE_WALLET_PASS_CERT_PATH,
  passKeyPath: process.env.APPLE_WALLET_PASS_KEY_PATH,
  passCertPassword: process.env.APPLE_WALLET_PASS_CERT_PASSWORD,
  wwdrCertPath: process.env.APPLE_WALLET_WWDR_CERT_PATH,
  featuredActionsEnabled:
    process.env.APPLE_WALLET_FEATURED_ACTIONS === "1" ||
    process.env.APPLE_WALLET_FEATURED_ACTIONS === "true",
  apns: {
    enabled: Boolean(
      process.env.APPLE_APNS_TEAM_ID &&
        process.env.APPLE_APNS_KEY_ID &&
        (process.env.APPLE_APNS_PRIVATE_KEY ||
          process.env.APPLE_APNS_PRIVATE_KEY_PATH),
    ),
    teamId: process.env.APPLE_APNS_TEAM_ID ?? "",
    keyId: process.env.APPLE_APNS_KEY_ID ?? "",
    privateKeyBase64: process.env.APPLE_APNS_PRIVATE_KEY,
    privateKeyPath: process.env.APPLE_APNS_PRIVATE_KEY_PATH,
    bundleId:
      process.env.APPLE_APNS_BUNDLE_ID ?? process.env.APPLE_WALLET_BUNDLE_ID,
    environment: process.env.APPLE_APNS_ENVIRONMENT === "development"
      ? "development"
      : "production",
  },
  appUrl: appOrigin,
  webServiceUrl: `${appOrigin}/api/wallet/apple/webservice/`,
};

export function requireLinkSecret() {
  return readSecret("APPLE_WALLET_LINK_SECRET", walletConfig.linkSecret);
}

export function requireCardSecret() {
  return readSecret("APPLE_WALLET_CARD_SECRET", walletConfig.cardSecret);
}
