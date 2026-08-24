import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestedInvoice = {
  driverId: string;
  html: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401);

    const body = await request.json();
    const from = typeof body.from === "string" ? body.from : "";
    const to = typeof body.to === "string" ? body.to : "";
    const requested = Array.isArray(body.invoices) ? (body.invoices as RequestedInvoice[]) : [];
    const validInvoices = requested.filter(
      (invoice) =>
        invoice &&
        typeof invoice.driverId === "string" &&
        typeof invoice.html === "string" &&
        invoice.html.length > 0,
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || validInvoices.length === 0) {
      return json({ error: "A date range and at least one invoice are required" }, 400);
    }

    const driverIds = [...new Set(validInvoices.map((invoice) => invoice.driverId))];
    const [{ data: drivers, error: driversError }, { data: entries, error: entriesError }] = await Promise.all([
      supabase.from("fleet_drivers").select("id, name, email").in("id", driverIds),
      supabase
        .from("fleet_driver_entries")
        .select("driver_id")
        .in("driver_id", driverIds)
        .gte("date", from)
        .lte("date", to),
    ]);
    if (driversError || entriesError) return json({ error: "Could not prepare invoices" }, 400);

    const driversById = new Map((drivers ?? []).map((driver) => [driver.id, driver]));
    const activeDriverIds = new Set((entries ?? []).map((entry) => entry.driver_id));
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "Email delivery is not configured" }, 500);

    const results = await Promise.all(
      validInvoices
        .filter((invoice) => activeDriverIds.has(invoice.driverId) && driversById.get(invoice.driverId)?.email)
        .map(async (invoice) => {
          const driver = driversById.get(invoice.driverId)!;
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "RideTracks <invoices@ridetracks.com>",
              to: [driver.email],
              subject: `RideTracks settlement invoice: ${from} to ${to}`,
              html: invoice.html,
              text: `Hello ${driver.name}, your RideTracks settlement invoice for ${from} to ${to} is ready.`,
            }),
          });
          return { driverId: invoice.driverId, sent: response.ok };
        }),
    );

    const sent = results.filter((result) => result.sent).length;
    return json({ sent, omitted: validInvoices.length - sent });
  } catch (error) {
    console.error("send-invoices failed", error);
    return json({ error: "Could not send invoices" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
