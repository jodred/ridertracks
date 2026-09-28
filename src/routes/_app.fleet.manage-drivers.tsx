import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { FleetDriver } from "@/lib/fleet/fleet";
import { AppLogo, ensureDefaultEarningSources, type EarningSource } from "@/lib/fleet/settlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/fleet/manage-drivers")({
  head: () => ({
    meta: [
      { title: "Manage drivers — RideTracks" },
      {
        name: "description",
        content:
          "Edit driver IDs, names, emails and application fees, or remove drivers from your fleet.",
      },
      { property: "og:title", content: "Manage drivers — RideTracks" },
      {
        property: "og:description",
        content: "Edit driver details or remove drivers from your fleet.",
      },
    ],
  }),
  component: ManageDriversPage,
});

function ManageDriversPage() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [sources, setSources] = useState<EarningSource[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { error: seedError } = await ensureDefaultEarningSources(user.id);
    if (seedError) return toast.error(seedError.message);
    const [driverResult, sourceResult, assignmentResult] = await Promise.all([
      supabase
        .from("fleet_drivers")
        .select("id, code, name, email, app_fee_override")
        .order("code"),
      supabase
        .from("fleet_earning_sources")
        .select("id, fleet_user_id, name, slug, logo_key, is_default, is_active, sort_order")
        .order("sort_order")
        .order("name"),
      supabase.from("fleet_driver_sources").select("driver_id, source_id"),
    ]);
    const error = driverResult.error ?? sourceResult.error ?? assignmentResult.error;
    if (error) return toast.error(error.message);
    setDrivers((driverResult.data ?? []) as FleetDriver[]);
    setSources((sourceResult.data ?? []) as EarningSource[]);
    const nextAssignments: Record<string, string[]> = {};
    for (const assignment of assignmentResult.data ?? []) {
      nextAssignments[assignment.driver_id] = [
        ...(nextAssignments[assignment.driver_id] ?? []),
        assignment.source_id,
      ];
    }
    setAssignments(nextAssignments);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(id: string, p: Partial<FleetDriver>) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...p } : d)));
  }

  async function save(d: FleetDriver) {
    if (!user) return;
    const selected = assignments[d.id] ?? [];
    if (selected.length === 0) return toast.error("Assign at least one earning app");
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
    const { data: existing, error: existingError } = await supabase
      .from("fleet_driver_sources")
      .select("source_id")
      .eq("driver_id", d.id);
    if (existingError) return toast.error(existingError.message);
    const existingIds = (existing ?? []).map((item) => item.source_id);
    const toAdd = selected.filter((sourceId) => !existingIds.includes(sourceId));
    const toRemove = existingIds.filter((sourceId) => !selected.includes(sourceId));
    if (toAdd.length > 0) {
      const { error: addError } = await supabase.from("fleet_driver_sources").insert(
        toAdd.map((sourceId) => ({
          fleet_user_id: user.id,
          driver_id: d.id,
          source_id: sourceId,
        })),
      );
      if (addError) return toast.error(addError.message);
    }
    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("fleet_driver_sources")
        .delete()
        .eq("driver_id", d.id)
        .in("source_id", toRemove);
      if (removeError) return toast.error(removeError.message);
    }
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
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fleet Partner
          </div>
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
              <Input
                className="rounded-xl"
                value={d.code}
                onChange={(e) => patch(d.id, { code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                className="rounded-xl"
                value={d.name}
                onChange={(e) => patch(d.id, { name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                className="rounded-xl"
                value={d.email}
                onChange={(e) => patch(d.id, { email: e.target.value })}
              />
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
            <fieldset className="space-y-2 sm:col-span-2 lg:col-span-5">
              <legend className="text-sm font-medium">Assigned earning apps</legend>
              <div className="flex flex-wrap gap-2">
                {sources
                  .filter(
                    (source) => source.is_active || (assignments[d.id] ?? []).includes(source.id),
                  )
                  .map((source) => {
                    const checked = (assignments[d.id] ?? []).includes(source.id);
                    return (
                      <label
                        key={source.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 ${checked ? "border-primary bg-primary/5" : "border-border"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setAssignments((current) => ({
                              ...current,
                              [d.id]: event.target.checked
                                ? [...(current[d.id] ?? []), source.id]
                                : (current[d.id] ?? []).filter((id) => id !== source.id),
                            }))
                          }
                          className="h-4 w-4 accent-primary"
                        />
                        <AppLogo source={source} className="h-7 w-7" />
                        <span className="text-sm">{source.name}</span>
                        {!source.is_active && (
                          <span className="text-xs text-muted-foreground">Archived</span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </fieldset>
            <div className="flex gap-2 lg:col-span-5">
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
