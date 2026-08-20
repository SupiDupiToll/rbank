import { createHash, createHmac, randomBytes } from "node:crypto";
import { WalletPassStatus, type TransactionCurrency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getBalancesByCurrency } from "@/lib/banking";
import { maskedCardNumber } from "@/lib/wallet/card-number";
import {
  buildPassJson,
  computePassContentHash,
  type WalletPassData,
  type WalletPassState,
} from "@/lib/wallet/pass";
import { buildPkpass } from "@/lib/wallet/sign";
import { iconPng, logoPng } from "@/lib/wallet/images";
import { sendPassPushUpdate } from "@/lib/wallet/apns";
import { requireCardSecret, walletConfig } from "@/lib/wallet/config";

export type WalletPassStatusSummary =
  | "ACTIVE"
  | "LOCKED"
  | "REVOKED"
  | "NONE";

function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function deriveAuthToken(userId: string) {
  return createHmac("sha256", requireCardSecret())
    .update(`wallet-auth:${userId}`)
    .digest("hex");
}

function resolvePassState(
  passStatus: WalletPassStatus,
  userBlocked: boolean,
): WalletPassState {
  if (passStatus === "REVOKED") {
    return "REVOKED";
  }
  if (passStatus === "LOCKED" || userBlocked) {
    return "LOCKED";
  }
  return "ACTIVE";
}

export async function getWalletPassStatusForUser(
  userId: string,
): Promise<WalletPassStatusSummary> {
  const [pass, user] = await Promise.all([
    prisma.walletPass.findUnique({ where: { userId }, select: { status: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } }),
  ]);

  if (!pass) {
    return "NONE";
  }
  if (pass.status === "REVOKED") {
    return "REVOKED";
  }
  if (pass.status === "LOCKED" || user?.isBlocked) {
    return "LOCKED";
  }
  return "ACTIVE";
}

export async function getWalletPassRecord(userId: string) {
  return prisma.walletPass.findUnique({
    where: { userId },
    select: {
      serialNumber: true,
      passTypeIdentifier: true,
      cardLastFour: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      revokedAt: true,
      lastPushUpdate: true,
    },
  });
}

async function collectPassData(userId: string): Promise<WalletPassData> {
  const [user, pass, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        customerId: true,
        displayName: true,
        isBlocked: true,
      },
    }),
    prisma.walletPass.findUnique({
      where: { userId },
      select: { status: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      select: { type: true, amount: true, currency: true },
    }),
  ]);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const { eurBalanceCents, airBalance } = getBalancesByCurrency(
    transactions as Array<{
      type: "INCOMING" | "OUTGOING";
      amount: number;
      currency?: TransactionCurrency;
    }>,
  );

  return {
    userId,
    customerId: user.customerId,
    displayName: user.displayName ?? "Family Bank Kunde",
    eurBalanceCents,
    airBalanceUnits: airBalance,
    state: pass ? resolvePassState(pass.status, user.isBlocked) : "ACTIVE",
  };
}

export async function createWalletPassForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { customerId: true, role: true },
  });

  if (!user || user.role !== "CUSTOMER") {
    throw new Error("USER_NOT_FOUND");
  }

  const existing = await prisma.walletPass.findUnique({
    where: { userId },
    select: { status: true },
  });

  if (existing?.status === "REVOKED") {
    await prisma.walletPass.delete({ where: { userId } });
  }

  const serialNumber = `FMC-${randomBytes(12).toString("hex").toUpperCase()}`;
  const cardLastFour = maskedCardNumber(userId);

  await prisma.walletPass.upsert({
    where: { userId },
    create: {
      userId,
      accountId: user.customerId,
      serialNumber,
      passTypeIdentifier: walletConfig.passTypeIdentifier,
      authenticationTokenHash: hashAuthToken(deriveAuthToken(userId)),
      cardLastFour,
    },
    update: {
      passTypeIdentifier: walletConfig.passTypeIdentifier,
      authenticationTokenHash: hashAuthToken(deriveAuthToken(userId)),
      cardLastFour,
      status: "ACTIVE",
      revokedAt: null,
      contentHash: null,
    },
  });

  return deriveAuthToken(userId);
}

export async function buildWalletPassForUser(userId: string) {
  const pass = await prisma.walletPass.findUnique({
    where: { userId },
    select: { serialNumber: true, status: true },
  });

  if (!pass) {
    throw new Error("WALLET_PASS_NOT_FOUND");
  }

  if (pass.status === "REVOKED") {
    throw new Error("WALLET_PASS_REVOKED");
  }

  const data = await collectPassData(userId);
  const passJson = buildPassJson(data, pass.serialNumber, deriveAuthToken(userId));

  const images = [
    { name: "icon.png", data: await iconPng() },
    { name: "icon@2x.png", data: await iconPng() },
    { name: "icon@3x.png", data: await iconPng() },
    { name: "logo.png", data: await logoPng() },
    { name: "logo@2x.png", data: await logoPng() },
  ];

  return buildPkpass(passJson, images);
}

export async function refreshWalletPassForUser(userId: string, force = false) {
  const pass = await prisma.walletPass.findUnique({
    where: { userId },
    include: {
      registrations: {
        include: { device: true },
      },
    },
  });

  if (!pass || pass.status === "REVOKED") {
    return 0;
  }

  const data = await collectPassData(userId);
  const contentHash = computePassContentHash(data);

  if (!force && pass.contentHash === contentHash) {
    return 0;
  }

  await prisma.walletPass.update({
    where: { userId },
    data: { contentHash, lastPushUpdate: new Date() },
  });

  const pushTokens = [
    ...new Set(
      pass.registrations
        .map((registration) => registration.device.pushToken)
        .filter((token): token is string => Boolean(token)),
    ),
  ];

  if (pushTokens.length === 0) {
    return 0;
  }

  const results = await Promise.allSettled(
    pushTokens.map((token) => sendPassPushUpdate(token)),
  );
  return results.filter((result) => result.status === "fulfilled" && result.value)
    .length;
}

