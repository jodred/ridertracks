import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileClock, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/trackuber/store";
import { computeRange, formatMoney } from "@/lib/trackuber/calc";
import { buildDriverRow, type FleetDriver, type FleetEntry } from "@/lib/fleet/fleet";
import type { EntryAdjustment, EntryEarning, EarningSource } from "@/lib/fleet/settlements";
import {
  ARRANGEMENT_LABELS,
  calculatePolishSettlement,
  defaultDriverTaxProfile,
  documentTypeFor,
  makeDocumentNumber,
  polishDocumentHtml,
  printPolishDocument,
  type DriverTaxProfile,
  type FleetTaxProfile,
} from "@/lib/fleet/polishTax";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/fleet/reports")({
  head: () => ({
    meta: [
      { title: "Fleet reports — RideTracks" },
      {
        name: "description",
        content: "Generate payroll, mandate and B2B fleet settlement documents.",
      },
    ],
  }),
  component: FleetReportsPage,
});

type HistoryItem = {
  id: string;
  driver_id: string;
  document_number: string;
  document_type: string;
  period_from: string;
  period_to: string;
  generated_at: string;
};

const documentLabels: Record<string, string> = {
  payroll: "Payroll slip",
  mandate_statement: "Mandate statement",
  b2b_statement: "B2B settlement",
};

