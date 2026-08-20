import http2 from "node:http2";
import { createPrivateKey, createSign, type KeyObject } from "node:crypto";
import { promises as fs } from "node:fs";
import { walletConfig } from "@/lib/wallet/config";

let cachedApnsKey: KeyObject | null = null;

async function getApnsKey() {
  if (cachedApnsKey) {
    return cachedApnsKey;
  }

  if (walletConfig.apns.privateKeyBase64) {
    cachedApnsKey = createPrivateKey({
      key: Buffer.from(walletConfig.apns.privateKeyBase64, "base64"),
      format: "der",
      type: "pkcs8",
    });
  } else if (walletConfig.apns.privateKeyPath) {
    const pem = await fs.readFile(walletConfig.apns.privateKeyPath, "utf8");
    cachedApnsKey = createPrivateKey(pem);
  } else {
    throw new Error("APNs-Push-Key ist nicht konfiguriert.");
  }

  return cachedApnsKey;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

async function createApnsJwt() {
  const header = base64UrlEncode(
    JSON.stringify({ alg: "ES256", kid: walletConfig.apns.keyId, typ: "JWT" }),
  );
  const now = Math.floor(Date.now() / 1000);
  const claims = base64UrlEncode(
    JSON.stringify({ iss: walletConfig.apns.teamId, iat: now }),
  );
  const signingInput = `${header}.${claims}`;
  const key = await getApnsKey();
  const signature = createSign("sha256")
    .update(signingInput)
    .sign({ key, dsaEncoding: "ieee-p1363" })
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

function apnsHost() {
  return walletConfig.apns.environment === "development"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";
}

export function isApnsConfigured() {
  return walletConfig.apns.enabled && Boolean(walletConfig.apns.bundleId);
}

export async function sendPassPushUpdate(pushToken: string) {
  if (!isApnsConfigured()) {
    console.warn(
      "APNs-Push nicht konfiguriert – Wallet-Pass-Updates werden nicht gepusht. Fuer den Live-Betrieb APPLE_APNS_* Variablen setzen.",
    );
    return false;
  }

  const token = await createApnsJwt();

  return new Promise<boolean>((resolve) => {
    const client = http2.connect(`https://${apnsHost()}:443`);
    const request = client.request({
      [http2.constants.HTTP2_HEADER_PATH]: `/3/device/${pushToken}`,
      [http2.constants.HTTP2_HEADER_METHOD]: "POST",
      "apns-topic": walletConfig.apns.bundleId,
      "apns-push-type": "passkit-update",
      authorization: `bearer ${token}`,
    });

    request.on("error", (error) => {
      client.close();
      console.error("APNs-Fehler:", error.message);
      resolve(false);
    });

    request.on("response", (headers) => {
      const rawStatus = headers[http2.constants.HTTP2_HEADER_STATUS];
      const status =
        typeof rawStatus === "string" ? Number(rawStatus) : 500;
      request.resume();
      request.on("end", () => {
        client.close();
        if (status === 200) {
          resolve(true);
        } else {
          console.error(`APNs-Antwort unerwartet: Status ${status}`);
          resolve(false);
        }
      });
    });

    request.end("{}");
  });
}
