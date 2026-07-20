"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminAirTransaction,
  AdminFestgeld,
  AdminMerchant,
  AdminTransaction,
  AdminUserRow,
} from "@/lib/admin-dashboard";
import { formatAirFromUnits, formatEuroFromCents } from "@/lib/money";
import { formatGermanDate, toDateInputValue } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";
import { MerchantCredentialsModal } from "@/components/merchant-credentials-modal";
import { AdminLoans } from "@/components/admin-loans";
import type { AdminLoan, AdminLoanProduct } from "@/lib/admin-dashboard";

type AdminPanelProps = {
  initialUsers: AdminUserRow[];
  initialSelectedCustomerId: string;
  initialTransactions: AdminTransaction[];
  initialAirTransactions: AdminAirTransaction[];
  initialAirInCirculation: number;
  initialFestgeldAccounts: AdminFestgeld[];
  initialMerchants: AdminMerchant[];
  initialLoanProducts: AdminLoanProduct[];
  initialPendingLoans: AdminLoan[];
  initialActiveLoans: AdminLoan[];
  initialCompletedLoans: AdminLoan[];
};

function getTransactionSourceMeta(source: AdminTransaction["source"]) {
  if (source === "TRANSFER") {
    return {
      label: "TRANSFER",
      className: "bg-primary/10 text-primary",
    };
  }

  if (source === "CHECKOUT") {
    return {
      label: "CHECKOUT",
      className: "bg-emerald-500/10 text-emerald-300",
    };
  }

  if (source === "DONATION") {
    return {
      label: "DONATION",
      className: "bg-sky-500/10 text-sky-200",
    };
  }

  if (source === "REFUND") {
    return {
      label: "REFUND",
      className: "bg-sky-500/10 text-sky-300",
    };
  }

  if (source === "OVERDRAFT_INTEREST") {
    return {
      label: "DISPOZINS",
      className: "bg-amber-500/10 text-amber-300",
    };
  }

  if (source === "LOAN_DISBURSEMENT") {
    return {
      label: "KREDIT",
      className: "bg-blue-500/10 text-blue-300",
    };
  }

  if (source === "LOAN_REPAYMENT") {
    return {
      label: "RATE",
      className: "bg-violet-500/10 text-violet-300",
    };
  }

  return {
    label: source,
    className: "bg-slate-800 text-slate-300",
  };
}

