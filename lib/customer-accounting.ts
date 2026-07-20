import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { settleOverdraftInterest } from "@/lib/overdraft";
import { processDuePayments } from "@/lib/loan";

export async function settleCustomerAccounting(userId?: string) {
  await settleMaturedFestgeldAccounts(userId);
  await settleOverdraftInterest(userId);
  await processDuePayments(userId);
}
