import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowLeft,
  Wallet,
  Coins,
  Receipt,
  Sparkles,
  TrendingUp,
  Car,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useStore } from "../lib/trackuber/store";
import { summarize, formatMoney, formatDateShort } from "../lib/trackuber/calc";
import { currentUserAsRider, mockRiders } from "../lib/trackuber/adminMock";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/_app/admin/$riderId")({
  head: () => ({
    meta: [
      { title: "Rider · Admin — RideTracks" },
      { name: "description", content: "Detailed rider dashboard." },
      { property: "og:title", content: "Rider · Admin — RideTracks" },
      { property: "og:description", content: "Detailed rider dashboard." },
    ],
  }),
  component: RiderDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">Rider not found</h1>
      <Link to="/admin" className="mt-4 inline-flex text-sm text-primary hover:underline">
        Back to riders
      </Link>
    </div>
  ),
});

function RiderDetail() {
  const { riderId } = Route.useParams();
  const { state, range } = useStore();

  const rider = useMemo(() => {
    if (riderId === "me") return currentUserAsRider(state);
    return mockRiders.find((r) => r.id === riderId);
  }, [riderId, state]);

  if (!rider) throw notFound();

  const summary = useMemo(
    () => summarize({ entries: rider.entries, fleet: rider.fleet, profile: rider.profile }, range),
    [rider, range],
  );
  const currency = rider.fleet.currency;

  const revenueSeries = summary.daily.map((d) => ({
    date: formatDateShort(d.date),
    Revenue: d.gross,
    Profit: d.profit,
  }));

  const initials = rider.profile.driverName
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All riders
        </Link>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {rider.profile.driverName || "Unnamed driver"}
              </h1>
              {rider.id === "me" && <Badge variant="outline" className="rounded-full">You</Badge>}
              <Badge variant="secondary" className="rounded-full">{rider.profile.fleetName}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{rider.profile.email || "No email"}</span>
              <span className="inline-flex items-center gap-1">
                <Car className="h-3 w-3" />
                {rider.profile.vehicle || "—"} {rider.profile.registration && `· ${rider.profile.registration}`}
              </span>
              <span>Member since {rider.profile.memberSince}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpi label="Gross Revenue" value={formatMoney(summary.gross, currency)} icon={Coins} />
        <MiniKpi label="Expected Partner" value={formatMoney(summary.expectedPartnerPayment, currency)} icon={Wallet} />
        <MiniKpi label="Cash Wallet" value={formatMoney(summary.cashWallet, currency)} icon={Wallet} />
        <MiniKpi label="Total Expenses" value={formatMoney(summary.totalExpenses, currency)} icon={Receipt} />
      </div>

      <Card className="rounded-2xl border-border bg-primary text-primary-foreground shadow-card">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div>
            <div className="text-xs font-medium text-primary-foreground/70">Net Profit</div>
            <div className="mt-1 text-4xl font-semibold tracking-tight">{formatMoney(summary.netProfit, currency)}</div>
            <div className="mt-1 text-xs text-primary-foreground/70">{summary.daily.length} entries in range</div>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-foreground/15">
            <Sparkles className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Revenue vs Profit</div>
              <div className="text-lg font-semibold tracking-tight">{formatMoney(summary.gross, currency)}</div>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          {revenueSeries.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-10 text-sm text-muted-foreground">
              No entries in range
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={revenueSeries} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="Revenue" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Profit" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <div className="mb-4 text-sm font-semibold">Daily Summary</div>
          {summary.daily.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-10 text-sm text-muted-foreground">
              No entries in range
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
                  </tr>
                </thead>
                <tbody>
                  {summary.daily.map((d) => (
                    <tr key={d.date} className="border-t border-border">
                      <td className="py-3">{formatDateShort(d.date)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.gross, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.cash, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.expenses, currency)}</td>
                      <td className="py-3 text-right tabular-nums">{formatMoney(d.partnerPayment, currency)}</td>
                      <td className={`py-3 text-right font-medium tabular-nums ${d.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatMoney(d.profit, currency)}
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

function MiniKpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Wallet }) {
  return (
    <Card className="rounded-2xl border-border shadow-card">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
