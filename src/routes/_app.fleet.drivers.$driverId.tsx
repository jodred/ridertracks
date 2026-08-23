import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, CalendarDays, ChevronDown, Pencil, Plus, Save } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { FleetDriver, FleetEntry } from "@/lib/fleet/fleet";
import { computeRange, formatDateShort, parseISO, todayISO } from "@/lib/trackuber/calc";
import type { DateRange, DateRangePreset } from "@/lib/trackuber/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/_app/fleet/drivers/$driverId")({
  head: () => ({
    meta: [
      { title: "Driver history — RideTracks" },
      { name: "description", content: "View and correct date-stamped driver settlement entries." },
    ],
  }),
  component: DriverHistoryPage,
});

type EntryDraft = Pick<
  FleetEntry,
  "id" | "date" | "gross" | "cash" | "gas_card" | "created_at" | "updated_at"
>;

const presets: { key: DateRangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
];

function DriverHistoryPage() {
  const { driverId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<FleetDriver | null>(null);
  const [entries, setEntries] = useState<EntryDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);
  const [range, setRange] = useState<DateRange>(() => computeRange("thisWeek", undefined, undefined, 1));

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: driverData, error: driverError }, { data: entryData, error: entryError }] =
      await Promise.all([
        supabase
          .from("fleet_drivers")
          .select("id, code, name, email, app_fee_override")
          .eq("id", driverId)
          .maybeSingle(),
        supabase
          .from("fleet_driver_entries")
          .select("id, date, gross, cash, gas_card, created_at, updated_at")
          .eq("driver_id", driverId)
          .gte("date", range.from)
          .lte("date", range.to)
          .order("date", { ascending: false }),
      ]);
    setLoading(false);
    if (driverError || entryError)
      return toast.error(
        driverError?.message ?? entryError?.message ?? "Could not load driver history",
      );
    if (!driverData) {
      toast.error("Driver not found");
      navigate({ to: "/fleet/drivers" });
      return;
    }
    setDriver(driverData as FleetDriver);
    setEntries(
      (entryData ?? []).map((entry) => ({
        ...entry,
        gross: Number(entry.gross),
        cash: Number(entry.cash),
        gas_card: Number(entry.gas_card),
      })) as EntryDraft[],
    );
  }, [driverId, navigate, range.from, range.to, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEntry(entry: EntryDraft) {
    if (!entry.id) return;
    const { error } = await supabase
      .from("fleet_driver_entries")
      .update({
        gross: safeNumber(entry.gross),
        cash: safeNumber(entry.cash),
        gas_card: safeNumber(entry.gas_card),
      })
      .eq("id", entry.id);
    if (error) return toast.error(error.message);
    toast.success(`${formatDateShort(entry.date)} updated`);
    await load();
  }

  async function addEntry() {
    if (!user || !newDate) return;
    setAdding(true);
    const { error } = await supabase.from("fleet_driver_entries").upsert(
      {
        fleet_user_id: user.id,
        driver_id: driverId,
        date: newDate,
        gross: 0,
        cash: 0,
        gas_card: 0,
      },
      { onConflict: "driver_id,date" },
    );
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success(`Entry for ${formatDateShort(newDate)} is ready to edit`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/fleet/drivers"
            className="mb-3 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to drivers
          </Link>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Driver history
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {driver?.name ?? "Driver"}
          </h1>
          {driver && (
            <p className="mt-1 text-sm text-muted-foreground">
              {driver.code} · {driver.email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePicker range={range} onChange={setRange} />
          <Input
            aria-label="Entry date"
            type="date"
            max={todayISO()}
            value={newDate}
            onChange={(event) => setNewDate(event.target.value)}
            className="h-10 w-auto rounded-xl"
          />
          <Button className="rounded-xl" onClick={addEntry} disabled={adding || !driver}>
            <Plus className="h-4 w-4" /> Add date
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-0">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center gap-2 font-medium">
              <CalendarDays className="h-4 w-4 text-primary" /> Settlement entry history
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Showing {formatDateShort(range.from)} to {formatDateShort(range.to)}. Change a value, then save that row.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Entry date</th>
                  <th className="px-3 py-3 text-right font-medium">Gross earning</th>
                  <th className="px-3 py-3 text-right font-medium">Cash</th>
                  <th className="px-3 py-3 text-right font-medium">Gas card</th>
                  <th className="px-5 py-3 font-medium">Last updated</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading && entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-muted-foreground">
                      No entries in this date range.
                    </td>
                  </tr>
                )}
                {entries.map((entry) => (
                  <EntryHistoryRow key={entry.id} entry={entry} onSave={saveEntry} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Pencil className="mr-1 inline h-3.5 w-3.5" /> History is available only to the Fleet
        Partner who owns this driver.
      </p>
    </div>
  );
}

function RangePicker({ range, onChange }: { range: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DayPickerRange | undefined>({
    from: parseISO(range.from),
    to: parseISO(range.to),
  });

  useEffect(() => {
    setSelected({ from: parseISO(range.from), to: parseISO(range.to) });
  }, [range.from, range.to]);

  const label =
    range.preset === "custom"
      ? `${formatDateShort(range.from)} → ${formatDateShort(range.to)}`
      : (presets.find((preset) => preset.key === range.preset)?.label ?? "Date range");

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setSelected(undefined);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl">
          <CalendarIcon className="h-4 w-4" />
          <span>{label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="mb-3 grid grid-cols-2 gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.key}
              size="sm"
              variant={range.preset === preset.key ? "default" : "ghost"}
              className="justify-start rounded-lg"
              onClick={() => {
                onChange(computeRange(preset.key, undefined, undefined, 1));
                setOpen(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Custom range</div>
          <Calendar
            mode="range"
            weekStartsOn={1}
            selected={selected}
            onSelect={(selection) => {
              setSelected(selection);
              if (!selection?.from || !selection.to) return;
              const from = todayISO(selection.from);
              const to = todayISO(selection.to);
              onChange({ preset: "custom", from: from <= to ? from : to, to: from <= to ? to : from });
              setOpen(false);
            }}
          />
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Select a start date, then an end date to apply a custom range.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EntryHistoryRow({
  entry,
  onSave,
}: {
  entry: EntryDraft;
  onSave: (entry: EntryDraft) => Promise<void>;
}) {
  const [gross, setGross] = useState(String(entry.gross));
  const [cash, setCash] = useState(String(entry.cash));
  const [gasCard, setGasCard] = useState(String(entry.gas_card));

  useEffect(() => {
    setGross(String(entry.gross));
    setCash(String(entry.cash));
    setGasCard(String(entry.gas_card));
  }, [entry]);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-5 py-3 font-medium">{formatDateShort(entry.date)}</td>
      <td className="px-3 py-2 text-right">
        <AmountInput value={gross} onChange={setGross} />
      </td>
      <td className="px-3 py-2 text-right">
        <AmountInput value={cash} onChange={setCash} />
      </td>
      <td className="px-3 py-2 text-right">
        <AmountInput value={gasCard} onChange={setGasCard} />
      </td>
      <td className="px-5 py-3 text-xs text-muted-foreground">
        {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : "—"}
      </td>
      <td className="px-5 py-2 text-right">
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() =>
            onSave({
              ...entry,
              gross: safeNumber(gross),
              cash: safeNumber(cash),
              gas_card: safeNumber(gasCard),
            })
          }
        >
          <Save className="h-4 w-4" /> Save
        </Button>
      </td>
    </tr>
  );
}

function AmountInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      inputMode="decimal"
      className="ml-auto h-9 w-28 rounded-lg text-right tabular-nums"
      value={value}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function safeNumber(value: string | number) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