export async function revokeWalletPassForUser(userId: string) {
  const pass = await prisma.walletPass.findUnique({
    where: { userId },
    include: {
      registrations: {
        include: { device: true },
      },
    },
  });

  if (!pass) {
    return;
  }

  const updated = await prisma.walletPass.update({
    where: { userId },
    data: { status: "REVOKED", revokedAt: new Date(), contentHash: null },
  });

  const pushTokens = [
    ...new Set(
      pass.registrations
        .map((registration) => registration.device.pushToken)
        .filter((token): token is string => Boolean(token)),
    ),
  ];

  await Promise.allSettled(pushTokens.map((token) => sendPassPushUpdate(token)));

  return updated;
}

// --- Apple Wallet Webservice helpers ---------------------------------------

export async function verifyPassAuthentication(
  serialNumber: string,
  passTypeIdentifier: string,
  suppliedAuthToken: string,
) {
  const pass = await prisma.walletPass.findUnique({
    where: { serialNumber },
    select: {
      authenticationTokenHash: true,
      passTypeIdentifier: true,
      status: true,
    },
  });

  if (
    !pass ||
    pass.passTypeIdentifier !== passTypeIdentifier ||
    pass.status === "REVOKED"
  ) {
    return null;
  }

  if (hashAuthToken(suppliedAuthToken) !== pass.authenticationTokenHash) {
    return null;
  }

  return pass;
}

export async function registerDeviceForPass(input: {
  serialNumber: string;
  passTypeIdentifier: string;
  deviceLibraryIdentifier: string;
  pushToken: string;
  authenticationToken: string;
}) {
  const pass = await verifyPassAuthentication(
    input.serialNumber,
    input.passTypeIdentifier,
    input.authenticationToken,
  );

  if (!pass) {
    return null;
  }

  const passRecord = await prisma.walletPass.findUnique({
    where: { serialNumber: input.serialNumber },
    select: { id: true },
  });
  if (!passRecord) {
    return null;
  }

  const device = await prisma.walletDevice.upsert({
    where: { deviceLibraryIdentifier: input.deviceLibraryIdentifier },
    create: {
      deviceLibraryIdentifier: input.deviceLibraryIdentifier,
      pushToken: input.pushToken,
    },
    update: { pushToken: input.pushToken },
  });

  const existing = await prisma.walletRegistration.findUnique({
    where: {
      passId_deviceId: {
        passId: passRecord.id,
        deviceId: device.id,
      },
    },
  });

  if (!existing) {
    await prisma.walletRegistration.create({
      data: {
        passId: passRecord.id,
        deviceId: device.id,
      },
    });
    return true;
  }

  return false;
}

export async function unregisterDeviceFromPass(input: {
  serialNumber: string;
  passTypeIdentifier: string;
  deviceLibraryIdentifier: string;
  authenticationToken: string;
}) {
  const pass = await verifyPassAuthentication(
    input.serialNumber,
    input.passTypeIdentifier,
    input.authenticationToken,
  );

  if (!pass) {
    return false;
  }

  const [passRecord, device] = await Promise.all([
    prisma.walletPass.findUnique({
      where: { serialNumber: input.serialNumber },
      select: { id: true },
    }),
    prisma.walletDevice.findUnique({
      where: {
        deviceLibraryIdentifier: input.deviceLibraryIdentifier,
      },
      select: { id: true },
    }),
  ]);

  if (!passRecord || !device) {
    return true;
  }

  await prisma.walletRegistration.deleteMany({
    where: { passId: passRecord.id, deviceId: device.id },
  });

  const remaining = await prisma.walletRegistration.count({
    where: { deviceId: device.id },
  });
  if (remaining === 0) {
    await prisma.walletDevice.delete({ where: { id: device.id } });
  }

  return true;
}

export async function getUpdatedSerialNumbers(input: {
  passTypeIdentifier: string;
  deviceLibraryIdentifier: string;
  passesUpdatedSince?: string;
}) {
  const device = await prisma.walletDevice.findUnique({
    where: { deviceLibraryIdentifier: input.deviceLibraryIdentifier },
    select: {
      id: true,
      registrations: {
        include: {
          pass: {
            select: {
              serialNumber: true,
              passTypeIdentifier: true,
              status: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!device) {
    return null;
  }

  const since = Number(input.passesUpdatedSince);
  const validSince = Number.isFinite(since) ? since : 0;

  const updatedPasses = device.registrations
    .map((registration) => registration.pass)
    .filter(
      (pass) =>
        pass.passTypeIdentifier === input.passTypeIdentifier &&
        pass.status === "ACTIVE" &&
        pass.updatedAt.getTime() / 1000 > validSince,
    );

  if (updatedPasses.length === 0) {
    return { serialNumbers: [], lastUpdated: null };
  }

  const lastUpdated = Math.max(
    ...updatedPasses.map((pass) => Math.floor(pass.updatedAt.getTime() / 1000)),
  );

  return {
    serialNumbers: updatedPasses.map((pass) => pass.serialNumber),
    lastUpdated: String(lastUpdated),
  };
}
