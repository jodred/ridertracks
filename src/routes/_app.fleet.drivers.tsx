import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  FileText,
  Plus,
  Send,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/trackuber/store";
import {
  computeRange,
  formatDateShort,
  formatMoney,
  parseISO,
  todayISO,
} from "@/lib/trackuber/calc";
import type { DateRange, DateRangePreset } from "@/lib/trackuber/types";
import {
  buildDriverRow,
  invoiceHtml,
  printHtml,
  type DriverRow,
  type FleetDriver,
  type FleetEntry,
} from "@/lib/fleet/fleet";
import {
  AppLogo,
  adjustmentLineTotal,
  ensureDefaultEarningSources,
  type AdjustmentType,
  type DriverSourceAssignment,
  type EarningSource,
  type EntryAdjustment,
  type EntryEarning,
} from "@/lib/fleet/settlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      {
        name: "description",
        content: "Driver settlement sheet: gross, cash, VAT, application fee and payout.",
      },
      { property: "og:title", content: "Drivers — RideTracks" },
      {
        property: "og:description",
        content: "Driver settlement sheet with gross, cash, VAT, fees and payout.",
      },
    ],
  }),
  component: DriversLayout,
});

const presets: { key: DateRangePreset; label: string }[] = [
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "allTime", label: "All time" },
];

function DriversLayout() {
  const matches = useMatches();
  const isDriverHistory = matches.some(
    (match) => match.routeId === "/_app/fleet/drivers/$driverId",
  );
  if (isDriverHistory) return <Outlet />;
  return <DriversPage />;
}

