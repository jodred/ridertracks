import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Save, FileText } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useStore } from "../lib/trackuber/store";
import { applyDeductions, formatMoney, isFirstWorkingDayOfWeek, todayISO } from "../lib/trackuber/calc";
import type { ExpenseItem, PaymentMethod } from "../lib/trackuber/types";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

const searchSchema = z.object({
  date: fallback(z.string(), todayISO()).default(todayISO()),
});

export const Route = createFileRoute("/entry")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Daily Entry — TrackUber" },
      { name: "description", content: "Log your daily gross revenue, cash collected, and expenses in seconds." },
      { property: "og:title", content: "Daily Entry — TrackUber" },
      { property: "og:description", content: "Log your daily gross revenue, cash collected, and expenses in seconds." },
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

  useEffect(() => {
    const e = state.entries[date];
    setGross(e?.gross ?? 0);
    setCash(e?.cashCollected ?? 0);
    setExpenses(e?.expenses ?? []);
  }, [date, state.entries]);

  const currency = state.fleet.currency;
  const ded = useMemo(() => applyDeductions(gross || 0, state.fleet.deductions), [gross, state.fleet.deductions]);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const willChargeFee = useMemo(() => {
    const draft = { ...state.entries, [date]: { date, gross, cashCollected: cash, expenses, updatedAt: 0 } };
    return isFirstWorkingDayOfWeek(date, draft, state.fleet.firstDayOfWeek);
  }, [state.entries, date, gross, cash, expenses, state.fleet.firstDayOfWeek]);
  const weeklyFee = willChargeFee ? state.fleet.weeklyAppFee : 0;
  const partnerPayment = (gross || 0) - (cash || 0) - ded.total - weeklyFee;
  const profit = (gross || 0) - ded.total - totalExpenses - weeklyFee;

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

  const save = () => {
    upsertEntry({
      date,
      gross: Number(gross) || 0,
      cashCollected: Number(cash) || 0,
      expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) || 0 })),
      updatedAt: Date.now(),
    });
    toast.success("Entry saved");
  };

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
          <Button onClick={save} className="rounded-full">
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
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
              {expenses.map((e) => (
                <div key={e.id} className="grid grid-cols-1 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_120px_140px_auto_auto]">
                  <Select value={e.category} onValueChange={(v) => updateExpense(e.id, { category: v })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {state.fleet.categories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" inputMode="decimal" step="0.01" value={e.amount} onChange={(ev) => updateExpense(e.id, { amount: Number(ev.target.value) })} placeholder="0.00" className="rounded-lg" />
                  <Select value={e.paymentMethod} onValueChange={(v) => updateExpense(e.id, { paymentMethod: v as PaymentMethod })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
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
              ))}
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