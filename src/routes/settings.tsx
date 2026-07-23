import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Sun, Moon, Download, Upload } from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { applyDeductions, formatMoney } from "../lib/trackuber/calc";
import type { Deduction } from "../lib/trackuber/types";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TrackUber" },
      { name: "description", content: "Configure your fleet commission rules, weekly app fee, expense categories, and appearance." },
      { property: "og:title", content: "Settings — TrackUber" },
      { property: "og:description", content: "Configure fleet commission rules, weekly app fee, categories, and appearance." },
    ],
  }),
  component: SettingsPage,
});

function uid() { return Math.random().toString(36).slice(2, 10); }

function SettingsPage() {
  const { state, updateFleet, addDeduction, updateDeduction, removeDeduction, reorderDeductions, addCategory, removeCategory, updateProfile, exportData, importData } = useStore();
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
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Configuration</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      </div>

      {/* Fleet Settings */}
      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Fleet Settings</div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fleet Name</Label>
              <Input value={fleet.fleetName} onChange={(e) => updateFleet({ fleetName: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Weekly App Fee</Label>
              <Input type="number" step="0.01" value={fleet.weeklyAppFee} onChange={(e) => updateFleet({ weeklyAppFee: Number(e.target.value) })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={fleet.currency} onChange={(e) => updateFleet({ currency: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>First Day of Week</Label>
              <Select value={String(fleet.firstDayOfWeek)} onValueChange={(v) => updateFleet({ firstDayOfWeek: Number(v) as 0 | 1 })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fleet Deductions */}
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
              onClick={() => addDeduction({ id: uid(), name: "New Deduction", type: "percent", value: 0, applyTo: "gross" })}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {fleet.deductions.length === 0 ? (
            <div className="grid place-items-center rounded-xl bg-secondary/50 py-8 text-sm text-muted-foreground">No deductions configured</div>
          ) : (
            <div className="space-y-2">
              {fleet.deductions.map((d, i) => (
                <DeductionRow key={d.id} d={d} i={i} last={i === fleet.deductions.length - 1}
                  onChange={(patch) => updateDeduction(d.id, patch)}
                  onRemove={() => removeDeduction(d.id)}
                  onUp={() => move(d.id, -1)}
                  onDown={() => move(d.id, 1)}
                />
              ))}
            </div>
          )}

          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="text-xs font-medium text-muted-foreground">Effective deduction rate</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{effectiveRate.toFixed(2)}%</div>
            <div className="mt-1 text-xs text-muted-foreground">
              On sample {formatMoney(sample, fleet.currency)}: −{formatMoney(sampleRes.total, fleet.currency)} → keep {formatMoney(sampleRes.net, fleet.currency)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Expense Categories</div>
          <div className="flex flex-wrap gap-2">
            {fleet.categories.map((c) => (
              <div key={c} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
                {c}
                <button onClick={() => removeCategory(c)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="e.g. Parking, Car Wash" className="rounded-full" />
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

      {/* Appearance */}
      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="space-y-4 p-5">
          <div className="text-sm font-semibold">Appearance</div>
          <div className="flex gap-2">
            <Button variant={state.profile.theme === "light" ? "default" : "outline"} className="rounded-full" onClick={() => updateProfile({ theme: "light" })}>
              <Sun className="mr-1 h-4 w-4" /> Light
            </Button>
            <Button variant={state.profile.theme === "dark" ? "default" : "outline"} className="rounded-full" onClick={() => updateProfile({ theme: "dark" })}>
              <Moon className="mr-1 h-4 w-4" /> Dark
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup */}
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
                a.download = `trackuber_backup_${new Date().toISOString().slice(0, 10)}.json`;
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

function DeductionRow({ d, i, last, onChange, onRemove, onUp, onDown }: {
  d: Deduction; i: number; last: boolean;
  onChange: (patch: Partial<Deduction>) => void;
  onRemove: () => void; onUp: () => void; onDown: () => void;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_120px_120px_140px_auto] items-center gap-2 rounded-xl border border-border p-2 max-lg:grid-cols-2">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-secondary text-xs font-medium">{i + 1}</div>
      <Input value={d.name} onChange={(e) => onChange({ name: e.target.value })} className="rounded-lg" />
      <Select value={d.type} onValueChange={(v) => onChange({ type: v as "percent" | "fixed" })}>
        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="percent">Percentage</SelectItem>
          <SelectItem value="fixed">Fixed Amount</SelectItem>
        </SelectContent>
      </Select>
      <Input type="number" step="0.01" value={d.value} onChange={(e) => onChange({ value: Number(e.target.value) })} className="rounded-lg" placeholder={d.type === "percent" ? "%" : "amount"} />
      <Select value={d.applyTo} onValueChange={(v) => onChange({ applyTo: v as "gross" | "net" })}>
        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="gross">Apply to Gross</SelectItem>
          <SelectItem value="net">Apply to Net</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={onUp} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onDown} disabled={last}><ArrowDown className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onRemove} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}