function FleetReportsPage() {
  const { user } = useAuth();
  const { state } = useStore();
  const initialRange = useMemo(() => computeRange("thisWeek", undefined, undefined, 1), []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [entries, setEntries] = useState<FleetEntry[]>([]);
  const [sources, setSources] = useState<EarningSource[]>([]);
  const [earnings, setEarnings] = useState<EntryEarning[]>([]);
  const [adjustments, setAdjustments] = useState<EntryAdjustment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, DriverTaxProfile>>({});
  const [company, setCompany] = useState<FleetTaxProfile | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [busyDriver, setBusyDriver] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [driverResult, entryResult, sourceResult, profileResult, companyResult, historyResult] =
      await Promise.all([
        supabase
          .from("fleet_drivers")
          .select("id, code, name, email, app_fee_override")
          .order("code"),
        supabase
          .from("fleet_driver_entries")
          .select("id, driver_id, date, gross, cash, gas_card")
          .gte("date", from)
          .lte("date", to),
        supabase
          .from("fleet_earning_sources")
          .select("id, fleet_user_id, name, slug, logo_key, is_default, is_active, sort_order"),
        supabase
          .from("fleet_driver_tax_profiles")
          .select(
            "driver_id, fleet_user_id, arrangement, pesel, nip, address_line, postal_code, city, tax_resident, under_26, apply_social_insurance, apply_sickness_insurance, pension_rate, disability_rate, sickness_rate, health_rate, income_cost_type, custom_income_cost, pit_rate, pit2_reduction, ppk_rate, vat_rate, vat_exempt, self_billing",
          ),
        supabase
          .from("fleet_tax_profiles")
          .select(
            "fleet_user_id, legal_name, nip, regon, address_line, postal_code, city, tax_office, bank_account, document_prefix",
          )
          .maybeSingle(),
        supabase
          .from("fleet_generated_documents")
          .select(
            "id, driver_id, document_number, document_type, period_from, period_to, generated_at",
          )
          .order("generated_at", { ascending: false })
          .limit(50),
      ]);
    const error =
      driverResult.error ??
      entryResult.error ??
      sourceResult.error ??
      profileResult.error ??
      companyResult.error ??
      historyResult.error;
    if (error) return toast.error(error.message);

    const nextDrivers = (driverResult.data ?? []) as FleetDriver[];
    const nextEntries = (entryResult.data ?? []) as FleetEntry[];
    setDrivers(nextDrivers);
    setEntries(nextEntries);
    setSources((sourceResult.data ?? []) as EarningSource[]);
    setCompany(companyResult.data as FleetTaxProfile | null);
    setHistory((historyResult.data ?? []) as HistoryItem[]);
    const profileMap: Record<string, DriverTaxProfile> = {};
    for (const driver of nextDrivers) {
      const saved = profileResult.data?.find((item) => item.driver_id === driver.id);
      profileMap[driver.id] = saved
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
    setProfiles(profileMap);

    const entryIds = nextEntries.flatMap((entry) => (entry.id ? [entry.id] : []));
    if (entryIds.length === 0) {
      setEarnings([]);
      setAdjustments([]);
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
        earningResult.error?.message ?? adjustmentResult.error?.message ?? "Could not load data",
      );
    setEarnings(
      (earningResult.data ?? []).map((item) => ({
        ...item,
        amount: Number(item.amount),
      })) as EntryEarning[],
    );
    setAdjustments(
      (adjustmentResult.data ?? []).map((item) => ({
        ...item,
        unit_amount: Number(item.unit_amount),
        quantity: Number(item.quantity),
      })) as EntryAdjustment[],
    );
  }, [from, to, user]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      drivers.map((driver) => {
        const entryIds = entries
          .filter((entry) => entry.driver_id === driver.id)
          .flatMap((entry) => (entry.id ? [entry.id] : []));
        const row = buildDriverRow(
          driver,
          entries,
          state.fleet.deductions,
          state.fleet.weeklyAppFee,
          adjustments.filter((adjustment) => entryIds.includes(adjustment.entry_id)),
        );
        row.sourceEarnings = sources
          .map((source) => ({
            sourceId: source.id,
            name: source.name,
            amount: earnings
              .filter(
                (earning) => entryIds.includes(earning.entry_id) && earning.source_id === source.id,
              )
              .reduce((sum, earning) => sum + Number(earning.amount), 0),
          }))
          .filter((source) => source.amount > 0);
        return row;
      }),
    [
      adjustments,
      drivers,
      earnings,
      entries,
      sources,
      state.fleet.deductions,
      state.fleet.weeklyAppFee,
    ],
  );

  async function generate(driverId: string) {
    if (!user) return;
    if (from > to) return toast.error("The report start date must be before the end date");
    const row = rows.find((item) => item.driver.id === driverId);
    const profile = profiles[driverId];
    if (!row || !profile) return;
    if (!company?.legal_name || !company.nip || !company.address_line || !company.city) {
      return toast.error("Complete the company name, NIP and address in Settings first");
    }
    if (profile.arrangement === "b2b" ? profile.nip.length !== 10 : profile.pesel.length !== 11) {
      return toast.error(
        `Complete the driver's ${profile.arrangement === "b2b" ? "NIP" : "PESEL"} in Manage drivers first`,
      );
    }
    if (!profile.address_line || !profile.city) {
      return toast.error("Complete the driver's address in Manage drivers first");
    }
    setBusyDriver(driverId);
    const calculation = calculatePolishSettlement(row, profile);
    const documentNumber = makeDocumentNumber(company.document_prefix, row.driver.code, to);
    const snapshot = JSON.parse(
      JSON.stringify({ company, driver: row, profile, calculation, period: { from, to } }),
    );
    const { error } = await supabase.from("fleet_generated_documents").insert({
      fleet_user_id: user.id,
      driver_id: driverId,
      document_number: documentNumber,
      document_type: documentTypeFor(profile.arrangement),
      period_from: from,
      period_to: to,
      snapshot,
    });
    setBusyDriver(null);
    if (error) return toast.error(error.message);
    printPolishDocument(
      polishDocumentHtml({
        company,
        driver: row,
        profile,
        calculation,
        documentNumber,
        from,
        to,
        currency: state.fleet.currency,
      }),
    );
    toast.success(`${ARRANGEMENT_LABELS[profile.arrangement]} document created`);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fleet Partner
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              min={from}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {!company?.nip && (
        <Card className="rounded-2xl border-amber-300 bg-amber-50 shadow-card dark:bg-amber-950/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              Add your company and tax details before generating documents.
            </div>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/settings">
                <Settings className="h-4 w-4" /> Open settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="documents">
        <TabsList className="rounded-xl">
          <TabsTrigger value="documents">Statements & tax</TabsTrigger>
          <TabsTrigger value="history">Document history</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="mt-4 space-y-3">
          {rows.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No drivers found.
              </CardContent>
            </Card>
          ) : (
            rows.map((row) => {
              const profile =
                profiles[row.driver.id] ?? defaultDriverTaxProfile(row.driver.id, user?.id ?? "");
              const calculation = calculatePolishSettlement(row, profile);
              const payable =
                profile.arrangement === "b2b" ? calculation.vatGross : calculation.netPay;
              return (
                <Card key={row.driver.id} className="rounded-2xl border-border shadow-card">
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-center">
                    <div>
                      <div className="font-semibold">{row.driver.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.driver.code} · {row.driver.email}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Selected agreement</div>
                      <div className="font-medium">{ARRANGEMENT_LABELS[profile.arrangement]}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {profile.arrangement === "b2b" ? "Gross invoice value" : "Net payment"}
                      </div>
                      <div className="font-semibold">
                        {formatMoney(payable, state.fleet.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fleet settlement: {formatMoney(row.payout, state.fleet.currency)}
                      </div>
                    </div>
                    <Button
                      className="rounded-xl"
                      disabled={busyDriver === row.driver.id || row.weeks === 0}
                      onClick={() => generate(row.driver.id)}
                    >
                      <Download className="h-4 w-4" />{" "}
                      {busyDriver === row.driver.id
                        ? "Creating…"
                        : `Download ${documentLabels[documentTypeFor(profile.arrangement)]}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4 space-y-2">
          {history.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No documents generated yet.
              </CardContent>
            </Card>
          ) : (
            history.map((item) => {
              const driver = drivers.find((value) => value.id === item.driver_id);
              return (
                <Card key={item.id} className="rounded-2xl">
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <FileClock className="h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.document_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {driver?.name ?? "Driver"} ·{" "}
                        {documentLabels[item.document_type] ?? item.document_type}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>
                        {item.period_from} – {item.period_to}
                      </div>
                      <div>{new Date(item.generated_at).toLocaleString()}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
