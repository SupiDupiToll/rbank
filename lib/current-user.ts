import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { stackServerApp } from "@/stack/server";
import { generateCustomerId } from "@/lib/banking";
import { MAX_NAME_LENGTH, sanitizePlainText } from "@/lib/security";
import { Prisma } from "@prisma/client";

export type AppUser = {
  id: string;
  stackUserId: string;
  customerId: string;
  displayName: string | null;
  pinHash: string | null;
  role: "ADMIN" | "CUSTOMER";
};

type LegacyAppUser = Omit<AppUser, "pinHash">;

function withMissingPinHash(user: LegacyAppUser): AppUser {
  return {
    ...user,
    pinHash: null
  };
}

function isMissingPinHashColumnError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    typeof error.meta?.column === "string" &&
    error.meta.column.includes("pin_hash")
  );
}

export const getCurrentAppUser = cache(async (): Promise<AppUser | null> => {
  const stackUser = await stackServerApp.getUser();
  if (!stackUser) {
    return null;
  }

  const email = stackUser.primaryEmail?.trim().toLowerCase() ?? "";
  const adminEmails = (process.env.STACK_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const role = adminEmails.includes(email) ? "ADMIN" : "CUSTOMER";
  const displayName = sanitizePlainText(
    stackUser.displayName?.trim() || stackUser.primaryEmail?.trim() || stackUser.id,
    MAX_NAME_LENGTH
  );

  let existingUser: AppUser | null = null;

  try {
    existingUser = await prisma.user.findUnique({
      where: { stackUserId: stackUser.id },
      select: { id: true, stackUserId: true, customerId: true, displayName: true, pinHash: true, role: true }
    });
  } catch (error) {
    if (!isMissingPinHashColumnError(error)) {
      throw error;
    }

    const legacyUser = await prisma.user.findUnique({
      where: { stackUserId: stackUser.id },
      select: { id: true, stackUserId: true, customerId: true, displayName: true, role: true }
    });

    existingUser = legacyUser ? withMissingPinHash(legacyUser) : null;
  }

  if (existingUser) {
    if (existingUser.role === role && existingUser.displayName === displayName) {
      return existingUser;
    }

    try {
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role,
          displayName
        },
        select: { id: true, stackUserId: true, customerId: true, displayName: true, pinHash: true, role: true }
      });
    } catch (error) {
      if (!isMissingPinHashColumnError(error)) {
        throw error;
      }

      const legacyUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role,
          displayName
        },
        select: { id: true, stackUserId: true, customerId: true, displayName: true, role: true }
      });

      return withMissingPinHash(legacyUser);
    }
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      return await prisma.user.create({
        data: {
          stackUserId: stackUser.id,
          customerId: generateCustomerId(),
          displayName,
          role
        },
        select: { id: true, stackUserId: true, customerId: true, displayName: true, pinHash: true, role: true }
      });
    } catch (error) {
      if (isMissingPinHashColumnError(error)) {
        const legacyUser = await prisma.user.create({
          data: {
            stackUserId: stackUser.id,
            customerId: generateCustomerId(),
            displayName,
            role
          },
          select: { id: true, stackUserId: true, customerId: true, displayName: true, role: true }
        });

        return withMissingPinHash(legacyUser);
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("customerId")
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Kundennummer konnte nicht erzeugt werden.");
});
