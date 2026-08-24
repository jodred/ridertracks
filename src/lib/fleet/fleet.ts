import { applyDeductions, formatMoney, startOfWeek } from "@/lib/trackuber/calc";
import type { Deduction } from "@/lib/trackuber/types";

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
): DriverRow {
  const mine = entries.filter((e) => e.driver_id === driver.id);
  const gross = mine.reduce((s, e) => s + Number(e.gross || 0), 0);
  const cash = mine.reduce((s, e) => s + Number(e.cash || 0), 0);
  const gasCard = mine.reduce((s, e) => s + Number(e.gas_card || 0), 0);
  const vat = applyDeductions(gross, deductions).total;
  const weeks = weeksWithEntries(mine);
  const fee = driver.app_fee_override ?? weeklyAppFee;
  const appFee = weeks * Number(fee || 0);
  return {
    driver,
    gross,
    cash,
    gasCard,
    vat,
    appFee,
    weeks,
    payout: gross - appFee - cash - vat - gasCard,
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
  const amount = (n: number, prefix = "") => (n ? `${prefix}${money(n)}` : "–");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:11px 0;color:${strong ? "#102a43" : "#52616b"};font-size:14px;font-weight:${strong ? 700 : 400};border-top:${strong ? "2px solid #d9e2ec" : "0"}">${label}</td>
     <td style="padding:11px 0;text-align:right;font-size:14px;font-weight:${strong ? 800 : 600};color:#102a43;border-top:${strong ? "2px solid #d9e2ec" : "0"}">${value}</td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Invoice ${row.driver.code} ${date(from)} to ${date(to)}</title></head>
<body style="margin:0;padding:0;background:#eef3f7;font-family:Arial,Helvetica,sans-serif;color:#102a43">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef3f7"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(16,42,67,0.10)">
      <tr><td style="padding:30px 32px;background:#008f45;color:#ffffff">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="font-size:25px;line-height:30px;font-weight:800">${escapeHtml(company)}</td>
          <td align="right" style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d7f7e5">Settlement invoice</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:30px 32px 8px">
        <div style="font-size:13px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:#008f45">Invoice period</div>
        <div style="margin-top:7px;font-size:20px;line-height:28px;font-weight:800;color:#102a43">${date(from)} – ${date(to)}</div>
      </td></tr>
      <tr><td style="padding:20px 32px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f8fa;border:1px solid #d9e2ec;border-radius:12px"><tr><td style="padding:18px 20px">
          <div style="font-size:17px;font-weight:800;color:#102a43">${escapeHtml(row.driver.name)}</div>
          <div style="margin-top:5px;font-size:13px;color:#627d98">Driver ${escapeHtml(row.driver.code)} &nbsp;•&nbsp; ${escapeHtml(row.driver.email)}</div>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:4px 32px 18px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse">
          ${line("Gross earnings", amount(row.gross))}
          ${line("Cash collected", amount(row.cash, "− "))}
          ${line("VAT / fleet commission", amount(row.vat, "− "))}
          ${line(`Application fee (${row.weeks} week${row.weeks === 1 ? "" : "s"})`, amount(row.appFee, "− "))}
          ${line("Gas card", amount(row.gasCard, "− "))}
          ${line("Payout", amount(row.payout), true)}
        </table>
      </td></tr>
      <tr><td style="padding:20px 32px 28px;border-top:1px solid #d9e2ec;font-size:12px;line-height:18px;color:#829ab1">
        Generated by ${escapeHtml(company)} via RideTracks. Please contact your Fleet Partner if you have any questions about this settlement.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
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
