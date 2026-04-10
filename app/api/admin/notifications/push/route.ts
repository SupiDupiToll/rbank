import { z } from "zod";
import { NextResponse } from "next/server";
import {
  enforceCsrf,
  enforceRateLimit,
  enforceSameOrigin,
  parseJsonBody,
  requireAdmin,
  safeRoute
} from "@/lib/api-helpers";
import { rateLimitPolicies } from "@/lib/rate-limit";
import { safeTextSchema } from "@/lib/security";
import { sendToAllUsers, sendToUser } from "@/lib/push-service";

const pushNotificationSchema = z.object({
  title: safeTextSchema(100),
  body: safeTextSchema(500),
  userId: z.string().cuid().optional() // if specified, send to specific user only
});

export async function POST(request: Request) {
  return safeRoute(async () => {
    const { error, user } = await requireAdmin();
    if (error || !user) return error;

    const originError = enforceSameOrigin(request);
    if (originError) return originError;

    const csrfError = enforceCsrf(request);
    if (csrfError) return csrfError;

    const rateLimitError = await enforceRateLimit(request, rateLimitPolicies.adminApi, user.id);
    if (rateLimitError) return rateLimitError;

    const body = await parseJsonBody(request, pushNotificationSchema);

    let sentCount = 0;

    if (body.userId) {
      // Send to specific user
      sentCount = await sendToUser(body.userId, {
        title: body.title,
        body: body.body,
        tag: `admin-manual-${Date.now()}`,
        data: { type: "admin-manual", url: "/dashboard" }
      });
    } else {
      // Send to all users
      sentCount = await sendToAllUsers({
        title: body.title,
        body: body.body,
        tag: `admin-manual-${Date.now()}`,
        data: { type: "admin-manual", url: "/dashboard" }
      });
    }

    return NextResponse.json({ success: true, sentCount }, { status: 200 });
  });
}
