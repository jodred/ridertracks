import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, ChevronDown, FileText, Send, UserPlus } from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/trackuber/store";
import { computeRange, formatDateShort, formatMoney, parseISO, todayISO } from "@/lib/trackuber/calc";
import type { DateRange, DateRangePreset } from "@/lib/trackuber/types";
import { buildDriverRow, invoiceHtml, printHtml, type FleetDriver, type FleetEntry } from "@/lib/fleet/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/fleet/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — RideTracks" },
      { name: "description", content: "Driver settlement sheet: gross, cash, VAT, application fee and payout." },
      { property: "og:title", content: "Drivers — RideTracks" },
      { property: "og:description", content: "Driver settlement sheet with gross, cash, VAT, fees and payout." },
    ],
  }),
  component: DriversLayout,
});

const presets: { key: DateRangePreset; label: string }[] = [
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
];

function DriversLayout() {
  const matches = useMatches();
  const isDriverHistory = matches.some((match) => match.routeId === "/_app/fleet/drivers/$driverId");
  if (isDriverHistory) return <Outlet />;
  return <DriversPage />;
}

function DriversPage() {
  const { user } = useAuth();
  const { state } = useStore();
  const currency = state.fleet.currency;

  const [range, setRange] = useState<DateRange>(() => computeRange("thisWeek", undefined, undefined, 1));
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [entries, setEntries] = useState<FleetEntry[]>([]);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: d } = await supabase
      .from("fleet_drivers")
      .select("id, code, name, email, app_fee_override")
      .order("code");
    setDrivers((d ?? []) as FleetDriver[]);
    const { data: e } = await supabase
      .from("fleet_driver_entries")
      .select("driver_id, date, gross, cash, gas_card")
      .gte("date", range.from)
      .lte("date", range.to);
    setEntries((e ?? []) as FleetEntry[]);
  }, [user, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () => drivers.map((d) => buildDriverRow(d, entries, state.fleet.deductions, state.fleet.weeklyAppFee)),
    [drivers, entries, state.fleet.deductions, state.fleet.weeklyAppFee],
  );

  // The value typed in a cell is the total for the selected period; it is written
  // onto the last day of the period (never in the future) after removing the
  // amounts already recorded on the other days of that period.
  const targetDate = useMemo(() => {
    const today = todayISO();
    const clamped = range.to > today ? today : range.to;
    return clamped < range.from ? range.from : clamped;
  }, [range.from, range.to]);

  async function saveCell(driverId: string, field: "gross" | "cash" | "gas_card", total: number) {
    if (!user) return;
    const mine = entries.filter((e) => e.driver_id === driverId);
    const others = mine
      .filter((e) => e.date !== targetDate)
      .reduce((s, e) => s + Number(e[field] || 0), 0);
    const existing = mine.find((e) => e.date === targetDate);
    const value = Math.max(0, total - others);
    const payload = {
      fleet_user_id: user.id,
      driver_id: driverId,
      date: targetDate,
      gross: field === "gross" ? value : Number(existing?.gross ?? 0),
      cash: field === "cash" ? value : Number(existing?.cash ?? 0),
      gas_card: field === "gas_card" ? value : Number(existing?.gas_card ?? 0),
    };
    const { error } = await supabase.from("fleet_driver_entries").upsert(payload, { onConflict: "driver_id,date" });
    if (error) return toast.error(error.message);
    setEntries((prev) => {
      const next = prev.filter((e) => !(e.driver_id === driverId && e.date === targetDate));
      next.push({
        driver_id: driverId,
        date: targetDate,
        gross: payload.gross,
        cash: payload.cash,
        gas_card: payload.gas_card,
      });
      return next;
    });
  }

  async function saveAppFee(driverId: string, weeklyFee: number | null) {
    const { error } = await supabase
      .from("fleet_drivers")
      .update({ app_fee_override: weeklyFee })
      .eq("id", driverId);
    if (error) return toast.error(error.message);
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, app_fee_override: weeklyFee } : d)));
  }

  const opts = { company: state.fleet.fleetName, from: range.from, to: range.to, currency };

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      cash: acc.cash + r.cash,
      gasCard: acc.gasCard + r.gasCard,
      vat: acc.vat + r.vat,
      appFee: acc.appFee + r.appFee,
      payout: acc.payout + r.payout,
    }),
    { gross: 0, cash: 0, gasCard: 0, vat: 0, appFee: 0, payout: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fleet Partner</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Drivers</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setInvoiceOpen(true)}>
            <Send className="h-4 w-4" /> Send invoice
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/fleet/add-driver">
              <UserPlus className="h-4 w-4" /> Add driver
            </Link>
          </Button>
          <RangePicker range={range} onChange={setRange} />
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <Th>ID</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th right>Gross earning</Th>
                  <Th right>Cash</Th>
                  <Th right>Gas card</Th>
                  <Th right>VAT</Th>
                  <Th right>Application fee</Th>
                  <Th right>Payout</Th>
                  <Th right> </Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">
                      No drivers yet — add your first driver to start tracking payouts.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.driver.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium">{r.driver.code}</td>
                    <td className="px-4 py-2">
                      <Link
                        to="/fleet/drivers/$driverId"
                        params={{ driverId: r.driver.id }}
                        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {r.driver.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.driver.email}</td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell value={r.gross} onCommit={(v) => saveCell(r.driver.id, "gross", v)} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell value={r.cash} onCommit={(v) => saveCell(r.driver.id, "cash", v)} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell value={r.gasCard} onCommit={(v) => saveCell(r.driver.id, "gas_card", v)} />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.vat, currency)}</td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell
                        muted
                        title={`${formatMoney(r.driver.app_fee_override ?? state.fleet.weeklyAppFee, currency)} / week × ${r.weeks} week(s) — click to override`}
                        value={r.driver.app_fee_override ?? state.fleet.weeklyAppFee}
                        onCommit={(v) => saveAppFee(r.driver.id, v)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatMoney(r.payout, currency)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Invoice PDF"
                          onClick={() => printHtml(invoiceHtml(r, opts), `invoice_${r.driver.code}_${range.from}_${range.to}.html`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-secondary/50 text-sm font-semibold">
                    <td className="px-4 py-3" colSpan={3}>Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.gross, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.cash, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.gasCard, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.vat, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.appFee, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.payout, currency)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Payout = Gross − Application fee − Cash − VAT − Gas card. The application fee is charged once per week (Monday–Sunday) and
        VAT uses your fleet commission from Settings. Values you type apply to the selected period.
      </p>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invoices</DialogTitle>
            <DialogDescription>
              One invoice per driver for {formatDateShort(range.from)} → {formatDateShort(range.to)}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {rows.map((r) => (
              <div key={r.driver.id} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
                <span>{r.driver.name} · {r.driver.code}</span>
                <span className="text-muted-foreground">{r.driver.email}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Email delivery needs a verified sender domain for your fleet. Until that is set up, generate each driver's
            invoice PDF here and attach it to your own email.
          </p>
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={() => {
                rows.forEach((r, i) =>
                  setTimeout(
                    () => printHtml(invoiceHtml(r, opts), `invoice_${r.driver.code}_${range.from}_${range.to}.html`),
                    i * 800,
                  ),
                );
                setInvoiceOpen(false);
              }}
              disabled={rows.length === 0}
            >
              <FileText className="h-4 w-4" /> Generate all invoices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 font-medium ${right ? "text-right" : ""}`}>{children}</th>;
}

function NumberCell({
  value,
  onCommit,
  muted,
  title,
}: {
  value: number;
  onCommit: (v: number) => void;
  muted?: boolean;
  title?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      title={title}
      inputMode="decimal"
      className={`h-9 w-28 rounded-lg text-right tabular-nums ${muted && draft === null ? "border-transparent bg-secondary text-muted-foreground" : ""}`}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => {
        if (draft !== null) {
          const n = Number(draft.replace(",", "."));
          if (!Number.isNaN(n)) onCommit(n);
          setDraft(null);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

function RangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DayPickerRange | undefined>({
    from: parseISO(range.from),
    to: parseISO(range.to),
  });
  const [startDate, setStartDate] = useState<Date>();

  useEffect(() => {
    setSelected({ from: parseISO(range.from), to: parseISO(range.to) });
  }, [range.from, range.to]);

  const label =
    range.preset === "custom"
      ? range.from === range.to
        ? formatDateShort(range.from)
        : `${formatDateShort(range.from)} → ${formatDateShort(range.to)}`
      : (presets.find((p) => p.key === range.preset)?.label ?? "Range");

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setSelected(undefined);
          setStartDate(undefined);
        }
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
          {presets.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={range.preset === p.key ? "default" : "ghost"}
              className="justify-start rounded-lg"
              onClick={() => {
                onChange(computeRange(p.key, undefined, undefined, 1));
                setOpen(false);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Custom</div>
          <Calendar
            mode="range"
            weekStartsOn={1}
            selected={selected}
            onDayClick={(day) => {
              if (!startDate) {
                setStartDate(day);
                setSelected({ from: day, to: undefined });
                return;
              }
              const fromDate = startDate <= day ? startDate : day;
              const toDate = startDate <= day ? day : startDate;
              setSelected({ from: fromDate, to: toDate });
              const from = todayISO(fromDate);
              const to = todayISO(toDate);
              onChange({ preset: "custom", from, to });
              setStartDate(undefined);
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
