import { z } from "zod";

export const MAX_AMOUNT_CENTS = 100_000_000;
export const MAX_DESCRIPTION_LENGTH = 120;
export const MAX_LABEL_LENGTH = 80;
export const MAX_NAME_LENGTH = 80;
export const MAX_SLUG_LENGTH = 64;
export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 6;
export const MERCHANT_SECRET_LENGTH = 64;

export function sanitizePlainText(value: string, maxLength: number) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export const customerIdSchema = z.string().regex(/^\d{8}$/);
export const cuidSchema = z.string().regex(/^c[a-z0-9]{24,}$/i);
export const amountCentsSchema = z.number().int().positive().max(MAX_AMOUNT_CENTS);
export const pinSchema = z
  .string()
  .regex(
    new RegExp(`^\\d{${MIN_PIN_LENGTH},${MAX_PIN_LENGTH}}$`),
    `${MIN_PIN_LENGTH}-${MAX_PIN_LENGTH}-stellige PIN erforderlich.`,
  );
export const merchantIdSchema = z.string().uuid();
export const merchantSecretSchema = z
  .string()
  .regex(new RegExp(`^[a-f0-9]{${MERCHANT_SECRET_LENGTH}}$`, "i"));
export const paymentTokenSchema = z.string().regex(/^pay_[a-f0-9]{24,}$/i);
export const donationBoxSlugSchema = z
  .string()
  .regex(new RegExp(`^[a-z0-9-]{3,${MAX_SLUG_LENGTH}}$`));
export const urlSchema = z.string().url();

export const safeTextSchema = (maxLength: number) =>
  z
    .string()
    .transform((value) => sanitizePlainText(value, maxLength))
    .refine((value) => value.length > 0, "Leerer Text ist nicht erlaubt.");

export const isoDateStringSchema = z
  .string()
  .refine((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }, "Ungueltiges Datum.")
  .transform((value) => new Date(value));
