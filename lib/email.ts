import { stackServerApp } from "@/stack/server";

export async function sendLoanReminderEmail(stackUserId: string, subject: string, html: string) {
  try {
    await stackServerApp.sendEmail({
      userIds: [stackUserId],
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
