import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import forge from "node-forge";
import { walletConfig } from "@/lib/wallet/config";
import { buildZip } from "@/lib/wallet/zip";

export function isPassSigningConfigured() {
  return Boolean(
    walletConfig.passCertPath &&
      walletConfig.passCertPassword !== undefined &&
      walletConfig.wwdrCertPath,
  );
}

function createManifest(files: Array<{ name: string; data: Buffer }>) {
  const hashes: Record<string, string> = {};
  for (const file of files) {
    hashes[file.name] = createHash("sha1").update(file.data).digest("hex");
  }
  return JSON.stringify(hashes);
}

async function loadPem(path: string) {
  return fs.readFile(path, "utf8");
}

function parsePrivateKey(pem: string, password: string | undefined) {
  if (password) {
    const decrypted = forge.pki.decryptRsaPrivateKey(pem, password);
    if (decrypted) {
      return decrypted;
    }
  }

  return forge.pki.privateKeyFromPem(pem);
}

async function signManifest(manifestJson: string) {
  const keyPath =
    walletConfig.passKeyPath ??
    (walletConfig.passCertPath
      ? walletConfig.passCertPath.replace(/\.crt$/i, ".key")
      : "");

  if (!keyPath) {
    throw new Error("APPLE_WALLET_PASS_KEY_PATH fehlt.");
  }

  const [certPem, keyPem, wwdrPem] = await Promise.all([
    loadPem(walletConfig.passCertPath!),
    loadPem(keyPath),
    loadPem(walletConfig.wwdrCertPath!),
  ]);

  const certificate = forge.pki.certificateFromPem(certPem);
  const privateKey = parsePrivateKey(
    keyPem,
    walletConfig.passCertPassword ?? "",
  );

  const wwdrCertificate = forge.pki.certificateFromPem(wwdrPem);

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifestJson);
  p7.addCertificate(certificate);
  p7.addCertificate(wwdrCertificate);
  p7.addSigner({
    key: privateKey,
    certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary");
}

export async function buildPkpass(
  passJson: unknown,
  images: Array<{ name: string; data: Buffer }>,
) {
  const files = [
    { name: "pass.json", data: Buffer.from(JSON.stringify(passJson)) },
    ...images,
  ];

  const manifestJson = createManifest(files);
  const manifestFile = { name: "manifest.json", data: Buffer.from(manifestJson) };

  const zipFiles: Array<{ name: string; data: Buffer }> = [
    ...files,
    manifestFile,
  ];

  if (isPassSigningConfigured()) {
    const signature = await signManifest(manifestJson);
    zipFiles.push({ name: "signature", data: signature });
    return { buffer: buildZip(zipFiles), unsigned: false };
  }

  console.warn(
    "Apple Wallet: Keine Pass-Zertifikate konfiguriert – .pkpass wird UNSIGNIERT erzeugt (nur fuer Entwicklung).",
  );
  return { buffer: buildZip(zipFiles), unsigned: true };
}
