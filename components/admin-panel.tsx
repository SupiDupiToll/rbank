"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AdminFestgeld,
  AdminTransaction,
  AdminUserRow,
} from "@/lib/admin-dashboard";
import { formatEuroFromCents } from "@/lib/money";
import { formatGermanDate, toDateInputValue } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { CSRF_HEADER_NAME, getCsrfTokenFromDocumentCookie } from "@/lib/csrf";

type AdminPanelProps = {
  initialUsers: AdminUserRow[];
  initialSelectedCustomerId: string;
  initialTransactions: AdminTransaction[];
  initialFestgeldAccounts: AdminFestgeld[];
};

export function AdminPanel({
  initialUsers,
  initialSelectedCustomerId,
  initialTransactions,
  initialFestgeldAccounts,
}: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialSelectedCustomerId,
  );
  const [transactions, setTransactions] =
    useState<AdminTransaction[]>(initialTransactions);
  const [festgeldAccounts, setFestgeldAccounts] = useState<AdminFestgeld[]>(
    initialFestgeldAccounts,
  );

  const [txType, setTxType] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(toDateInputValue(new Date()));

  const [fgLabel, setFgLabel] = useState("Festgeld 12 Monate");
  const [fgAmount, setFgAmount] = useState("");
  const [fgRate, setFgRate] = useState("3.0");
  const [fgStartDate, setFgStartDate] = useState(toDateInputValue(new Date()));
  const [fgEndDate, setFgEndDate] = useState("");

  const [message, setMessage] = useState("");

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

  useEffect(() => {
    if (!fgEndDate) {
      setFgEndDate(
        toDateInputValue(new Date(Date.now() + 365 * 24 * 3600 * 1000)),
      );
    }
  }, [fgEndDate]);

  useEffect(() => {
    if (initialUsers.length > 0 || initialFestgeldAccounts.length > 0) {
      return;
    }

    void loadUsers();
    void loadFestgeld();
  }, [
    initialFestgeldAccounts.length,
    initialUsers.length,
    loadFestgeld,
    loadUsers,
  ]);

  useEffect(() => {
    if (
      selectedCustomerId === initialSelectedCustomerId &&
      initialTransactions.length > 0
    ) {
      return;
    }

    if (selectedCustomerId) {
      void loadTransactions(selectedCustomerId);
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
      setMessage("Bitte gültige Werte eingeben.");
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
        amount,
        description: txDescription,
        date: txDate,
      }),
    });

    if (!response.ok) {
      setMessage("Transaktion konnte nicht gespeichert werden.");
      return;
    }

    setMessage("Transaktion gespeichert.");
    setTxAmount("");
    setTxDescription("");
    await loadUsers();
    await loadTransactions(selectedCustomerId);
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
      setMessage("Bitte gültige Festgeld-Werte eingeben.");
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
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
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
                  <Th>Kontostand</Th>
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
                      {formatEuroFromCents(user.balanceCents)}
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
              <Label>Betrag (EUR)</Label>
              <Input
                value={txAmount}
                onChange={(event) => setTxAmount(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Beschreibung</Label>
              <Input
                value={txDescription}
                onChange={(event) => setTxDescription(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input
                type="date"
                value={txDate}
                onChange={(event) => setTxDate(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="h-14 w-full">
                Speichern
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
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
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            transaction.source === "TRANSFER"
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {transaction.source === "TRANSFER" ? "P2P" : "Admin"}
                        </span>
                        <span>{transaction.description}</span>
                      </div>
                    </Td>
                    <Td
                      className={
                        transaction.type === "INCOMING"
                          ? "text-primary font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {transaction.type === "INCOMING" ? "+ " : "- "}
                      {formatEuroFromCents(transaction.amount)}
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
                value={fgLabel}
                onChange={(event) => setFgLabel(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Betrag (EUR)</Label>
              <Input
                value={fgAmount}
                onChange={(event) => setFgAmount(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Zinssatz (%)</Label>
              <Input
                value={fgRate}
                onChange={(event) => setFgRate(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={fgStartDate}
                  onChange={(event) => setFgStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input
                  type="date"
                  value={fgEndDate}
                  onChange={(event) => setFgEndDate(event.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="h-14 w-full">
              Anlegen
            </Button>
          </form>
        </Card>
      </div>

      <Card className="mt-8">
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

      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}
    </div>
  );
}
