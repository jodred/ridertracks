import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2, Search } from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { applyDeductions, entriesInRange, formatDate, formatMoney, isFirstWorkingDayOfWeek } from "../lib/trackuber/calc";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — TrackUber" },
      { name: "description", content: "Browse and edit past daily driving records." },
      { property: "og:title", content: "History — TrackUber" },
      { property: "og:description", content: "Browse and edit past daily driving records." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { state, range, deleteEntry } = useStore();
  const [q, setQ] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const currency = state.fleet.currency;

  const rows = useMemo(() => {
    const list = entriesInRange(state.entries, range).map((e) => {
      const ded = applyDeductions(e.gross, state.fleet.deductions);
      const fee = isFirstWorkingDayOfWeek(e.date, state.entries, state.fleet.firstDayOfWeek) ? state.fleet.weeklyAppFee : 0;
      const expenses = e.expenses.reduce((s, x) => s + x.amount, 0);
      return {
        date: e.date,
        gross: e.gross,
        cash: e.cashCollected,
        expenses: expenses + fee,
        profit: e.gross - ded.total - expenses - fee,
        partner: e.gross - e.cashCollected - ded.total - fee,
      };
    });
    return list
      .filter((r) => (q ? r.date.includes(q) : true))
      .sort((a, b) => (sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
  }, [state, range, q, sortDesc]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Records</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search date (YYYY-MM)" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-full pl-9" />
            </div>
            <Button variant="outline" onClick={() => setSortDesc((v) => !v)} className="rounded-full">
              Sort: {sortDesc ? "Newest" : "Oldest"}
            </Button>
          </div>
          {rows.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-10 text-sm text-muted-foreground">
              No entries in the selected range
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Gross</th>
                    <th className="py-2 text-right font-medium">Cash</th>
                    <th className="py-2 text-right font-medium">Expenses</th>
                    <th className="py-2 text-right font-medium">Partner</th>
                    <th className="py-2 text-right font-medium">Profit</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-t border-border">
                      <td className="py-3">{formatDate(r.date)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(r.gross, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(r.cash, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(r.expenses, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(r.partner, currency)}</td>
                      <td className={`py-3 text-right font-medium tabular-nums ${r.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatMoney(r.profit, currency)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Link to="/entry" search={{ date: r.date }} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              deleteEntry(r.date);
                              toast.success("Entry deleted");
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}