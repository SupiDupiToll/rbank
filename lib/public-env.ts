import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_STACK_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: z.string().min(1)
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
  NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
});

if (!parsedPublicEnv.success) {
  throw new Error(
    `Ungueltige Public-Konfiguration: ${parsedPublicEnv.error.issues.map((issue) => issue.path.join(".")).join(", ")}`
  );
}

export const publicEnv = parsedPublicEnv.data;
