import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { settleOverdraftInterest } from "@/lib/overdraft";
import { processDuePayments, sendPaymentReminders } from "@/lib/loan";
import { syncUserBalance, syncAllUserBalances } from "@/lib/balance";

export async function settleCustomerAccounting(userId?: string) {
  await settleMaturedFestgeldAccounts(userId);
  await settleOverdraftInterest(userId);
  await processDuePayments(userId);
  await sendPaymentReminders();

  if (userId) {
    await syncUserBalance(userId);
  } else {
    await syncAllUserBalances();
  }
}
