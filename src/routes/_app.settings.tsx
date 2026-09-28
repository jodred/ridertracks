import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sun,
  Moon,
  Download,
  Upload,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { useAuth } from "../lib/auth/AuthProvider";
import { applyDeductions, formatMoney } from "../lib/trackuber/calc";
import type { Deduction } from "../lib/trackuber/types";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { supabase } from "../integrations/supabase/client";
import {
  AppLogo,
  ensureDefaultEarningSources,
  slugifySource,
  type AdjustmentDirection,
  type AdjustmentFrequency,
  type AdjustmentType,
  type EarningSource,
} from "../lib/fleet/settlements";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RideTracks" },
      {
        name: "description",
        content:
          "Configure your fleet commission rules, weekly app fee, expense categories, and appearance.",
      },
      { property: "og:title", content: "Settings — RideTracks" },
      {
        property: "og:description",
        content: "Configure fleet commission rules, weekly app fee, categories, and appearance.",
      },
    ],
  }),
  component: SettingsPage,
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function SettingsPage() {
  const {
    state,
    updateFleet,
    addDeduction,
    updateDeduction,
    removeDeduction,
    reorderDeductions,
    addCategory,
    removeCategory,
    updateProfile,
    exportData,
    importData,
  } = useStore();
  const { accountType, user } = useAuth();
  const fleet = state.fleet;
  const [newCat, setNewCat] = useState("");

  const move = (id: string, dir: -1 | 1) => {
    const ids = fleet.deductions.map((d) => d.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderDeductions(ids);
  };

  const sample = 5000;
  const sampleRes = applyDeductions(sample, fleet.deductions);
  const effectiveRate = sample > 0 ? (sampleRes.total / sample) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Configuration
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      </div>

      {accountType === "fleet" && (
        <Card className="rounded-2xl border-border shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="text-sm font-semibold">Drivers</div>
              <div className="text-xs text-muted-foreground">
                Edit driver IDs, names, emails and fees, or remove drivers.
              </div>
            </div>
            <Button asChild className="rounded-xl">
              <Link to="/fleet/manage-drivers">Manage drivers</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Fleet Settings</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fleet Partner Name</Label>
              <Input value={fleet.fleetName} readOnly disabled className="rounded-xl" />
              <p className="text-xs text-muted-foreground">
                Set once during account setup and saved to your secure profile.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Weekly App Fee</Label>
              <Input
                type="number"
                step="0.01"
                value={fleet.weeklyAppFee}
                onChange={(e) => updateFleet({ weeklyAppFee: Number(e.target.value) })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input
                value={fleet.currency}
                onChange={(e) => updateFleet({ currency: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>First Day of Week</Label>
              <Select
                value={String(fleet.firstDayOfWeek)}
                onValueChange={(v) => updateFleet({ firstDayOfWeek: Number(v) as 0 | 1 })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {accountType === "fleet" && user && <EarningAppsSettings fleetUserId={user.id} />}

      {accountType === "fleet" && user && <AdjustmentTypesSettings fleetUserId={user.id} />}

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Fleet Deductions</div>
              <div className="text-xs text-muted-foreground">Applied in order, top to bottom.</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                addDeduction({
                  id: uid(),
                  name: "New Deduction",
                  type: "percent",
                  value: 0,
                  applyTo: "gross",
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {fleet.deductions.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-8 text-sm text-muted-foreground">
              No deductions configured
            </div>
          ) : (
            <div className="space-y-2">
              {fleet.deductions.map((d, i) => (
                <DeductionRow
                  key={d.id}
                  d={d}
                  i={i}
                  last={i === fleet.deductions.length - 1}
                  onChange={(patch) => updateDeduction(d.id, patch)}
                  onRemove={() => removeDeduction(d.id)}
                  onUp={() => move(d.id, -1)}
                  onDown={() => move(d.id, 1)}
                />
              ))}
            </div>
          )}

          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="text-xs font-medium text-muted-foreground">
              Effective deduction rate
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {effectiveRate.toFixed(2)}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              On sample {formatMoney(sample, fleet.currency)}: −
              {formatMoney(sampleRes.total, fleet.currency)} → keep{" "}
              {formatMoney(sampleRes.net, fleet.currency)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Expense Categories</div>
          <div className="flex flex-wrap gap-2">
            {fleet.categories.map((c) => (
              <div
                key={c}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm"
              >
                {c}
                <button
                  onClick={() => removeCategory(c)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="e.g. Parking, Car Wash"
              className="rounded-full"
            />
            <Button
              className="rounded-full"
              onClick={() => {
                if (newCat.trim()) {
                  addCategory(newCat.trim());
                  setNewCat("");
                }
              }}
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Appearance</div>
          <div className="flex gap-2">
            <Button
              variant={state.profile.theme === "light" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => updateProfile({ theme: "light" })}
            >
              <Sun className="mr-1 h-4 w-4" /> Light
            </Button>
            <Button
              variant={state.profile.theme === "dark" ? "default" : "outline"}
              className="rounded-full"
              onClick={() => updateProfile({ theme: "dark" })}
            >
              <Moon className="mr-1 h-4 w-4" /> Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Backup</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                const blob = new Blob([exportData()], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ridetracks_backup_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="mr-1 h-4 w-4" /> Export data
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" /> Import data
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const ok = importData(reader.result as string);
                    toast[ok ? "success" : "error"](ok ? "Data imported" : "Invalid file");
                  };
                  reader.readAsText(file);
                }}
              />
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EarningAppsSettings({ fleetUserId }: { fleetUserId: string }) {
  const [sources, setSources] = useState<EarningSource[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { error: seedError } = await ensureDefaultEarningSources(fleetUserId);
    if (seedError) return toast.error(seedError.message);
    const { data, error } = await supabase
      .from("fleet_earning_sources")
      .select("id, fleet_user_id, name, slug, logo_key, is_default, is_active, sort_order")
      .order("sort_order")
      .order("name");
    if (error) return toast.error(error.message);
    setSources((data ?? []) as EarningSource[]);
  }, [fleetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  function patchSource(id: string, patch: Partial<EarningSource>) {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source)),
    );
  }

  async function saveSource(source: EarningSource) {
    const name = source.name.trim();
    if (!name) return toast.error("App name is required");
    const { error } = await supabase
      .from("fleet_earning_sources")
      .update({ name })
      .eq("id", source.id);
    if (error) return toast.error(error.message);
    toast.success(`${name} updated`);
    await load();
  }

  async function setSourceActive(source: EarningSource, isActive: boolean) {
    const { error } = await supabase
      .from("fleet_earning_sources")
      .update({ is_active: isActive })
      .eq("id", source.id);
    if (error) return toast.error(error.message);
    toast.success(isActive ? `${source.name} restored` : `${source.name} archived`);
    await load();
  }

  async function addCustomSource() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const baseSlug = slugifySource(name);
    const slug = sources.some((source) => source.slug === baseSlug)
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      : baseSlug;
    const { error } = await supabase.from("fleet_earning_sources").insert({
      fleet_user_id: fleetUserId,
      name,
      slug,
      logo_key: "custom",
      is_default: false,
      sort_order: Math.max(30, ...sources.map((source) => source.sort_order)) + 10,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewName("");
    toast.success(`${name} added`);
    await load();
  }

  return (
    <Card className="rounded-2xl border-border shadow-card">
      <CardContent className="space-y-4 p-5">
        <div>
          <div className="text-sm font-semibold">Earning apps</div>
          <div className="text-xs text-muted-foreground">
            Uber, Bolt and Free Now are ready by default. Add custom apps, rename them, or archive
            apps without losing history.
          </div>
        </div>
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 ${source.is_active ? "" : "opacity-60"}`}
            >
              <AppLogo source={source} />
              <Input
                aria-label={`${source.name} app name`}
                className="min-w-44 flex-1 rounded-xl"
                value={source.name}
                onChange={(event) => patchSource(source.id, { name: event.target.value })}
              />
              <span className="text-xs text-muted-foreground">
                {source.is_default ? "Default app" : "Custom app"}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => saveSource(source)}
                disabled={!source.is_active}
              >
                Save name
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => setSourceActive(source, !source.is_active)}
              >
                {source.is_active ? (
                  <>
                    <Archive className="h-4 w-4" /> Archive
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> Restore
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addCustomSource();
            }}
            placeholder="Custom app name"
            maxLength={80}
            className="rounded-xl"
          />
          <Button
            className="rounded-xl"
            onClick={addCustomSource}
            disabled={busy || !newName.trim()}
          >
            <Plus className="h-4 w-4" /> Add custom app
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdjustmentTypesSettings({ fleetUserId }: { fleetUserId: string }) {
  const [types, setTypes] = useState<AdjustmentType[]>([]);
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<AdjustmentDirection>("deduction");
  const [frequency, setFrequency] = useState<AdjustmentFrequency>("one_time");
  const [amount, setAmount] = useState("0");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("fleet_adjustment_types")
      .select("id, fleet_user_id, name, direction, frequency, default_amount, is_active")
      .order("created_at");
    if (error) return toast.error(error.message);
    setTypes(
      (data ?? []).map((item) => ({
        ...item,
        default_amount: Number(item.default_amount),
      })) as AdjustmentType[],
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function patchType(id: string, patch: Partial<AdjustmentType>) {
    setTypes((current) => current.map((type) => (type.id === id ? { ...type, ...patch } : type)));
  }

  async function addType() {
    const cleanName = name.trim();
    if (!cleanName) return;
    const { error } = await supabase.from("fleet_adjustment_types").insert({
      fleet_user_id: fleetUserId,
      name: cleanName,
      direction,
      frequency,
      default_amount: Math.max(0, Number(amount) || 0),
    });
    if (error) return toast.error(error.message);
    setName("");
    setAmount("0");
    toast.success(`${cleanName} added`);
    await load();
  }

  async function saveType(type: AdjustmentType) {
    const { error } = await supabase
      .from("fleet_adjustment_types")
      .update({
        name: type.name.trim(),
        direction: type.direction,
        frequency: type.frequency,
        default_amount: Math.max(0, Number(type.default_amount) || 0),
        is_active: type.is_active,
      })
      .eq("id", type.id);
    if (error) return toast.error(error.message);
    toast.success(`${type.name} updated`);
    await load();
  }

  return (
    <Card className="rounded-2xl border-border shadow-card">
      <CardContent className="space-y-4 p-5">
        <div>
          <div className="text-sm font-semibold">Settlement adjustment types</div>
          <div className="text-xs text-muted-foreground">
            Reusable additions and deductions affect payout only, never gross earnings or VAT.
          </div>
        </div>
        {types.length > 0 && (
          <div className="space-y-2">
            {types.map((type) => (
              <div
                key={type.id}
                className={`grid gap-2 rounded-xl border border-border p-3 md:grid-cols-[1fr_140px_140px_130px_auto] md:items-center ${type.is_active ? "" : "opacity-60"}`}
              >
                <Input
                  value={type.name}
                  onChange={(event) => patchType(type.id, { name: event.target.value })}
                  className="rounded-lg"
                />
                <Select
                  value={type.direction}
                  onValueChange={(value) =>
                    patchType(type.id, { direction: value as AdjustmentDirection })
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Addition</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={type.frequency}
                  onValueChange={(value) =>
                    patchType(type.id, { frequency: value as AdjustmentFrequency })
                  }
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={type.default_amount}
                  onChange={(event) =>
                    patchType(type.id, { default_amount: Math.max(0, Number(event.target.value)) })
                  }
                  className="rounded-lg text-right"
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => saveType(type)}
                  >
                    Save
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => saveType({ ...type, is_active: !type.is_active })}
                    aria-label={type.is_active ? `Archive ${type.name}` : `Restore ${type.name}`}
                  >
                    {type.is_active ? (
                      <Archive className="h-4 w-4" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-2 border-t border-border pt-4 md:grid-cols-[1fr_140px_140px_130px_auto]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Weekly bonus"
            maxLength={100}
            className="rounded-xl"
          />
          <Select
            value={direction}
            onValueChange={(value) => setDirection(value as AdjustmentDirection)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="addition">Addition</SelectItem>
              <SelectItem value="deduction">Deduction</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={frequency}
            onValueChange={(value) => setFrequency(value as AdjustmentFrequency)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one_time">One-time</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-xl text-right"
            aria-label="Default adjustment amount"
          />
          <Button className="rounded-xl" onClick={addType} disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeductionRow({
  d,
  i,
  last,
  onChange,
  onRemove,
  onUp,
  onDown,
}: {
  d: Deduction;
  i: number;
  last: boolean;
  onChange: (patch: Partial<Deduction>) => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_120px_120px_140px_auto] items-center gap-2 rounded-xl border border-border p-2 max-lg:grid-cols-2">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-xs font-medium">
        {i + 1}
      </div>
      <Input
        value={d.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="rounded-lg"
      />
      <Select value={d.type} onValueChange={(v) => onChange({ type: v as "percent" | "fixed" })}>
        <SelectTrigger className="rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="percent">Percentage</SelectItem>
          <SelectItem value="fixed">Fixed Amount</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        step="0.01"
        value={d.value}
        onChange={(e) => onChange({ value: Number(e.target.value) })}
        className="rounded-lg"
        placeholder={d.type === "percent" ? "%" : "amount"}
      />
      <Select value={d.applyTo} onValueChange={(v) => onChange({ applyTo: v as "gross" | "net" })}>
        <SelectTrigger className="rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gross">Apply to Gross</SelectItem>
          <SelectItem value="net">Apply to Net</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onUp} disabled={i === 0}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDown} disabled={last}>
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
