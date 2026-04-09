import "server-only";
import { z } from "zod";

import { publicEnv } from "@/lib/public-env";

const serverEnvSchema = z.object({
  APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  STACK_SECRET_SERVER_KEY: z.string().min(32),
  STACK_ADMIN_EMAILS: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional()
});

const parsedEnv = serverEnvSchema.safeParse({
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY,
  STACK_ADMIN_EMAILS: process.env.STACK_ADMIN_EMAILS,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN
});

if (!parsedEnv.success) {
  throw new Error(`Ungueltige Server-Konfiguration: ${parsedEnv.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
}

if (parsedEnv.data.STACK_SECRET_SERVER_KEY.length < 32) {
  throw new Error("STACK_SECRET_SERVER_KEY muss mindestens 32 Zeichen lang sein.");
}

if (parsedEnv.data.UPSTASH_REDIS_REST_URL && !parsedEnv.data.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_TOKEN fehlt.");
}

if (parsedEnv.data.UPSTASH_REDIS_REST_TOKEN && !parsedEnv.data.UPSTASH_REDIS_REST_URL) {
  throw new Error("UPSTASH_REDIS_REST_URL fehlt.");
}

export const env = {
  ...publicEnv,
  ...parsedEnv.data
};
export const appOrigin = new URL(env.APP_URL).origin;
