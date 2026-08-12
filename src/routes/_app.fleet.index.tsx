import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserPlus, Users, Building2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/trackuber/Ridetracks";
import { computeRange, formatMoney } from "@/lib/trackuber/calc";
import { buildDriverRow, type FleetDriver, type FleetEntry } from "@/lib/fleet/fleet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/fleet/")({
  head: () => ({
    meta: [
      { title: "Fleet Home — RideTracks" },
      { name: "description", content: "Fleet partner home: manage drivers, earnings and weekly payouts." },
      { property: "og:title", content: "Fleet Home — RideTracks" },
      { property: "og:description", content: "Manage your drivers, earnings and weekly payouts." },
    ],
  }),
  component: FleetHome,
});

function FleetHome() {
  const { user } = useAuth();
  const { state } = useStore();
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [entries, setEntries] = useState<FleetEntry[]>([]);
  const week = computeRange("thisWeek", undefined, undefined, 1);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: d } = await supabase
        .from("fleet_drivers")
        .select("id, code, name, email, app_fee_override")
        .order("code");
      setDrivers((d ?? []) as FleetDriver[]);
      const { data: e } = await supabase
        .from("fleet_driver_entries")
        .select("driver_id, date, gross, cash")
        .gte("date", week.from)
        .lte("date", week.to);
      setEntries((e ?? []) as FleetEntry[]);
    })();
  }, [user, week.from, week.to]);

  const rows = drivers.map((d) => buildDriverRow(d, entries, state.fleet.deductions, state.fleet.weeklyAppFee));
  const payout = rows.reduce((s, r) => s + r.payout, 0);
  const gross = rows.reduce((s, r) => s + r.gross, 0);
  const currency = state.fleet.currency;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fleet Partner</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{state.fleet.fleetName || state.profile.fleetName || "Your fleet"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your drivers, earnings and weekly settlements.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="rounded-xl">
          <Link to="/fleet/add-driver">
            <UserPlus className="h-4 w-4" /> Add driver
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-xl">
          <Link to="/fleet/drivers">
            <Users className="h-4 w-4" /> Drivers
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Drivers" value={String(drivers.length)} />
        <Stat icon={Building2} label="Gross this week" value={formatMoney(gross, currency)} />
        <Stat icon={Wallet} label="Payout this week" value={formatMoney(payout, currency)} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="rounded-2xl border-border shadow-card">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tracking-tight">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
