import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { FleetDriver } from "@/lib/fleet/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/fleet/manage-drivers")({
  head: () => ({
    meta: [
      { title: "Manage drivers — RideTracks" },
      { name: "description", content: "Edit driver IDs, names, emails and application fees, or remove drivers from your fleet." },
      { property: "og:title", content: "Manage drivers — RideTracks" },
      { property: "og:description", content: "Edit driver details or remove drivers from your fleet." },
    ],
  }),
  component: ManageDriversPage,
});

function ManageDriversPage() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("fleet_drivers")
      .select("id, code, name, email, app_fee_override")
      .order("code");
    setDrivers((data ?? []) as FleetDriver[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(id: string, p: Partial<FleetDriver>) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...p } : d)));
  }

  async function save(d: FleetDriver) {
    const { error } = await supabase
      .from("fleet_drivers")
      .update({
        code: d.code.trim(),
        name: d.name.trim(),
        email: d.email.trim(),
        app_fee_override: d.app_fee_override,
      })
      .eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(`${d.name} updated`);
  }

  async function remove(d: FleetDriver) {
    if (!confirm(`Remove ${d.name} and all their recorded earnings?`)) return;
    const { error } = await supabase.from("fleet_drivers").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    setDrivers((prev) => prev.filter((x) => x.id !== d.id));
    toast.success(`${d.name} removed`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fleet Partner</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Manage drivers</h1>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" /> Back to settings
          </Link>
        </Button>
      </div>

      {drivers.length === 0 && (
        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No drivers yet — add your first driver from the fleet home page.
          </CardContent>
        </Card>
      )}

      {drivers.map((d) => (
        <Card key={d.id} className="rounded-2xl border-border shadow-card">
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <div className="space-y-2">
              <Label>Driver ID</Label>
              <Input className="rounded-xl" value={d.code} onChange={(e) => patch(d.id, { code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input className="rounded-xl" value={d.name} onChange={(e) => patch(d.id, { name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input className="rounded-xl" value={d.email} onChange={(e) => patch(d.id, { email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Weekly application fee</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                placeholder="Default from settings"
                value={d.app_fee_override ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  patch(d.id, { app_fee_override: v === "" ? null : Number(v.replace(",", ".")) });
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button className="rounded-xl" onClick={() => save(d)}>
                <Save className="h-4 w-4" /> Save
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => remove(d)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
