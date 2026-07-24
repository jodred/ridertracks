import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload, FileText } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useStore } from "../lib/trackuber/store";
import {
  applyDeductions,
  formatMoney,
  isFirstWorkingDayOfWeek,
  todayISO,
  walletBeforeExpense,
} from "../lib/trackuber/calc";
import type { ExpenseItem, PaymentMethod } from "../lib/trackuber/types";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Banknote, CreditCard, Wallet } from "lucide-react";


const searchSchema = z.object({
  date: fallback(z.string(), todayISO()).default(todayISO()),
});

export const Route = createFileRoute("/_app/entry")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Daily Entry — RideTracks" },
      { name: "description", content: "Log daily gross revenue, cash collected, and expenses in seconds — auto-saved." },
      { property: "og:title", content: "Daily Entry — RideTracks" },
      { property: "og:description", content: "Log daily gross revenue, cash collected, and expenses in seconds — auto-saved." },
    ],
  }),
  component: EntryPage,
});

function uid() { return Math.random().toString(36).slice(2, 10); }

function EntryPage() {
  const { date } = Route.useSearch();
  const navigate = useNavigate({ from: "/entry" });
  const { state, upsertEntry } = useStore();

  const existing = state.entries[date];
  const [gross, setGross] = useState(existing?.gross ?? 0);
  const [cash, setCash] = useState(existing?.cashCollected ?? 0);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(existing?.expenses ?? []);
  const isFirstRender = useRef(true);

  // Reset local state when date changes
  useEffect(() => {
    const e = state.entries[date];
    setGross(e?.gross ?? 0);
    setCash(e?.cashCollected ?? 0);
    setExpenses(e?.expenses ?? []);
    isFirstRender.current = true;
  }, [date]);

  const currency = state.fleet.currency;

  // Compute split cash/card amounts for expenses that are "split"
  const computedExpenses = useMemo<ExpenseItem[]>(() => {
    return expenses.map((e, idx) => {
      if (e.paymentMethod !== "split") {
        return { ...e, cashAmount: undefined, cardAmount: undefined };
      }
      const available = walletBeforeExpense(state.entries, date, expenses, idx, cash);
      const cashAmount = Math.max(0, Math.min(e.amount || 0, available));
      const cardAmount = Math.max(0, (e.amount || 0) - cashAmount);
      return { ...e, cashAmount, cardAmount };
    });
  }, [expenses, state.entries, date, cash]);

  const ded = useMemo(() => applyDeductions(gross || 0, state.fleet.deductions), [gross, state.fleet.deductions]);
  const totalExpenses = computedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const willChargeFee = useMemo(() => {
    const draft = { ...state.entries, [date]: { date, gross, cashCollected: cash, expenses: computedExpenses, updatedAt: 0 } };
    return isFirstWorkingDayOfWeek(date, draft, state.fleet.firstDayOfWeek);
  }, [state.entries, date, gross, cash, computedExpenses, state.fleet.firstDayOfWeek]);
  const weeklyFee = willChargeFee ? state.fleet.weeklyAppFee : 0;
  const partnerPayment = (gross || 0) - (cash || 0) - ded.total - weeklyFee;
  const profit = (gross || 0) - ded.total - totalExpenses - weeklyFee;

  // Autosave in background
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      upsertEntry({
        date,
        gross: Number(gross) || 0,
        cashCollected: Number(cash) || 0,
        expenses: computedExpenses.map((e) => ({
          ...e,
          amount: Number(e.amount) || 0,
        })),
        updatedAt: Date.now(),
      });
    }, 400);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gross, cash, computedExpenses, date]);

  const addExpense = () => {
    setExpenses((prev) => [
      ...prev,
      { id: uid(), category: state.fleet.categories[0] ?? "Other", amount: 0, paymentMethod: "cash" },
    ]);
  };

  const updateExpense = (id: string, patch: Partial<ExpenseItem>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeExpense = (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  const onUpload = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateExpense(id, { invoice: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Daily Entry</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              const v = e.target.value;
              if (v) navigate({ search: { date: v } });
            }}
            className="w-[160px] rounded-full"
          />
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Gross Revenue</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={gross} onChange={(e) => setGross(Number(e.target.value))} className="h-12 rounded-xl text-lg font-medium" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Cash Collected</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={cash} onChange={(e) => setCash(Number(e.target.value))} className="h-12 rounded-xl text-lg font-medium" placeholder="0.00" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Expenses</div>
            <Button size="sm" variant="outline" onClick={addExpense} className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Add expense
            </Button>
          </div>
          {expenses.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-8 text-sm text-muted-foreground">
              No expenses added
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((e, idx) => {
                const c = computedExpenses[idx];
                return (
                  <div key={e.id} className="rounded-xl border border-border p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_150px_auto_auto]">
                      <Select value={e.category} onValueChange={(v) => updateExpense(e.id, { category: v })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {state.fleet.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" inputMode="decimal" step="0.01" value={e.amount} onChange={(ev) => updateExpense(e.id, { amount: Number(ev.target.value) })} placeholder="0.00" className="rounded-lg" />
                      <Select value={e.paymentMethod} onValueChange={(v) => updateExpense(e.id, { paymentMethod: v as PaymentMethod })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="split">Cash + Card</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-accent">
                        {e.invoice ? <FileText className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4" />}
                        <span>{e.invoice ? "Attached" : "Invoice"}</span>
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(ev) => onUpload(e.id, ev.target.files?.[0] ?? null)} />
                      </label>
                      <Button size="icon" variant="ghost" onClick={() => removeExpense(e.id)} className="text-muted-foreground">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {e.paymentMethod === "split" && (e.amount || 0) > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs">
                        <span className="font-medium text-muted-foreground">Auto-split:</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary tabular-nums">
                          {formatMoney(c?.cashAmount ?? 0, currency)} cash
                        </span>
                        <span className="rounded-full bg-accent px-2 py-0.5 font-medium tabular-nums">
                          + {formatMoney(c?.cardAmount ?? 0, currency)} card
                        </span>
                        {(c?.cardAmount ?? 0) > 0 && (
                          <span className="text-muted-foreground">Wallet emptied, remainder charged to card.</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-2 p-5 text-sm">
          <SummaryRow label="Gross Revenue" value={formatMoney(gross || 0, currency)} />
          {ded.results.map((d) => (
            <SummaryRow key={d.id} label={`− ${d.name}`} value={formatMoney(d.amount, currency)} muted />
          ))}
          {willChargeFee && <SummaryRow label={`− Weekly App Fee`} value={formatMoney(weeklyFee, currency)} muted />}
          <SummaryRow label="− Cash Collected" value={formatMoney(cash || 0, currency)} muted />
          <div className="my-2 border-t border-border" />
          <SummaryRow label="Expected Partner Payment" value={formatMoney(partnerPayment, currency)} strong />
          <SummaryRow label="Total Expenses (today)" value={formatMoney(totalExpenses + weeklyFee, currency)} />
          <SummaryRow label="Net Profit" value={formatMoney(profit, currency)} accent />
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value, muted, strong, accent }: { label: string; value: string; muted?: boolean; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${accent ? "text-lg font-semibold text-primary" : strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