function DriversPage() {
  const { user } = useAuth();
  const { state } = useStore();
  const currency = state.fleet.currency;

  const [range, setRange] = useState<DateRange>(() =>
    computeRange("thisWeek", undefined, undefined, 1),
  );
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [entries, setEntries] = useState<FleetEntry[]>([]);
  const [sources, setSources] = useState<EarningSource[]>([]);
  const [driverSources, setDriverSources] = useState<DriverSourceAssignment[]>([]);
  const [entryEarnings, setEntryEarnings] = useState<EntryEarning[]>([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState<AdjustmentType[]>([]);
  const [entryAdjustments, setEntryAdjustments] = useState<EntryAdjustment[]>([]);
  const [grossDriverId, setGrossDriverId] = useState<string | null>(null);
  const [adjustmentDriverId, setAdjustmentDriverId] = useState<string | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [sendingInvoices, setSendingInvoices] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { error: seedError } = await ensureDefaultEarningSources(user.id);
    if (seedError) return toast.error(seedError.message);
    let entryQuery = supabase
      .from("fleet_driver_entries")
      .select("id, driver_id, date, gross, cash, gas_card");
    if (range.preset !== "allTime") {
      entryQuery = entryQuery.gte("date", range.from).lte("date", range.to);
    }
    const [driverResult, entryResult, sourceResult, assignmentResult, adjustmentTypeResult] =
      await Promise.all([
        supabase
          .from("fleet_drivers")
          .select("id, code, name, email, app_fee_override")
          .order("code"),
        entryQuery,
        supabase
          .from("fleet_earning_sources")
          .select("id, fleet_user_id, name, slug, logo_key, is_default, is_active, sort_order")
          .order("sort_order")
          .order("name"),
        supabase.from("fleet_driver_sources").select("fleet_user_id, driver_id, source_id"),
        supabase
          .from("fleet_adjustment_types")
          .select("id, fleet_user_id, name, direction, frequency, default_amount, is_active")
          .order("created_at"),
      ]);
    const error =
      driverResult.error ??
      entryResult.error ??
      sourceResult.error ??
      assignmentResult.error ??
      adjustmentTypeResult.error;
    if (error) return toast.error(error.message);
    const nextEntries = (entryResult.data ?? []) as FleetEntry[];
    setDrivers((driverResult.data ?? []) as FleetDriver[]);
    setEntries(nextEntries);
    setSources((sourceResult.data ?? []) as EarningSource[]);
    setDriverSources((assignmentResult.data ?? []) as DriverSourceAssignment[]);
    setAdjustmentTypes(
      (adjustmentTypeResult.data ?? []).map((item) => ({
        ...item,
        default_amount: Number(item.default_amount),
      })) as AdjustmentType[],
    );
    const entryIds = nextEntries.flatMap((entry) => (entry.id ? [entry.id] : []));
    if (entryIds.length === 0) {
      setEntryEarnings([]);
      setEntryAdjustments([]);
      return;
    }
    const [earningResult, adjustmentResult] = await Promise.all([
      supabase
        .from("fleet_entry_earnings")
        .select("id, fleet_user_id, entry_id, source_id, amount")
        .in("entry_id", entryIds),
      supabase
        .from("fleet_entry_adjustments")
        .select(
          "id, fleet_user_id, entry_id, adjustment_type_id, label, direction, frequency, unit_amount, quantity, note",
        )
        .in("entry_id", entryIds),
    ]);
    if (earningResult.error || adjustmentResult.error)
      return toast.error(
        earningResult.error?.message ??
          adjustmentResult.error?.message ??
          "Could not load settlement details",
      );
    setEntryEarnings(
      (earningResult.data ?? []).map((item) => ({
        ...item,
        amount: Number(item.amount),
      })) as EntryEarning[],
    );
    setEntryAdjustments(
      (adjustmentResult.data ?? []).map((item) => ({
        ...item,
        unit_amount: Number(item.unit_amount),
        quantity: Number(item.quantity),
      })) as EntryAdjustment[],
    );
  }, [user, range.from, range.preset, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      drivers.map((driver) => {
        const entryIds = entries
          .filter((entry) => entry.driver_id === driver.id)
          .flatMap((entry) => (entry.id ? [entry.id] : []));
        const adjustments = entryAdjustments.filter((adjustment) =>
          entryIds.includes(adjustment.entry_id),
        );
        const row = buildDriverRow(
          driver,
          entries,
          state.fleet.deductions,
          state.fleet.weeklyAppFee,
          adjustments,
        );
        row.sourceEarnings = sources
          .filter((source) =>
            entryEarnings.some(
              (earning) => entryIds.includes(earning.entry_id) && earning.source_id === source.id,
            ),
          )
          .map((source) => ({
            sourceId: source.id,
            name: source.name,
            amount: entryEarnings
              .filter(
                (earning) => entryIds.includes(earning.entry_id) && earning.source_id === source.id,
              )
              .reduce((sum, earning) => sum + Number(earning.amount || 0), 0),
          }));
        return row;
      }),
    [
      drivers,
      entries,
      state.fleet.deductions,
      state.fleet.weeklyAppFee,
      entryAdjustments,
      sources,
      entryEarnings,
    ],
  );

  const invoiceRows = useMemo(
    () => rows.filter((row) => entries.some((entry) => entry.driver_id === row.driver.id)),
    [entries, rows],
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
    const { data: saved, error } = await supabase
      .from("fleet_driver_entries")
      .upsert(payload, { onConflict: "driver_id,date" })
      .select("id, driver_id, date, gross, cash, gas_card")
      .single();
    if (error) return toast.error(error.message);
    setEntries((prev) => {
      const next = prev.filter((e) => !(e.driver_id === driverId && e.date === targetDate));
      next.push({
        id: saved.id,
        driver_id: driverId,
        date: targetDate,
        gross: payload.gross,
        cash: payload.cash,
        gas_card: payload.gas_card,
      });
      return next;
    });
  }

  async function ensureTargetEntry(driverId: string) {
    if (!user) return null;
    const existing = entries.find(
      (entry) => entry.driver_id === driverId && entry.date === targetDate,
    );
    const { data, error } = await supabase
      .from("fleet_driver_entries")
      .upsert(
        {
          fleet_user_id: user.id,
          driver_id: driverId,
          date: targetDate,
          gross: Number(existing?.gross ?? 0),
          cash: Number(existing?.cash ?? 0),
          gas_card: Number(existing?.gas_card ?? 0),
        },
        { onConflict: "driver_id,date" },
      )
      .select("id, driver_id, date, gross, cash, gas_card")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    return data;
  }

  async function saveGrossBreakdown(driverId: string, totalsBySource: Record<string, number>) {
    if (!user) return false;
    const targetEntry = await ensureTargetEntry(driverId);
    if (!targetEntry) return false;
    const driverEntryIdsByDate = new Map(
      entries
        .filter((entry) => entry.driver_id === driverId && entry.id)
        .map((entry) => [entry.id!, entry.date]),
    );
    const rowsToSave = Object.entries(totalsBySource).map(([sourceId, requestedTotal]) => {
      const amountOnOtherDays = entryEarnings
        .filter(
          (earning) =>
            earning.source_id === sourceId &&
            earning.entry_id !== targetEntry.id &&
            driverEntryIdsByDate.has(earning.entry_id),
        )
        .reduce((sum, earning) => sum + Number(earning.amount || 0), 0);
      return {
        fleet_user_id: user.id,
        entry_id: targetEntry.id,
        source_id: sourceId,
        amount: Math.max(0, Number(requestedTotal || 0) - amountOnOtherDays),
      };
    });
    if (rowsToSave.length === 0) return false;
    const { error } = await supabase
      .from("fleet_entry_earnings")
      .upsert(rowsToSave, { onConflict: "entry_id,source_id" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Gross earnings breakdown saved");
    await load();
    return true;
  }

  async function saveAdjustments(
    driverId: string,
    drafts: EntryAdjustment[],
    removedIds: string[],
  ) {
    if (!user) return false;
    const targetEntry = await ensureTargetEntry(driverId);
    if (!targetEntry) return false;
    if (removedIds.length > 0) {
      const { error } = await supabase
        .from("fleet_entry_adjustments")
        .delete()
        .in("id", removedIds);
      if (error) {
        toast.error(error.message);
        return false;
      }
    }
    const existing = drafts.filter((draft) => draft.id);
    for (const draft of existing) {
      const { error } = await supabase
        .from("fleet_entry_adjustments")
        .update({
          unit_amount: Math.max(0, draft.unit_amount),
          quantity: Math.max(1, draft.quantity),
          note: draft.note,
        })
        .eq("id", draft.id!);
      if (error) {
        toast.error(error.message);
        return false;
      }
    }
    const additions = drafts.filter((draft) => !draft.id);
    if (additions.length > 0) {
      const { error } = await supabase.from("fleet_entry_adjustments").insert(
        additions.map((draft) => ({
          fleet_user_id: user.id,
          entry_id: targetEntry.id,
          adjustment_type_id: draft.adjustment_type_id,
          label: draft.label,
          direction: draft.direction,
          frequency: draft.frequency,
          unit_amount: Math.max(0, draft.unit_amount),
          quantity: Math.max(1, draft.quantity),
          note: draft.note,
        })),
      );
      if (error) {
        toast.error(error.message);
        return false;
      }
    }
    toast.success("Settlement adjustments saved");
    await load();
    return true;
  }

  async function saveAppFee(driverId: string, weeklyFee: number | null) {
    const { error } = await supabase
      .from("fleet_drivers")
      .update({ app_fee_override: weeklyFee })
      .eq("id", driverId);
    if (error) return toast.error(error.message);
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, app_fee_override: weeklyFee } : d)),
    );
  }

  const opts = { company: state.fleet.fleetName, from: range.from, to: range.to, currency };

  async function sendInvoices() {
    if (invoiceRows.length === 0) return;
    setSendingInvoices(true);
    const { data, error } = await supabase.functions.invoke("send-invoices", {
      body: {
        from: range.from,
        to: range.to,
        invoices: invoiceRows.map((row) => ({
          driverId: row.driver.id,
          html: invoiceHtml(row, opts),
        })),
      },
    });
    setSendingInvoices(false);
    if (error)
      return toast.error(
        "Invoices could not be sent. Check your email configuration and try again.",
      );
    const sent = typeof data?.sent === "number" ? data.sent : 0;
    const omitted = typeof data?.omitted === "number" ? data.omitted : 0;
    if (sent === 0)
      return toast.error("No invoices were sent. Confirm the sender domain is verified in Resend.");
    toast.success(
      `${sent} invoice${sent === 1 ? "" : "s"} sent${omitted ? `; ${omitted} omitted` : ""}`,
    );
    setInvoiceOpen(false);
  }

  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      cash: acc.cash + r.cash,
      gasCard: acc.gasCard + r.gasCard,
      vat: acc.vat + r.vat,
      appFee: acc.appFee + r.appFee,
      netAdjustments: acc.netAdjustments + r.netAdjustments,
      payout: acc.payout + r.payout,
    }),
    { gross: 0, cash: 0, gasCard: 0, vat: 0, appFee: 0, netAdjustments: 0, payout: 0 },
  );

  const grossRow = rows.find((row) => row.driver.id === grossDriverId) ?? null;
  const adjustmentRow = rows.find((row) => row.driver.id === adjustmentDriverId) ?? null;
  const grossSources = grossDriverId
    ? sources.filter((source) =>
        driverSources.some(
          (assignment) =>
            assignment.driver_id === grossDriverId && assignment.source_id === source.id,
        ),
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fleet Partner
          </div>
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
            <table className="w-full min-w-[1040px] text-sm">
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
                  <Th right>Adjustments</Th>
                  <Th right>Payout</Th>
                  <Th right> </Th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">
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
                      <Button
                        variant="outline"
                        className="h-auto min-w-28 flex-col items-end gap-1 rounded-lg px-3 py-2"
                        onClick={() => setGrossDriverId(r.driver.id)}
                      >
                        <span className="tabular-nums">{formatMoney(r.gross, currency)}</span>
                        <span className="flex items-center gap-1 text-[11px] font-normal text-muted-foreground">
                          {r.sourceEarnings.length > 0
                            ? `${r.sourceEarnings.length} app${r.sourceEarnings.length === 1 ? "" : "s"}`
                            : "Add breakdown"}
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      </Button>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell
                        value={r.cash}
                        onCommit={(v) => saveCell(r.driver.id, "cash", v)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell
                        value={r.gasCard}
                        onCommit={(v) => saveCell(r.driver.id, "gas_card", v)}
                      />
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatMoney(r.vat, currency)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <NumberCell
                        muted
                        title={`${formatMoney(r.driver.app_fee_override ?? state.fleet.weeklyAppFee, currency)} / week × ${r.weeks} week(s) — click to override`}
                        value={r.driver.app_fee_override ?? state.fleet.weeklyAppFee}
                        onCommit={(v) => saveAppFee(r.driver.id, v)}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="outline"
                        className="h-9 min-w-24 justify-end rounded-lg tabular-nums"
                        onClick={() => setAdjustmentDriverId(r.driver.id)}
                        title="Add or edit payout adjustments"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {r.netAdjustments > 0 ? "+" : ""}
                        {formatMoney(r.netAdjustments, currency)}
                      </Button>
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
                          onClick={() =>
                            printHtml(
                              invoiceHtml(r, opts),
                              `invoice_${r.driver.code}_${range.from}_${range.to}.html`,
                            )
                          }
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
                    <td className="px-4 py-3" colSpan={3}>
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.gross, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.cash, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.gasCard, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.vat, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.appFee, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totals.netAdjustments > 0 ? "+" : ""}
                      {formatMoney(totals.netAdjustments, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.payout, currency)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Payout = Gross − Application fee − Cash − VAT − Gas card + additions − extra deductions. The
        application fee is charged once per week (Monday–Sunday), VAT uses your fleet commission
        from Settings, and values apply to the selected period.
      </p>

      <GrossBreakdownDialog
        open={Boolean(grossRow)}
        row={grossRow}
        sources={grossSources}
        currency={currency}
        range={range}
        onOpenChange={(open) => {
          if (!open) setGrossDriverId(null);
        }}
        onSave={async (values) => {
          if (!grossRow) return;
          if (await saveGrossBreakdown(grossRow.driver.id, values)) setGrossDriverId(null);
        }}
      />

      <AdjustmentsDialog
        open={Boolean(adjustmentRow)}
        row={adjustmentRow}
        types={adjustmentTypes.filter((type) => type.is_active)}
        userId={user?.id ?? ""}
        currency={currency}
        onOpenChange={(open) => {
          if (!open) setAdjustmentDriverId(null);
        }}
        onSave={async (drafts, removedIds) => {
          if (!adjustmentRow) return;
          if (await saveAdjustments(adjustmentRow.driver.id, drafts, removedIds))
            setAdjustmentDriverId(null);
        }}
      />

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invoices</DialogTitle>
            <DialogDescription>
              Emailing {invoiceRows.length} driver{invoiceRows.length === 1 ? "" : "s"} with entries
              from {formatDateShort(range.from)} → {formatDateShort(range.to)}. Drivers without
              entries are omitted.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-56 space-y-1 overflow-y-auto text-sm">
            {invoiceRows.map((r) => (
              <div
                key={r.driver.id}
                className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2"
              >
                <span>
                  {r.driver.name} · {r.driver.code}
                </span>
                <span className="text-muted-foreground">{r.driver.email}</span>
              </div>
            ))}
          </div>
          {invoiceRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No drivers have entries in this date range.
            </p>
          )}
          <DialogFooter>
            <Button
              className="rounded-xl"
              onClick={sendInvoices}
              disabled={invoiceRows.length === 0 || sendingInvoices}
            >
              <Send className="h-4 w-4" /> {sendingInvoices ? "Sending…" : "Send invoices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GrossBreakdownDialog({
  open,
  row,
  sources,
  currency,
  range,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  row: DriverRow | null;
  sources: EarningSource[];
  currency: string;
  range: DateRange;
  onOpenChange: (open: boolean) => void;
  onSave: (values: Record<string, number>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setValues(
      Object.fromEntries(
        sources.map((source) => [
          source.id,
          String(row.sourceEarnings.find((earning) => earning.sourceId === source.id)?.amount ?? 0),
        ]),
      ),
    );
  }, [open, row, sources]);

  const total = sources.reduce(
    (sum, source) => sum + Math.max(0, Number(values[source.id]) || 0),
    0,
  );
  const hasAllocatedEarnings = row?.sourceEarnings.some((source) => source.amount > 0) ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gross earnings · {row?.driver.name ?? "Driver"}</DialogTitle>
          <DialogDescription>
            {formatDateShort(range.from)} → {formatDateShort(range.to)}. Only apps assigned to this
            driver appear here.
          </DialogDescription>
        </DialogHeader>
        {row && row.gross > 0 && !hasAllocatedEarnings && (
          <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            The existing {formatMoney(row.gross, currency)} is legacy unallocated gross. Saving this
            form replaces it with the app breakdown below.
          </div>
        )}
        {sources.length === 0 ? (
          <div className="rounded-xl bg-secondary p-4 text-sm text-muted-foreground">
            No earning apps are assigned to this driver. Assign apps in Settings → Manage drivers
            first.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => (
              <label
                key={source.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3"
              >
                <AppLogo source={source} />
                <span className="min-w-0 flex-1 text-sm font-medium">{source.name}</span>
                <div className="relative w-36">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={values[source.id] ?? "0"}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [source.id]: event.target.value }))
                    }
                    className="rounded-xl pr-9 text-right tabular-nums"
                    aria-label={`${source.name} gross earnings`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {currency}
                  </span>
                </div>
              </label>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="font-medium">Gross earnings total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(total, currency)}
              </span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={sources.length === 0 || saving}
            onClick={async () => {
              setSaving(true);
              await onSave(
                Object.fromEntries(
                  sources.map((source) => [source.id, Math.max(0, Number(values[source.id]) || 0)]),
                ),
              );
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save breakdown"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustmentsDialog({
  open,
  row,
  types,
  userId,
  currency,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  row: DriverRow | null;
  types: AdjustmentType[];
  userId: string;
  currency: string;
  onOpenChange: (open: boolean) => void;
  onSave: (drafts: EntryAdjustment[], removedIds: string[]) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<EntryAdjustment[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setDrafts(row.adjustments.map((adjustment) => ({ ...adjustment })));
    setRemovedIds([]);
    setSelectedTypeId(types[0]?.id ?? "");
  }, [open, row, types]);

  function patchDraft(index: number, patch: Partial<EntryAdjustment>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...patch } : draft)),
    );
  }

  function addAdjustment() {
    const type = types.find((item) => item.id === selectedTypeId);
    if (!type || !row) return;
    setDrafts((current) => [
      ...current,
      {
        fleet_user_id: userId,
        entry_id: "",
        adjustment_type_id: type.id,
        label: type.name,
        direction: type.direction,
        frequency: type.frequency,
        unit_amount: Number(type.default_amount || 0),
        quantity: type.frequency === "weekly" ? Math.max(1, row.weeks) : 1,
        note: null,
      },
    ]);
  }

  const netTotal = drafts.reduce(
    (sum, draft) => sum + adjustmentLineTotal(draft) * (draft.direction === "addition" ? 1 : -1),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settlement adjustments · {row?.driver.name ?? "Driver"}</DialogTitle>
          <DialogDescription>
            Additions and deductions affect payout only. Gross earnings and VAT remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="Choose an adjustment" />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name} · {type.direction === "addition" ? "Addition" : "Deduction"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={addAdjustment}
            disabled={!selectedTypeId}
          >
            <Plus className="h-4 w-4" /> Add adjustment
          </Button>
        </div>
        {types.length === 0 && (
          <div className="rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
            Create adjustment types in Settings first.
          </div>
        )}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {drafts.map((draft, index) => (
            <div
              key={draft.id ?? `${draft.adjustment_type_id}-${index}`}
              className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_120px_80px_auto] sm:items-end"
            >
              <div className="space-y-1">
                <Label>{draft.label}</Label>
                <Input
                  value={draft.note ?? ""}
                  maxLength={500}
                  placeholder="Optional note"
                  onChange={(event) => patchDraft(index, { note: event.target.value || null })}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label>{draft.direction === "addition" ? "Addition" : "Deduction"}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.unit_amount}
                  onChange={(event) =>
                    patchDraft(index, { unit_amount: Math.max(0, Number(event.target.value) || 0) })
                  }
                  className="rounded-lg text-right"
                />
              </div>
              <div className="space-y-1">
                <Label>{draft.frequency === "weekly" ? "Weeks" : "Qty"}</Label>
                <Input
                  type="number"
                  min="1"
                  max="366"
                  value={draft.quantity}
                  onChange={(event) =>
                    patchDraft(index, {
                      quantity: Math.max(1, Math.min(366, Number(event.target.value) || 1)),
                    })
                  }
                  className="rounded-lg text-right"
                  disabled={draft.frequency === "one_time"}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${draft.label}`}
                onClick={() => {
                  if (draft.id) setRemovedIds((current) => [...current, draft.id!]);
                  setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="font-medium">Net payout adjustment</span>
          <span
            className={`text-lg font-semibold tabular-nums ${netTotal < 0 ? "text-destructive" : "text-primary"}`}
          >
            {netTotal > 0 ? "+" : ""}
            {formatMoney(netTotal, currency)}
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(drafts, removedIds);
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save adjustments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    range.preset === "allTime"
      ? "All time"
      : range.preset === "custom"
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
