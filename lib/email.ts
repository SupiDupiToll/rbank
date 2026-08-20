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

export async function sendEmailToAddress(email: string, subject: string, html: string) {
  const normalized = email.trim().toLowerCase();

  try {
    const users = await stackServerApp.listUsers({ query: normalized });
    const recipient = users.find(
      (user) => user.primaryEmail?.trim().toLowerCase() === normalized,
    );

    if (!recipient) {
      console.error(`No Stack user found for email "${email}"`);
      return false;
    }

    await stackServerApp.sendEmail({
      userIds: [recipient.id],
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
