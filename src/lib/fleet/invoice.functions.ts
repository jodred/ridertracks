import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDriverRow, invoiceHtml, type FleetDriver, type FleetEntry } from "@/lib/fleet/fleet";
import type { Deduction } from "@/lib/trackuber/types";

export interface SendInvoiceInput {
  driverId: string;
  from: string;
  to: string;
  company: string;
  currency: string;
  weeklyAppFee: number;
  deductions: Deduction[];
}

export const sendDriverInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendInvoiceInput) => {
    if (!input?.driverId) throw new Error("Missing driver");
    if (!input.from || !input.to) throw new Error("Missing period");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: driver, error: dErr } = await supabase
      .from("fleet_drivers")
      .select("id, code, name, email, app_fee_override")
      .eq("id", data.driverId)
      .eq("fleet_user_id", userId)
      .maybeSingle();
    if (dErr) throw new Error(dErr.message);
    if (!driver) throw new Error("Driver not found");
    if (!driver.email) throw new Error("Driver has no email address");

    const { data: entries, error: eErr } = await supabase
      .from("fleet_driver_entries")
      .select("driver_id, date, gross, cash, gas_card")
      .eq("driver_id", data.driverId)
      .gte("date", data.from)
      .lte("date", data.to);
    if (eErr) throw new Error(eErr.message);

    const row = buildDriverRow(
      driver as FleetDriver,
      (entries ?? []) as FleetEntry[],
      data.deductions ?? [],
      Number(data.weeklyAppFee || 0),
    );

    const company = data.company?.trim() || "RideTracks";
    const html = invoiceHtml(row, {
      company,
      from: data.from,
      to: data.to,
      currency: data.currency || "GBP",
    });

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const resendKey = process.env["RESEND_API_KEY"];
    if (!lovableKey || !resendKey) throw new Error("Email is not configured for this project");

    const sender = process.env["RESEND_FROM"] || "RideTracks <onboarding@resend.dev>";

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: sender,
        to: [driver.email],
        subject: `${company} — Invoice ${driver.code} (${data.from} → ${data.to})`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend send failed [${res.status}]: ${body}`);
      throw new Error(`Email failed [${res.status}]: ${body}`);
    }

    return { sent: true, email: driver.email as string, code: driver.code as string };
  });