export function AdminPanel({
  initialUsers,
  initialSelectedCustomerId,
  initialTransactions,
  initialAirTransactions,
  initialAirInCirculation,
  initialFestgeldAccounts,
  initialMerchants,
  initialLoanProducts,
  initialPendingLoans,
  initialActiveLoans,
  initialCompletedLoans,
}: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialSelectedCustomerId,
  );
  const [transactions, setTransactions] =
    useState<AdminTransaction[]>(initialTransactions);
  const [airTransactions, setAirTransactions] = useState<AdminAirTransaction[]>(
    initialAirTransactions,
  );
  const [airInCirculation, setAirInCirculation] = useState(
    initialAirInCirculation,
  );
  const [festgeldAccounts, setFestgeldAccounts] = useState<AdminFestgeld[]>(
    initialFestgeldAccounts,
  );
  const [merchants, setMerchants] = useState<AdminMerchant[]>(initialMerchants);
  const [selectedMerchantId, setSelectedMerchantId] = useState(
    initialMerchants[0]?.merchantId ?? "",
  );

  const [txType, setTxType] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [txCurrency, setTxCurrency] = useState<"EUR" | "AIR">("EUR");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(toDateInputValue(new Date()));

  const [fgLabel, setFgLabel] = useState("Festgeld 12 Monate");
  const [fgAmount, setFgAmount] = useState("");
  const [fgRate, setFgRate] = useState("3.0");
  const [fgStartDate, setFgStartDate] = useState(toDateInputValue(new Date()));
  const [fgEndDate, setFgEndDate] = useState("");

  const [merchantName, setMerchantName] = useState("");
  const [merchantWebhookUrl, setMerchantWebhookUrl] = useState("");
  const [merchantActive, setMerchantActive] = useState(true);
  const [credentialsModal, setCredentialsModal] = useState<{
    merchantId: string;
    merchantName: string;
    merchantSecret: string;
    webhookSecret: string;
  } | null>(null);

  const [message, setMessage] = useState("");

  const selectedMerchant =
    merchants.find((merchant) => merchant.merchantId === selectedMerchantId) ??
    null;

  const hydrateMerchantForm = useCallback((merchant: AdminMerchant | null) => {
    if (!merchant) {
      setMerchantName("");
      setMerchantWebhookUrl("");
      setMerchantActive(true);
      return;
    }

    setMerchantName(merchant.name);
    setMerchantWebhookUrl(merchant.webhookUrl ?? "");
    setMerchantActive(merchant.isActive);
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    if (!response.ok) return;
    const data = (await response.json()) as { users: AdminUserRow[] };
    setUsers(data.users);
    if (!selectedCustomerId && data.users.length > 0) {
      setSelectedCustomerId(data.users[0].customerId);
    }
  }, [selectedCustomerId]);

  const loadTransactions = useCallback(async (customerId: string) => {
    const response = await fetch(`/api/admin/users/${customerId}/transactions`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      transactions: AdminTransaction[];
    };
    setTransactions(data.transactions);
  }, []);

  const loadFestgeld = useCallback(async () => {
    const response = await fetch("/api/admin/festgeld");
    if (!response.ok) return;
    const data = (await response.json()) as { accounts: AdminFestgeld[] };
    setFestgeldAccounts(data.accounts);
  }, []);

  const loadAirTransactions = useCallback(async () => {
    const response = await fetch("/api/admin/transactions?currency=AIR");
    if (!response.ok) return;
    const data = (await response.json()) as {
      transactions: AdminAirTransaction[];
    };
    setAirTransactions(data.transactions);
    setAirInCirculation(
      data.transactions.reduce(
        (sum, transaction) =>
          sum +
          (transaction.type === "INCOMING"
            ? transaction.amount
            : -transaction.amount),
        0,
      ),
    );
  }, []);

  const loadMerchants = useCallback(async () => {
    const response = await fetch("/api/admin/merchants");
    if (!response.ok) return;
    const data = (await response.json()) as { merchants: AdminMerchant[] };
    setMerchants(data.merchants);
    const nextSelectedMerchant =
      data.merchants.find(
        (merchant) => merchant.merchantId === selectedMerchantId,
      ) ??
      data.merchants[0] ??
      null;
    setSelectedMerchantId(nextSelectedMerchant?.merchantId ?? "");
    hydrateMerchantForm(nextSelectedMerchant);
  }, [hydrateMerchantForm, selectedMerchantId]);

  useEffect(() => {
    if (!fgEndDate) {
      setFgEndDate(
        toDateInputValue(new Date(Date.now() + 365 * 24 * 3600 * 1000)),
      );
    }
  }, [fgEndDate]);

  useEffect(() => {
    hydrateMerchantForm(selectedMerchant);
  }, [hydrateMerchantForm, selectedMerchant]);

  useEffect(() => {
    if (initialUsers.length === 0 && initialFestgeldAccounts.length === 0) {
      void loadUsers();
      void loadFestgeld();
    }
  }, [
    initialFestgeldAccounts.length,
    initialUsers.length,
    loadFestgeld,
    loadUsers,
  ]);

  useEffect(() => {
    if (initialMerchants.length === 0) {
      void loadMerchants();
    }
  }, [initialMerchants.length, loadMerchants]);

  useEffect(() => {
    if (initialAirTransactions.length === 0 && initialAirInCirculation === 0) {
      void loadAirTransactions();
    }
  }, [
    initialAirInCirculation,
    initialAirTransactions.length,
    loadAirTransactions,
  ]);

  useEffect(() => {
    if (
      selectedCustomerId !== initialSelectedCustomerId ||
      initialTransactions.length === 0
    ) {
      if (selectedCustomerId) {
        void loadTransactions(selectedCustomerId);
      }
    }
  }, [
    initialSelectedCustomerId,
    initialTransactions.length,
    loadTransactions,
    selectedCustomerId,
  ]);

  async function submitTransaction(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const amount = Math.round(Number(txAmount) * 100);
    if (!selectedCustomerId || Number.isNaN(amount) || amount <= 0) {
      setMessage("Bitte gueltige Werte eingeben.");
      return;
    }

    const response = await fetch("/api/admin/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        type: txType,
        currency: txCurrency,
        amount,
        description: txDescription,
        date: txDate,
      }),
    });

    if (!response.ok) {
      setMessage("Transaktion konnte nicht gespeichert werden.");
      return;
    }

    setMessage(
      txCurrency === "AIR"
        ? "AIR-Prämie gespeichert."
        : "Transaktion gespeichert.",
    );
    setTxAmount("");
    setTxDescription("");
    await loadUsers();
    await loadTransactions(selectedCustomerId);
    await loadAirTransactions();
  }

  async function submitFestgeld(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const amount = Math.round(Number(fgAmount) * 100);
    const interestRate = Number(fgRate);

    if (
      !selectedCustomerId ||
      Number.isNaN(amount) ||
      amount <= 0 ||
      Number.isNaN(interestRate)
    ) {
      setMessage("Bitte gueltige Festgeld-Werte eingeben.");
      return;
    }

    const response = await fetch("/api/admin/festgeld", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        label: fgLabel,
        amount,
        interestRate,
        startDate: fgStartDate,
        endDate: fgEndDate,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Festgeldkonto konnte nicht erstellt werden.");
      return;
    }

    setMessage("Festgeldkonto erstellt.");
    setFgAmount("");
    await loadFestgeld();
  }

  async function payoutFestgeld(accountId: string) {
    setMessage("");

    const response = await fetch(`/api/admin/festgeld/${accountId}/payout`, {
      method: "POST",
      headers: {
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Auszahlung fehlgeschlagen.");
      return;
    }

    setMessage("Festgeld wurde ausgezahlt.");
    await loadFestgeld();
    await loadUsers();
    if (selectedCustomerId) {
      await loadTransactions(selectedCustomerId);
    }
    await loadAirTransactions();
  }

  async function createMerchant(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setCredentialsModal(null);

    const response = await fetch("/api/admin/merchants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
      body: JSON.stringify({
        name: merchantName,
        webhookUrl: merchantWebhookUrl || null,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      merchantSecret?: string;
      webhookSecret?: string;
      merchant?: { merchantId: string; name: string };
    };

    if (!response.ok) {
      setMessage(data.error ?? "Haendler konnte nicht erstellt werden.");
      return;
    }

    if (
      data.merchant?.merchantId &&
      data.merchantSecret &&
      data.webhookSecret
    ) {
      setCredentialsModal({
        merchantId: data.merchant.merchantId,
        merchantName: data.merchant.name ?? merchantName,
        merchantSecret: data.merchantSecret,
        webhookSecret: data.webhookSecret,
      });
    }

    setMessage("Haendler erstellt. Zugangsdaten wurden geoeffnet.");
    await loadMerchants();
    if (data.merchant?.merchantId) {
      setSelectedMerchantId(data.merchant.merchantId);
    }
  }

  async function saveMerchant() {
    if (!selectedMerchant) {
      return;
    }

    setMessage("");

    const response = await fetch(
      `/api/admin/merchants/${selectedMerchant.merchantId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
        },
        body: JSON.stringify({
          name: merchantName,
          webhookUrl: merchantWebhookUrl || null,
          isActive: merchantActive,
        }),
      },
    );

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Haendler konnte nicht gespeichert werden.");
      return;
    }

    setMessage("Haendler gespeichert.");
    await loadMerchants();
  }

  async function refundPayment(token: string) {
    setMessage("");

    const response = await fetch(`/api/admin/payments/${token}/refund`, {
      method: "POST",
      headers: {
        [CSRF_HEADER_NAME]: getCsrfTokenFromDocumentCookie(),
      },
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(data.error ?? "Rueckerstattung fehlgeschlagen.");
      return;
    }

    setMessage("Rueckerstattung ausgefuehrt.");
    await loadMerchants();
    await loadUsers();
    if (selectedCustomerId) {
      await loadTransactions(selectedCustomerId);
    }
    await loadAirTransactions();
  }

  function formatTransactionAmount(transaction: {
    amount: number;
    currency: "EUR" | "AIR";
  }) {
    return transaction.currency === "AIR"
      ? formatAirFromUnits(transaction.amount)
      : formatEuroFromCents(transaction.amount);
  }

  function downloadMerchantReport() {
    if (!selectedMerchant) {
      return;
    }

    window.location.href = `/api/admin/merchants/${selectedMerchant.merchantId}/report`;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10 lg:px-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="mb-3 block text-sm font-bold uppercase tracking-widest text-primary">
            Admin
          </span>
          <h1 className="font-display text-4xl font-black">Verwaltung</h1>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <h2 className="mb-4 text-2xl font-display font-bold">Kunden</h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Kunde</Th>
                  <Th>Konten</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.customerId}
                    className={`cursor-pointer transition-colors ${selectedCustomerId === user.customerId ? "bg-primary/10" : "hover:bg-slate-800/40"}`}
                    onClick={() => setSelectedCustomerId(user.customerId)}
                  >
                    <Td>
                      <div className="font-bold text-slate-100">
                        {user.displayName ?? "Kunde"}
                      </div>
                      <div className="text-xs text-slate-400">
                        #{user.customerId} · {user.stackUserId}
                      </div>
                    </Td>
                    <Td className="font-bold">
                      <div>{formatEuroFromCents(user.balanceCents)}</div>
                      <div className="text-xs text-sky-300">
                        {formatAirFromUnits(user.airBalance)}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-7">
          <h2 className="text-2xl font-display font-bold">Buchung</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={submitTransaction}
          >
            <div className="space-y-2">
              <Label>Typ</Label>
              <select
                className="w-full rounded-lg bg-slate-800 p-4 text-slate-100 outline-none focus:ring-2 focus:ring-primary"
                value={txType}
                onChange={(event) =>
                  setTxType(event.target.value as "INCOMING" | "OUTGOING")
                }
              >
                <option value="INCOMING">Eingang</option>
                <option value="OUTGOING">Ausgang</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Währung</Label>
              <select
                className="w-full rounded-lg bg-slate-800 p-4 text-slate-100 outline-none focus:ring-2 focus:ring-primary"
                value={txCurrency}
                onChange={(event) =>
                  setTxCurrency(event.target.value as "EUR" | "AIR")
                }
              >
                <option value="EUR">EUR</option>
                <option value="AIR">AIR</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>
                Betrag ({txCurrency}){" "}
                {txCurrency === "AIR" ? "· Prämie auszahlen" : ""}
              </Label>
              <Input
                required
                value={txAmount}
                onChange={(event) => setTxAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Beschreibung</Label>
              <Input
                required
                value={txDescription}
                onChange={(event) => setTxDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                required
                type="date"
                value={txDate}
                onChange={(event) => setTxDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="h-14 w-full" type="submit">
                Speichern
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <h2 className="mb-4 text-2xl font-display font-bold">Verlauf</h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Datum</Th>
                  <Th>Beschreibung</Th>
                  <Th>Betrag</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <Td>{formatGermanDate(transaction.date)}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getTransactionSourceMeta(transaction.source).className}`}>
                          {getTransactionSourceMeta(transaction.source).label}
                        </span>
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          {transaction.currency}
                        </span>
                        <span>{transaction.description}</span>
                      </div>
                    </Td>
                    <Td
                      className={
                        transaction.type === "INCOMING"
                          ? "font-bold text-primary"
                          : "font-bold text-red-400"
                      }
                    >
                      {transaction.type === "INCOMING" ? "+ " : "- "}
                      {formatTransactionAmount(transaction)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card>

        <Card className="space-y-4 lg:col-span-5">
          <h2 className="text-2xl font-display font-bold">Festgeld</h2>
          <form className="space-y-4" onSubmit={submitFestgeld}>
            <div className="space-y-2">
              <Label>Bezeichnung</Label>
              <Input
                required
                value={fgLabel}
                onChange={(event) => setFgLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Betrag (EUR)</Label>
              <Input
                required
                value={fgAmount}
                onChange={(event) => setFgAmount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Zinssatz (%)</Label>
              <Input
                required
                value={fgRate}
                onChange={(event) => setFgRate(event.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  required
                  type="date"
                  value={fgStartDate}
                  onChange={(event) => setFgStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input
                  required
                  type="date"
                  value={fgEndDate}
                  onChange={(event) => setFgEndDate(event.target.value)}
                />
              </div>
            </div>
            <Button className="h-14 w-full" type="submit">
              Anlegen
            </Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-2xl font-display font-bold">Festgeldkonten</h2>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Kunde</Th>
                <Th>Bezeichnung</Th>
                <Th>Betrag</Th>
                <Th>Zins</Th>
                <Th>Laufzeit</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {festgeldAccounts.map((account) => (
                <tr key={account.id}>
                  <Td>
                    <div className="font-bold">
                      {account.user.displayName ?? "Kunde"}
                    </div>
                    <div className="text-xs text-slate-400">
                      #{account.user.customerId} · {account.user.stackUserId}
                    </div>
                  </Td>
                  <Td>{account.label}</Td>
                  <Td>{formatEuroFromCents(account.amount)}</Td>
                  <Td>{account.interestRate.toFixed(2)}%</Td>
                  <Td>
                    {formatGermanDate(account.startDate)} -{" "}
                    {formatGermanDate(account.endDate)}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          account.status === "UNLOCKED"
                            ? "bg-primary/10 text-primary"
                            : account.status === "PAID_OUT"
                              ? "bg-slate-800 text-slate-300"
                              : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {account.status === "UNLOCKED"
                          ? "Unlocked"
                          : account.status === "PAID_OUT"
                            ? "Ausgezahlt"
                            : "Aktiv"}
                      </span>
                      {account.status === "UNLOCKED" ? (
                        <button
                          className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-background-dark"
                          onClick={() => void payoutFestgeld(account.id)}
                          type="button"
                        >
                          Auszahlen
                        </button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>

      <AdminLoans
        initialProducts={initialLoanProducts}
        initialPendingLoans={initialPendingLoans}
        initialActiveLoans={initialActiveLoans}
        initialCompletedLoans={initialCompletedLoans}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="space-y-4 lg:col-span-4">
          <h2 className="text-2xl font-display font-bold">AirCoin</h2>
          <div className="grid gap-4">
            <MetricCard
              label="Im Umlauf"
              value={formatAirFromUnits(airInCirculation)}
            />
          </div>
          <p className="text-sm text-slate-400">
            AIR ist intern, bankweit buchbar und nicht in Echtgeld
            konvertierbar.
          </p>
        </Card>

        <Card className="lg:col-span-8">
          <h2 className="mb-4 text-2xl font-display font-bold">
            AIR-Transaktionen
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Datum</Th>
                  <Th>Kunde</Th>
                  <Th>Beschreibung</Th>
                  <Th>Betrag</Th>
                </tr>
              </thead>
              <tbody>
                {airTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <Td>{formatGermanDate(transaction.date)}</Td>
                    <Td>
                      <div className="font-semibold text-slate-100">
                        {transaction.customerName ?? "Kunde"}
                      </div>
                      <div className="text-xs text-slate-400">
                        #{transaction.customerId}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-200">
                          {transaction.source}
                        </span>
                        <span>{transaction.description}</span>
                      </div>
                    </Td>
                    <Td
                      className={
                        transaction.type === "INCOMING"
                          ? "font-bold text-primary"
                          : "font-bold text-red-400"
                      }
                    >
                      {transaction.type === "INCOMING" ? "+ " : "- "}
                      {formatAirFromUnits(transaction.amount)}
                    </Td>
                  </tr>
                ))}
                {airTransactions.length === 0 ? (
                  <tr>
                    <Td className="text-slate-400" colSpan={4}>
                      Noch keine AIR-Transaktionen vorhanden.
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <Card className="space-y-4 lg:col-span-5">
          <h2 className="text-2xl font-display font-bold">Haendler anlegen</h2>
          <form className="space-y-4" onSubmit={createMerchant}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                required
                value={merchantName}
                onChange={(event) => setMerchantName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook-URL (optional)</Label>
              <Input
                value={merchantWebhookUrl}
                onChange={(event) => setMerchantWebhookUrl(event.target.value)}
              />
            </div>
            <Button className="h-14 w-full" type="submit">
              Haendler erstellen
            </Button>
          </form>
        </Card>

        <Card className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-display font-bold">Haendler</h2>
            {selectedMerchant ? (
              <Button
                onClick={downloadMerchantReport}
                type="button"
                variant="outline"
              >
                CSV exportieren
              </Button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              {merchants.map((merchant) => (
                <button
                  key={merchant.merchantId}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedMerchantId === merchant.merchantId
                      ? "border-primary bg-primary/10"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                  }`}
                  onClick={() => setSelectedMerchantId(merchant.merchantId)}
                  type="button"
                >
                  <p className="font-bold text-slate-100">{merchant.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {merchant.merchantId}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    Volumen {formatEuroFromCents(merchant.totalVolumeCents)}
                  </p>
                </button>
              ))}
            </div>

            {selectedMerchant ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Heute"
                    value={formatEuroFromCents(
                      selectedMerchant.volumeTodayCents,
                    )}
                  />
                  <MetricCard
                    label="Monat"
                    value={formatEuroFromCents(
                      selectedMerchant.volumeMonthCents,
                    )}
                  />
                  <MetricCard
                    label="Gesamt"
                    value={formatEuroFromCents(
                      selectedMerchant.totalVolumeCents,
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={merchantName}
                      onChange={(event) => setMerchantName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant ID</Label>
                    <input
                      className="w-full rounded-lg bg-slate-800/50 p-4 font-mono text-sm text-slate-400 outline-none"
                      readOnly
                      value={selectedMerchant.merchantId}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Webhook-URL</Label>
                    <Input
                      value={merchantWebhookUrl}
                      onChange={(event) =>
                        setMerchantWebhookUrl(event.target.value)
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 text-sm text-slate-200">
                  <input
                    checked={merchantActive}
                    onChange={(event) =>
                      setMerchantActive(event.target.checked)
                    }
                    type="checkbox"
                  />
                  Haendler aktiv
                </label>
                <Button
                  className="h-12"
                  onClick={() => void saveMerchant()}
                  type="button"
                >
                  Haendler speichern
                </Button>

                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Status</Th>
                        <Th>Beschreibung</Th>
                        <Th>Betrag</Th>
                        <Th>Kunde</Th>
                        <Th>Aktion</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMerchant.sessions.map((session) => (
                        <tr key={session.token}>
                          <Td>{session.status}</Td>
                          <Td>
                            <div className="font-semibold text-slate-100">
                              {session.description}
                            </div>
                            <div className="text-xs text-slate-400">
                              {formatGermanDate(session.createdAt)}
                            </div>
                          </Td>
                          <Td>{formatEuroFromCents(session.amount)}</Td>
                          <Td>
                            {session.customerName ?? session.customerId ?? "—"}
                          </Td>
                          <Td>
                            {session.status === "COMPLETED" ? (
                              <button
                                className="rounded-lg bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-300"
                                onClick={() =>
                                  void refundPayment(session.token)
                                }
                                type="button"
                              >
                                Refund
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Noch keine Haendler vorhanden.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-2xl font-display font-bold">Shop-Integration</h2>
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-200">
          {`<button onclick="payWithRBank()">Mit RBank bezahlen</button>

<script>
async function payWithRBank() {
  const res = await fetch('/api/create-rbank-payment', {
    method: 'POST',
    body: JSON.stringify({ orderId: '1234', amount: 2999 })
  });
  const { paymentUrl } = await res.json();
  window.location.href = paymentUrl;
}
</script>

// Next.js API Route (shop-side)
export async function POST(req) {
  const { orderId, amount } = await req.json();

  const res = await fetch('https://rbank.sdtoll.de/api/pay/create', {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${MERCHANT_ID}:\${MERCHANT_SECRET}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      currency: 'EUR',
      description: \`Bestellung #\${orderId}\`,
      redirectUrl: \`https://meinshop.de/success?order=\${orderId}\`,
      cancelUrl: \`https://meinshop.de/cancel?order=\${orderId}\`
    })
  });

  const { paymentUrl } = await res.json();
  return Response.json({ paymentUrl });
}

// Success Page Verification (shop-side)
export async function GET(req) {
  const token = req.nextUrl.searchParams.get('token');

  const res = await fetch(\`https://rbank.sdtoll.de/api/pay/verify/\${token}\`, {
    headers: { 'Authorization': \`Bearer \${MERCHANT_ID}:\${MERCHANT_SECRET}\` }
  });

  const payment = await res.json();

  if (payment.status === 'COMPLETED') {
    // fulfill order
  }
}`}
        </pre>
      </Card>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      {credentialsModal ? (
        <MerchantCredentialsModal
          merchantId={credentialsModal.merchantId}
          merchantName={credentialsModal.merchantName}
          merchantSecret={credentialsModal.merchantSecret}
          webhookSecret={credentialsModal.webhookSecret}
          onDismiss={() => setCredentialsModal(null)}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
