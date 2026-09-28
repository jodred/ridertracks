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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ARRANGEMENT_LABELS,
  defaultDriverTaxProfile,
  type DriverArrangement,
  type DriverTaxProfile,
  type IncomeCostType,
} from "@/lib/fleet/polishTax";

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
  const [taxProfiles, setTaxProfiles] = useState<Record<string, DriverTaxProfile>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const { error: seedError } = await ensureDefaultEarningSources(user.id);
    if (seedError) return toast.error(seedError.message);
    const [driverResult, sourceResult, assignmentResult, taxProfileResult] = await Promise.all([
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
      supabase
        .from("fleet_driver_tax_profiles")
        .select(
          "driver_id, fleet_user_id, arrangement, pesel, nip, address_line, postal_code, city, tax_resident, under_26, apply_social_insurance, apply_sickness_insurance, pension_rate, disability_rate, sickness_rate, health_rate, income_cost_type, custom_income_cost, pit_rate, pit2_reduction, ppk_rate, vat_rate, vat_exempt, self_billing",
        ),
    ]);
    const error =
      driverResult.error ?? sourceResult.error ?? assignmentResult.error ?? taxProfileResult.error;
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
    const savedProfiles = new Map(
      (taxProfileResult.data ?? []).map((item) => [item.driver_id, item]),
    );
    const nextTaxProfiles: Record<string, DriverTaxProfile> = {};
    for (const driver of (driverResult.data ?? []) as FleetDriver[]) {
      const saved = savedProfiles.get(driver.id);
      nextTaxProfiles[driver.id] = saved
        ? ({
            ...saved,
            pension_rate: Number(saved.pension_rate),
            disability_rate: Number(saved.disability_rate),
            sickness_rate: Number(saved.sickness_rate),
            health_rate: Number(saved.health_rate),
            custom_income_cost: Number(saved.custom_income_cost),
            pit_rate: Number(saved.pit_rate),
            pit2_reduction: Number(saved.pit2_reduction),
            ppk_rate: Number(saved.ppk_rate),
            vat_rate: Number(saved.vat_rate),
          } as DriverTaxProfile)
        : defaultDriverTaxProfile(driver.id, user.id);
    }
    setTaxProfiles(nextTaxProfiles);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(id: string, p: Partial<FleetDriver>) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...p } : d)));
  }

  function patchTax(id: string, patchValue: Partial<DriverTaxProfile>) {
    setTaxProfiles((current) => ({
      ...current,
      [id]: { ...current[id], ...patchValue },
    }));
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
    const taxProfile = taxProfiles[d.id] ?? defaultDriverTaxProfile(d.id, user.id);
    const { error: taxError } = await supabase
      .from("fleet_driver_tax_profiles")
      .upsert({ ...taxProfile, fleet_user_id: user.id, driver_id: d.id });
    if (taxError) return toast.error(taxError.message);
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
            <TaxProfileEditor
              profile={taxProfiles[d.id] ?? defaultDriverTaxProfile(d.id, user?.id ?? "")}
              onChange={(profilePatch) => patchTax(d.id, profilePatch)}
            />
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

function TaxProfileEditor({
  profile,
  onChange,
}: {
  profile: DriverTaxProfile;
  onChange: (patch: Partial<DriverTaxProfile>) => void;
}) {
  const numeric = (key: keyof DriverTaxProfile, value: string) =>
    onChange({ [key]: Number(value.replace(",", ".")) } as Partial<DriverTaxProfile>);
  const checkbox = (label: string, key: keyof DriverTaxProfile) => (
    <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(profile[key])}
        onChange={(event) => onChange({ [key]: event.target.checked } as Partial<DriverTaxProfile>)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-secondary/20 p-4 sm:col-span-2 lg:col-span-5">
      <div>
        <div className="text-sm font-semibold">Agreement and tax document</div>
        <div className="text-xs text-muted-foreground">
          The selected agreement controls which document can be downloaded for this driver.
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Agreement</Label>
          <Select
            value={profile.arrangement}
            onValueChange={(value) => {
              const arrangement = value as DriverArrangement;
              const defaults = defaultDriverTaxProfile(
                profile.driver_id,
                profile.fleet_user_id,
                arrangement,
              );
              onChange({
                arrangement,
                income_cost_type: defaults.income_cost_type,
                apply_social_insurance: defaults.apply_social_insurance,
                apply_sickness_insurance: defaults.apply_sickness_insurance,
              });
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ARRANGEMENT_LABELS) as DriverArrangement[]).map((value) => (
                <SelectItem value={value} key={value}>
                  {ARRANGEMENT_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{profile.arrangement === "b2b" ? "NIP" : "PESEL"}</Label>
          <Input
            className="rounded-xl"
            inputMode="numeric"
            value={profile.arrangement === "b2b" ? profile.nip : profile.pesel}
            onChange={(event) =>
              onChange(
                profile.arrangement === "b2b"
                  ? { nip: event.target.value.replace(/\D/g, "") }
                  : { pesel: event.target.value.replace(/\D/g, "") },
              )
            }
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label>Street and number</Label>
          <Input
            className="rounded-xl"
            value={profile.address_line}
            onChange={(e) => onChange({ address_line: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Postal code</Label>
          <Input
            className="rounded-xl"
            placeholder="00-000"
            value={profile.postal_code}
            onChange={(e) => onChange({ postal_code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            className="rounded-xl"
            value={profile.city}
            onChange={(e) => onChange({ city: e.target.value })}
          />
        </div>
        {profile.arrangement === "b2b" ? (
          <>
            <div className="space-y-2">
              <Label>VAT rate (%)</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                value={profile.vat_rate}
                onChange={(e) => numeric("vat_rate", e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {checkbox("VAT exempt", "vat_exempt")}
              {checkbox("Self-billing", "self_billing")}
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Income costs</Label>
              <Select
                value={profile.income_cost_type}
                onValueChange={(value) => onChange({ income_cost_type: value as IncomeCostType })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard250">Standard 250 zł</SelectItem>
                  <SelectItem value="commuter300">Commuter 300 zł</SelectItem>
                  <SelectItem value="percent20">20%</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {profile.income_cost_type === "custom" && (
              <div className="space-y-2">
                <Label>Custom income costs (zł)</Label>
                <Input
                  className="rounded-xl"
                  inputMode="decimal"
                  value={profile.custom_income_cost}
                  onChange={(e) => numeric("custom_income_cost", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>PIT rate (%)</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                value={profile.pit_rate}
                onChange={(e) => numeric("pit_rate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PIT-2 monthly reduction</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                value={profile.pit2_reduction}
                onChange={(e) => numeric("pit2_reduction", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PPK employee rate (%)</Label>
              <Input
                className="rounded-xl"
                inputMode="decimal"
                value={profile.ppk_rate}
                onChange={(e) => numeric("ppk_rate", e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              {checkbox("Polish tax resident", "tax_resident")}
              {checkbox("Under 26 relief", "under_26")}
              {checkbox("Social insurance", "apply_social_insurance")}
              {checkbox("Sickness insurance", "apply_sickness_insurance")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
