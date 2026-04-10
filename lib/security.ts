import { z } from "zod";

export const MAX_AMOUNT_CENTS = 100_000_000;
export const MAX_DESCRIPTION_LENGTH = 120;
export const MAX_LABEL_LENGTH = 80;
export const MAX_NAME_LENGTH = 80;
export const PIN_LENGTH = 4;

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
export const pinSchema = z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `${PIN_LENGTH}-stellige PIN erforderlich.`);

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
