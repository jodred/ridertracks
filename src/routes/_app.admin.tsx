import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight, Users } from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { summarize, formatMoney } from "../lib/trackuber/calc";
import { currentUserAsRider, mockRiders, type Rider } from "../lib/trackuber/adminMock";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RideTracks" },
      { name: "description", content: "View all riders and inspect each driver's dashboard." },
      { property: "og:title", content: "Admin — RideTracks" },
      { property: "og:description", content: "View all riders and inspect each driver's dashboard." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const matches = useMatches();
  const isDetail = matches.some((m) => m.routeId === "/_app/admin/$riderId");
  if (isDetail) return <Outlet />;
  return <AdminListPage />;
}

function AdminListPage() {
  const { state, range } = useStore();

  const riders = useMemo<Rider[]>(() => [currentUserAsRider(state), ...mockRiders], [state]);

  const rows = riders.map((r) => {
    const summary = summarize({ entries: r.entries, fleet: r.fleet, profile: r.profile }, range);
    return { rider: r, summary };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operations</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Riders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all riders for {range.from} → {range.to}. Click a rider to open their dashboard.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{riders.length} riders</span>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Fleet</th>
                  <th className="px-5 py-3 text-right font-medium">Gross</th>
                  <th className="px-5 py-3 text-right font-medium">Expenses</th>
                  <th className="px-5 py-3 text-right font-medium">Partner</th>
                  <th className="px-5 py-3 text-right font-medium">Net Profit</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ rider, summary }) => {
                  const initials = rider.profile.driverName
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <tr key={rider.id} className="border-t border-border transition-colors hover:bg-accent/40">
                      <td className="px-5 py-4">
                        <Link to="/admin/$riderId" params={{ riderId: rider.id }} className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {rider.profile.driverName || "Unnamed driver"}
                              {rider.id === "me" && (
                                <Badge variant="outline" className="ml-2 rounded-full text-[10px]">You</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{rider.profile.email || "—"}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{rider.profile.fleetName}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{formatMoney(summary.gross, rider.fleet.currency)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{formatMoney(summary.totalExpenses, rider.fleet.currency)}</td>
                      <td className="px-5 py-4 text-right tabular-nums">{formatMoney(summary.expectedPartnerPayment, rider.fleet.currency)}</td>
                      <td className={`px-5 py-4 text-right font-semibold tabular-nums ${summary.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatMoney(summary.netProfit, rider.fleet.currency)}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to="/admin/$riderId"
                          params={{ riderId: rider.id }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
