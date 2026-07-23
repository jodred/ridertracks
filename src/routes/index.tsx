import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowUpRight,
  Wallet,
  Coins,
  Receipt,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useStore } from "../lib/trackuber/store";
import { formatMoney, formatDateShort, summarize } from "../lib/trackuber/calc";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TrackUber" },
      { name: "description", content: "See your earnings, expected fleet payout, and real profit for any period." },
      { property: "og:title", content: "Dashboard — TrackUber" },
      { property: "og:description", content: "See your earnings, expected fleet payout, and real profit for any period." },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  large,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Wallet;
  accent?: boolean;
  large?: boolean;
  badge?: string;
}) {
  return (
    <Card className={`rounded-2xl border-border shadow-card ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <CardContent className={`flex flex-col gap-3 ${large ? "p-6" : "p-5"}`}>
        <div className="flex items-center justify-between">
          <div className={`grid h-9 w-9 place-items-center rounded-xl ${accent ? "bg-primary-foreground/15" : "bg-secondary"}`}>
            <Icon className={`h-4 w-4 ${accent ? "text-primary-foreground" : "text-foreground"}`} />
          </div>
          {badge && (
            <Badge variant={accent ? "secondary" : "outline"} className="rounded-full text-[10px] uppercase tracking-wide">
              {badge}
            </Badge>
          )}
        </div>
        <div>
          <div className={`text-xs font-medium ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</div>
          <div className={`mt-1 font-semibold tracking-tight ${large ? "text-4xl" : "text-2xl"}`}>{value}</div>
          {hint && (
            <div className={`mt-1 text-xs ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{hint}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { state, range } = useStore();
  const summary = useMemo(() => summarize(state, range), [state, range]);
  const currency = state.fleet.currency;

  const revenueSeries = summary.daily.map((d) => ({ date: formatDateShort(d.date), Revenue: d.gross }));
  const profitSeries = summary.daily.map((d) => ({ date: formatDateShort(d.date), Profit: d.profit }));

  const expensePieRaw = [
    ...Object.entries(summary.expensesByCategory).map(([name, value]) => ({ name, value })),
  ];
  if (summary.weeklyFees > 0) expensePieRaw.push({ name: "Weekly Fee", value: summary.weeklyFees });

  const revenuePie = [
    { name: "Card", value: summary.cardRevenue },
    { name: "Cash", value: summary.cashCollected },
  ].filter((s) => s.value > 0);

  const chartColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overview</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        </div>
        <Link
          to="/entry"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:opacity-90"
        >
          Add today's entry
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Gross Revenue" value={formatMoney(summary.gross, currency)} icon={Coins} hint={`${summary.daily.length} day${summary.daily.length === 1 ? "" : "s"} tracked`} />
        <Kpi
          label="Expected Partner Payment"
          value={formatMoney(summary.expectedPartnerPayment, currency)}
          icon={Wallet}
          hint="Gross − Cash − Fleet deductions"
          badge="Expected"
        />
        <Kpi label="Cash Wallet" value={formatMoney(summary.cashWallet, currency)} icon={Wallet} hint="Passenger cash on hand" />
        <Kpi label="Total Expenses" value={formatMoney(summary.totalExpenses, currency)} icon={Receipt} hint={summary.weeklyFeeCount ? `Incl. ${summary.weeklyFeeCount} weekly fee${summary.weeklyFeeCount > 1 ? "s" : ""}` : "Operating expenses"} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Kpi label="Net Profit" value={formatMoney(summary.netProfit, currency)} icon={Sparkles} hint="Gross − Fleet deductions − Expenses" accent large />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Revenue Trend</div>
                <div className="text-lg font-semibold tracking-tight">{formatMoney(summary.gross, currency)}</div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={revenueSeries} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Profit Trend</div>
                <div className="text-lg font-semibold tracking-tight">{formatMoney(summary.netProfit, currency)}</div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={profitSeries} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="Profit" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="p-5">
            <div className="mb-4 text-xs font-medium text-muted-foreground">Expense Breakdown</div>
            {expensePieRaw.length === 0 ? (
              <EmptyState label="No expenses in range" />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={expensePieRaw} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {expensePieRaw.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  {expensePieRaw.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-medium">{formatMoney(s.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="p-5">
            <div className="mb-4 text-xs font-medium text-muted-foreground">Revenue Breakdown</div>
            {revenuePie.length === 0 ? (
              <EmptyState label="No revenue in range" />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="h-48 w-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={revenuePie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                        {revenuePie.map((_, i) => (
                          <Cell key={i} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  {revenuePie.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: chartColors[i % chartColors.length] }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <span className="font-medium">{formatMoney(s.value, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily table */}
      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Daily Summary</div>
            <div className="text-xs text-muted-foreground">{summary.daily.length} entries</div>
          </div>
          {summary.daily.length === 0 ? (
            <EmptyState label="No entries in range" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 font-medium">Date</th>
                    <th className="py-2 font-medium text-right">Gross</th>
                    <th className="py-2 font-medium text-right">Cash</th>
                    <th className="py-2 font-medium text-right">Expenses</th>
                    <th className="py-2 font-medium text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.daily.map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className="py-3">
                        <Link to="/entry" search={{ date: d.date } as never} className="hover:underline">
                          {formatDateShort(d.date)}
                        </Link>
                      </td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.gross, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.cash, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.expenses, currency)}</td>
                      <td className={`py-3 text-right font-medium tabular-nums ${d.profit >= 0 ? "text-primary" : "text-destructive"}`}>{formatMoney(d.profit, currency)}</td>
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

function EmptyState({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-xl bg-secondary/50 py-10 text-sm text-muted-foreground">
      {label}
    </div>
  );
}