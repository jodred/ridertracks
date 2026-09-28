/* eslint-disable react-refresh/only-export-components -- shared settlement model and its small brand badge intentionally live together */
import { supabase } from "@/integrations/supabase/client";

export type EarningLogoKey = "uber" | "bolt" | "free-now" | "custom";
export type AdjustmentDirection = "addition" | "deduction";
export type AdjustmentFrequency = "one_time" | "weekly";

export interface EarningSource {
  id: string;
  fleet_user_id: string;
  name: string;
  slug: string;
  logo_key: EarningLogoKey;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface DriverSourceAssignment {
  fleet_user_id: string;
  driver_id: string;
  source_id: string;
}

export interface EntryEarning {
  id?: string;
  fleet_user_id: string;
  entry_id: string;
  source_id: string;
  amount: number;
}

export interface AdjustmentType {
  id: string;
  fleet_user_id: string;
  name: string;
  direction: AdjustmentDirection;
  frequency: AdjustmentFrequency;
  default_amount: number;
  is_active: boolean;
}

export interface EntryAdjustment {
  id?: string;
  fleet_user_id: string;
  entry_id: string;
  adjustment_type_id: string;
  label: string;
  direction: AdjustmentDirection;
  frequency: AdjustmentFrequency;
  unit_amount: number;
  quantity: number;
  note: string | null;
}

export const DEFAULT_EARNING_SOURCES = [
  { name: "Uber", slug: "uber", logo_key: "uber" as const, is_default: true, sort_order: 10 },
  { name: "Bolt", slug: "bolt", logo_key: "bolt" as const, is_default: true, sort_order: 20 },
  {
    name: "Free Now",
    slug: "free-now",
    logo_key: "free-now" as const,
    is_default: true,
    sort_order: 30,
  },
];

export async function ensureDefaultEarningSources(fleetUserId: string) {
  return supabase.from("fleet_earning_sources").upsert(
    DEFAULT_EARNING_SOURCES.map((source) => ({ ...source, fleet_user_id: fleetUserId })),
    { onConflict: "fleet_user_id,slug", ignoreDuplicates: true },
  );
}

export function slugifySource(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || `app-${Math.random().toString(36).slice(2, 8)}`;
}

export function adjustmentLineTotal(adjustment: Pick<EntryAdjustment, "unit_amount" | "quantity">) {
  return Number(adjustment.unit_amount || 0) * Math.max(1, Number(adjustment.quantity || 1));
}

export function netAdjustmentTotal(adjustments: EntryAdjustment[]) {
  return adjustments.reduce(
    (sum, adjustment) =>
      sum + adjustmentLineTotal(adjustment) * (adjustment.direction === "addition" ? 1 : -1),
    0,
  );
}

export function AppLogo({
  source,
  className = "h-9 w-9",
}: {
  source: Pick<EarningSource, "name" | "logo_key">;
  className?: string;
}) {
  const common = `${className} grid shrink-0 place-items-center rounded-xl text-[9px] font-bold leading-none tracking-tight`;
  if (source.logo_key === "uber") {
    return (
      <span aria-label="Uber logo" className={`${common} bg-black text-white`}>
        UBER
      </span>
    );
  }
  if (source.logo_key === "bolt") {
    return (
      <span aria-label="Bolt logo" className={`${common} bg-[#34e89e] text-[#16352c]`}>
        Bolt
      </span>
    );
  }
  if (source.logo_key === "free-now") {
    return (
      <span aria-label="Free Now logo" className={`${common} bg-[#e61e4d] text-white`}>
        <span className="text-center">
          FREE
          <br />
          NOW
        </span>
      </span>
    );
  }
  const initials =
    source.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "APP";
  return (
    <span aria-label={`${source.name} logo`} className={`${common} bg-primary/15 text-primary`}>
      {initials}
    </span>
  );
}
