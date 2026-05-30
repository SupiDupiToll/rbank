import { settleMaturedFestgeldAccounts } from "@/lib/festgeld";
import { settleOverdraftInterest } from "@/lib/overdraft";

export async function settleCustomerAccounting(userId?: string) {
  await settleMaturedFestgeldAccounts(userId);
  await settleOverdraftInterest(userId);
}
