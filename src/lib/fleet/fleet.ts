import { applyDeductions, formatMoney, startOfWeek } from "@/lib/trackuber/calc";
import type { Deduction } from "@/lib/trackuber/types";
import {
  adjustmentLineTotal,
  netAdjustmentTotal,
  type EntryAdjustment,
} from "@/lib/fleet/settlements";

export interface FleetDriver {
  id: string;
  code: string;
  name: string;
  email: string;
  app_fee_override: number | null;
}

export interface FleetEntry {
  id?: string;
  driver_id: string;
  date: string;
  gross: number;
  cash: number;
  gas_card: number;
  created_at?: string;
  updated_at?: string;
}

export interface DriverRow {
  driver: FleetDriver;
  gross: number;
  cash: number;
  gasCard: number;
  vat: number;
  appFee: number;
  weeks: number;
  additions: number;
  extraDeductions: number;
  netAdjustments: number;
  deductionBreakdown: {
    id: string;
    name: string;
    amount: number;
    type: Deduction["type"];
    value: number;
    applyTo: Deduction["applyTo"];
  }[];
  sourceEarnings: { sourceId: string; name: string; amount: number; cash: number }[];
  adjustments: EntryAdjustment[];
  payout: number;
}

export function initialsOf(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "RT";
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase();
  return words.map((w) => w[0]!.toUpperCase()).join("");
}

export function nextDriverCode(companyName: string, existingCodes: string[]): string {
  const prefix = initialsOf(companyName);
  let max = 0;
  for (const c of existingCodes) {
    const m = c.match(/(\d+)$/);
    if (c.toUpperCase().startsWith(prefix) && m) max = Math.max(max, parseInt(m[1]!, 10));
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Number of distinct Monday–Sunday weeks that have at least one entry. */
export function weeksWithEntries(entries: FleetEntry[]): number {
  const set = new Set(entries.map((e) => startOfWeek(e.date, 1)));
  return set.size;
}

export function buildDriverRow(
  driver: FleetDriver,
  entries: FleetEntry[],
  deductions: Deduction[],
  weeklyAppFee: number,
  adjustments: EntryAdjustment[] = [],
): DriverRow {
  const mine = entries.filter((e) => e.driver_id === driver.id);
  const gross = mine.reduce((s, e) => s + Number(e.gross || 0), 0);
  const cash = mine.reduce((s, e) => s + Number(e.cash || 0), 0);
  const gasCard = mine.reduce((s, e) => s + Number(e.gas_card || 0), 0);
  const appliedDeductions = applyDeductions(gross, deductions);
  const vat = appliedDeductions.total;
  const weeks = weeksWithEntries(mine);
  const fee = driver.app_fee_override ?? weeklyAppFee;
  const appFee = weeks * Number(fee || 0);
  const additions = adjustments
    .filter((adjustment) => adjustment.direction === "addition")
    .reduce((sum, adjustment) => sum + adjustmentLineTotal(adjustment), 0);
  const extraDeductions = adjustments
    .filter((adjustment) => adjustment.direction === "deduction")
    .reduce((sum, adjustment) => sum + adjustmentLineTotal(adjustment), 0);
  const netAdjustments = netAdjustmentTotal(adjustments);
  return {
    driver,
    gross,
    cash,
    gasCard,
    vat,
    appFee,
    weeks,
    additions,
    extraDeductions,
    netAdjustments,
    deductionBreakdown: appliedDeductions.results.map((result) => {
      const setting = deductions.find((deduction) => deduction.id === result.id)!;
      return {
        ...result,
        type: setting.type,
        value: setting.value,
        applyTo: setting.applyTo,
      };
    }),
    sourceEarnings: [],
    adjustments,
    payout: gross - appFee - cash - vat - gasCard + netAdjustments,
  };
}

export function invoiceHtml(
  row: DriverRow,
  opts: { company: string; from: string; to: string; currency: string },
): string {
  const { company, from, to, currency } = opts;
  const date = (value: string) => {
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}`;
  };
  const money = (n: number) => formatMoney(n, currency);
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
  const documentNumber = `SET-${row.driver.code}-${to.replaceAll("-", "")}`;
  const activeSources = row.sourceEarnings.filter((source) => source.amount > 0 || source.cash > 0);
  const totalCosts = row.vat + row.appFee + row.gasCard + row.extraDeductions;
  const percent = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  const summaryCard = (label: string, value: string, detail: string, accent = false) =>
    `<td width="25%" valign="top" style="padding:0 5px">
      <div style="min-height:78px;padding:14px 13px;border:1px solid ${accent ? "#93c5fd" : "#dbe5f1"};border-radius:12px;background:${accent ? "#eff6ff" : "#f8fafc"}">
        <div style="font-size:10px;line-height:14px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:${accent ? "#1d4ed8" : "#64748b"}">${label}</div>
        <div style="margin-top:5px;font-size:18px;line-height:23px;font-weight:800;color:${accent ? "#1d4ed8" : "#13233a"}">${value}</div>
        <div style="margin-top:3px;font-size:10px;line-height:14px;color:#718096">${detail}</div>
      </div>
    </td>`;
  const calculationLine = (label: string, value: string, strong = false) =>
    `<tr>
      <td style="padding:${strong ? "13px 0 4px" : "7px 0"};border-top:${strong ? "2px solid #2563eb" : "0"};font-size:${strong ? "14px" : "12px"};font-weight:${strong ? 800 : 600};color:${strong ? "#1d4ed8" : "#4a5568"}">${label}</td>
      <td align="right" style="padding:${strong ? "13px 0 4px" : "7px 0"};border-top:${strong ? "2px solid #2563eb" : "0"};font-size:${strong ? "18px" : "12px"};font-weight:800;color:${strong ? "#1d4ed8" : "#13233a"};white-space:nowrap">${value}</td>
    </tr>`;

  const platformRows =
    activeSources.length > 0
      ? activeSources
          .map(
            (source) => `<tr>
              <td style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:#17222d">${escapeHtml(source.name)}</td>
              <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;color:#334155;white-space:nowrap">${money(source.amount)}</td>
              <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;color:#b45309;white-space:nowrap">${money(source.cash)}</td>
              <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:#17222d;white-space:nowrap">${money(source.amount - source.cash)}</td>
            </tr>`,
          )
          .join("")
      : `<tr>
          <td style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:#17222d">Unallocated earnings</td>
          <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;color:#334155;white-space:nowrap">${money(row.gross)}</td>
          <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;color:#b45309;white-space:nowrap">${money(row.cash)}</td>
          <td align="right" style="padding:11px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:#17222d;white-space:nowrap">${money(row.gross - row.cash)}</td>
        </tr>`;

  const costRows = [
    ...row.deductionBreakdown
      .filter((deduction) => deduction.amount > 0)
      .map((deduction) => [
        deduction.type === "percent"
          ? `${deduction.name} (${percent(deduction.value)}%)`
          : deduction.name,
        deduction.type === "percent"
          ? `Applied to ${deduction.applyTo === "gross" ? "gross earnings" : "the running balance"}`
          : `Fixed deduction applied to ${deduction.applyTo === "gross" ? "gross earnings" : "the running balance"}`,
        deduction.amount,
        "deduction",
      ]),
    row.appFee > 0
      ? [
          "Application fee",
          `${row.weeks} week${row.weeks === 1 ? "" : "s"} in this period`,
          row.appFee,
          "deduction",
        ]
      : null,
    row.gasCard > 0 ? ["Gas card", "Fuel charged by fleet", row.gasCard, "deduction"] : null,
    ...row.adjustments.map((adjustment) => [
      adjustment.label,
      adjustment.note || `${adjustment.quantity} x ${money(adjustment.unit_amount)}`,
      adjustmentLineTotal(adjustment),
      adjustment.direction,
    ]),
  ].filter(Boolean) as [string, string, number, "addition" | "deduction"][];

  const costTableRows =
    costRows.length > 0
      ? costRows
          .map(
            ([label, detail, value, direction]) => `<tr>
              <td style="padding:10px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:#17222d">${escapeHtml(label)}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #e6edf5;font-size:11px;color:#64748b">${escapeHtml(detail)}</td>
              <td align="right" style="padding:10px 12px;border-bottom:1px solid #e6edf5;font-size:12px;font-weight:700;color:${direction === "addition" ? "#08783e" : "#b42318"};white-space:nowrap">${direction === "addition" ? "+" : "-"} ${money(value)}</td>
            </tr>`,
          )
          .join("")
      : `<tr><td colspan="3" style="padding:15px 12px;font-size:12px;color:#64748b">No fleet costs or manual adjustments were recorded for this period.</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Settlement ${escapeHtml(documentNumber)}</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#eef3f9;font-family:Arial,Helvetica,sans-serif;color:#13233a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:8mm} @media print{body{background:#fff}.page{max-width:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}.screen-pad{padding:0!important}}
</style></head>
<body>
  <table class="screen-pad" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:28px 14px">
    <table class="page" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:760px;background:#ffffff;border:1px solid #dbe5f1;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(19,35,58,.10)">
      <tr><td style="padding:26px 30px;background:#102a4c;color:#ffffff">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td valign="top">
            <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#a9ceff">Fleet partner settlement</div>
            <div style="margin-top:7px;font-size:25px;line-height:30px;font-weight:800">${escapeHtml(company)}</div>
          </td>
          <td align="right" valign="top">
            <div style="font-size:16px;line-height:21px;font-weight:800">Driver settlement statement</div>
            <div style="margin-top:5px;font-size:11px;line-height:16px;color:#c9ddf8">${escapeHtml(documentNumber)}</div>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:24px 30px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td valign="top" width="55%">
            <div style="font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#64748b">Settlement for</div>
            <div style="margin-top:5px;font-size:19px;line-height:24px;font-weight:800;color:#17222d">${escapeHtml(row.driver.name)}</div>
            <div style="margin-top:4px;font-size:11px;line-height:17px;color:#64748b">Driver ID: ${escapeHtml(row.driver.code)}<br/>${escapeHtml(row.driver.email)}</div>
          </td>
          <td valign="top" align="right" width="45%">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-left:auto;font-size:11px;line-height:18px;color:#64748b">
              <tr><td style="padding-right:14px">Settlement period</td><td style="font-weight:800;color:#17222d;white-space:nowrap">${date(from)} - ${date(to)}</td></tr>
              <tr><td style="padding-right:14px">Generated</td><td style="font-weight:700;color:#17222d">${generated}</td></tr>
              <tr><td style="padding-right:14px">Currency</td><td style="font-weight:700;color:#17222d">${escapeHtml(currency)}</td></tr>
            </table>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:22px 25px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          ${summaryCard("Gross earnings", money(row.gross), "Across all assigned apps")}
          ${summaryCard("Cash collected", money(row.cash), "Already received by driver")}
          ${summaryCard("Fleet costs", money(totalCosts), "Commission, fees and deductions")}
          ${summaryCard("Amount to transfer", money(row.payout), "Final bank payout", true)}
        </tr></table>
      </td></tr>

      <tr><td style="padding:25px 30px 0">
        <div style="font-size:12px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#334155">1. Earnings by app</div>
        <div style="margin-top:5px;font-size:11px;line-height:16px;color:#718096">Gross earnings and cash collected are shown separately for every platform.</div>
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:10px;border:1px solid #dbe5f1;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden">
          <thead><tr style="background:#f1f5f9">
            <th align="left" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">App</th>
            <th align="right" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Gross</th>
            <th align="right" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Cash collected</th>
            <th align="right" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Via fleet</th>
          </tr></thead>
          <tbody>${platformRows}</tbody>
          <tfoot><tr style="background:#f8fafc">
            <td style="padding:11px 12px;font-size:12px;font-weight:800;color:#17222d">Total</td>
            <td align="right" style="padding:11px 12px;font-size:12px;font-weight:800;color:#17222d;white-space:nowrap">${money(row.gross)}</td>
            <td align="right" style="padding:11px 12px;font-size:12px;font-weight:800;color:#b45309;white-space:nowrap">${money(row.cash)}</td>
            <td align="right" style="padding:11px 12px;font-size:12px;font-weight:800;color:#17222d;white-space:nowrap">${money(row.gross - row.cash)}</td>
          </tr></tfoot>
        </table>
      </td></tr>

      <tr><td style="padding:25px 30px 0">
        <div style="font-size:12px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#334155">2. Fleet costs and adjustments</div>
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:10px;border:1px solid #dbe5f1;border-radius:10px;border-collapse:separate;border-spacing:0;overflow:hidden">
          <thead><tr style="background:#f1f5f9">
            <th align="left" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Item</th>
            <th align="left" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Details</th>
            <th align="right" style="padding:9px 12px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#64748b">Effect on payout</th>
          </tr></thead>
          <tbody>${costTableRows}</tbody>
        </table>
      </td></tr>

      <tr><td style="padding:25px 30px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fafc;border:1px solid #cbdcf1;border-radius:12px"><tr>
          <td valign="top" style="padding:18px 20px" width="48%">
            <div style="font-size:12px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#334155">3. Final payout</div>
            <div style="margin-top:7px;font-size:11px;line-height:17px;color:#64748b">Cash collected was already received directly by the driver. The amount to transfer is the remaining settlement after fleet costs and adjustments.</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:15px"><tr>
              <td width="46%" style="padding-right:9px"><div style="height:18px;border-bottom:1px solid #94a3b8"></div><div style="padding-top:4px;font-size:8px;color:#718096">Driver signature</div></td>
              <td width="8%"></td>
              <td width="46%" style="padding-left:9px"><div style="height:18px;border-bottom:1px solid #94a3b8"></div><div style="padding-top:4px;font-size:8px;color:#718096">Fleet partner</div></td>
            </tr></table>
          </td>
          <td valign="top" style="padding:13px 20px 16px" width="52%">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              ${calculationLine("Gross earnings", money(row.gross))}
              ${calculationLine("Cash already collected", `- ${money(row.cash)}`)}
              ${calculationLine("Fleet costs", `- ${money(totalCosts)}`)}
              ${row.additions > 0 ? calculationLine("Plus additions", `+ ${money(row.additions)}`) : ""}
              ${calculationLine("Amount to transfer", money(row.payout), true)}
            </table>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Renders HTML in a hidden iframe and opens the print dialog (Save as PDF). */
export function printHtml(html: string, fallbackName: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (!doc || !iframe.contentWindow) throw new Error("no iframe document");
    doc.open();
    doc.write(html);
    doc.close();
    const win = iframe.contentWindow;
    const run = () => {
      try {
        win.focus();
        win.print();
      } catch {
        downloadHtml(html, fallbackName);
      }
      setTimeout(() => iframe.remove(), 1500);
    };
    if (doc.readyState === "complete") setTimeout(run, 150);
    else iframe.onload = () => setTimeout(run, 150);
  } catch {
    downloadHtml(html, fallbackName);
  }
}

export function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
