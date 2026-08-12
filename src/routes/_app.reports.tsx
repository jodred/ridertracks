import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Receipt } from "lucide-react";
import { useStore } from "../lib/trackuber/Ridetracks";
import { summarize, formatMoney, formatDate } from "../lib/trackuber/calc";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Tax — RideTracks" },
      { name: "description", content: "Export earnings, deductions, and profit as CSV, Excel, or PDF, and generate a tax payslip." },
      { property: "og:title", content: "Reports & Tax — RideTracks" },
      { property: "og:description", content: "Export earnings and generate a company payslip for tax." },
    ],
  }),
  component: ReportsPage,
});

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Renders HTML in a hidden same-origin iframe and triggers the browser print
 * dialog (Save as PDF). Works inside sandboxed previews where window.open is blocked.
 */
function printHtml(html: string, fallbackName: string) {
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
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
        download(fallbackName, "text/html", html);
      }
      setTimeout(() => iframe.remove(), 1000);
    };
    if (doc.readyState === "complete") setTimeout(run, 150);
    else iframe.onload = () => setTimeout(run, 150);
  } catch {
    download(fallbackName, "text/html", html);
  }
}

const baseStyles = `body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:32px;color:#111}
h1{margin:0 0 4px;font-size:22px}small{color:#666}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left;font-size:13px}
th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#666}
.right{text-align:right}
@media print{body{padding:16px}}`;

function ReportsPage() {
  const { state, range } = useStore();
  const summary = useMemo(() => summarize(state, range), [state, range]);
  const currency = state.fleet.currency;
  const [taxRate, setTaxRate] = useState(12);

  const csv = useMemo(() => {
    const header = ["Date", "Gross", "Cash", "Expenses", "Partner Payment", "Profit"].join(",");
    const rows = summary.daily.map((d) =>
      [d.date, d.gross, d.cash, d.expenses, d.partnerPayment, d.profit]
        .map((v) => (typeof v === "number" ? v.toFixed(2) : v))
        .join(","),
    );
    return [header, ...rows].join("\n");
  }, [summary]);

  const exportPDF = () => {
    const rowsHtml = summary.daily
      .map(
        (d) =>
          `<tr><td>${d.date}</td><td class="right">${formatMoney(d.gross, currency)}</td><td class="right">${formatMoney(d.cash, currency)}</td><td class="right">${formatMoney(d.expenses, currency)}</td><td class="right">${formatMoney(d.partnerPayment, currency)}</td><td class="right">${formatMoney(d.profit, currency)}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>RideTracks Report ${range.from} to ${range.to}</title>
<style>${baseStyles}</style></head><body>
<h1>RideTracks Report</h1><small>${range.from} to ${range.to} &middot; ${state.fleet.fleetName}</small>
<h3>Summary</h3>
<table>
<tr><td>Gross Revenue</td><td class="right">${formatMoney(summary.gross, currency)}</td></tr>
<tr><td>Fleet Deductions</td><td class="right">${formatMoney(summary.fleetDeductionsTotal, currency)}</td></tr>
<tr><td>Weekly App Fees (${summary.weeklyFeeCount})</td><td class="right">${formatMoney(summary.weeklyFees, currency)}</td></tr>
<tr><td>Operating Expenses</td><td class="right">${formatMoney(summary.operatingExpenses, currency)}</td></tr>
<tr><td>Expected Partner Payment</td><td class="right">${formatMoney(summary.expectedPartnerPayment, currency)}</td></tr>
<tr><td><b>Net Profit</b></td><td class="right"><b>${formatMoney(summary.netProfit, currency)}</b></td></tr>
</table>
<h3>Daily</h3>
<table><thead><tr><th>Date</th><th class="right">Gross</th><th class="right">Cash</th><th class="right">Expenses</th><th class="right">Partner</th><th class="right">Profit</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
</body></html>`;
    printHtml(html, `ridetracks_report_${range.from}_${range.to}.html`);
  };

  // ----- Tax / payslip -----
  const taxable = Math.max(0, summary.netProfit);
  const taxDue = (taxable * taxRate) / 100;
  const takeHome = taxable - taxDue;

  const payslipHtml = useMemo(() => {
    const company = state.fleet.fleetName || "Fleet";
    const driver = state.profile.driverName || state.profile.email || "Driver";
    const line = (l: string, v: string, bold = false) =>
      `<tr><td>${bold ? `<b>${l}</b>` : l}</td><td class="right">${bold ? `<b>${v}</b>` : v}</td></tr>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${range.from} to ${range.to}</title>
<style>${baseStyles}
.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px}
.meta{font-size:12px;color:#444;line-height:1.6;text-align:right}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#444;margin:22px 0 0}
.total{background:#f6f6f6}
</style></head><body>
<div class="head">
  <div><h1>${company}</h1><small>Driver payslip</small></div>
  <div class="meta">
    <div><b>Period:</b> ${formatDate(range.from)} &ndash; ${formatDate(range.to)}</div>
    <div><b>Issued:</b> ${formatDate(new Date().toISOString().slice(0, 10))}</div>
  </div>
</div>
<h2>Employee / Contractor</h2>
<table>
${line("Name", driver)}
${line("Email", state.profile.email || "—")}
${line("Vehicle", state.profile.vehicle || "—")}
${line("Registration", state.profile.registration || "—")}
</table>
<h2>Earnings</h2>
<table>
${line("Gross revenue", formatMoney(summary.gross, currency))}
${line("Cash collected", formatMoney(summary.cashCollected, currency))}
${line("Cashless revenue", formatMoney(summary.cardRevenue, currency))}
</table>
<h2>Deductions</h2>
<table>
${summary.fleetDeductions.map((d) => line(d.name, `- ${formatMoney(d.amount, currency)}`)).join("")}
${line(`Weekly app fee (${summary.weeklyFeeCount})`, `- ${formatMoney(summary.weeklyFees, currency)}`)}
${line("Operating expenses", `- ${formatMoney(summary.operatingExpenses, currency)}`)}
${line("Total deductions", `- ${formatMoney(summary.fleetTake + summary.operatingExpenses, currency)}`, true)}
</table>
<h2>Tax</h2>
<table>
${line("Taxable income (net profit)", formatMoney(taxable, currency))}
${line(`Tax @ ${taxRate}%`, `- ${formatMoney(taxDue, currency)}`)}
</table>
<table style="margin-top:16px">
<tr class="total"><td><b>Net pay after tax</b></td><td class="right"><b>${formatMoney(takeHome, currency)}</b></td></tr>
</table>
<p style="margin-top:24px;font-size:11px;color:#777">Generated by RideTracks for ${company}. Figures are based on the driver's recorded entries for the selected period and are for informational purposes only.</p>
</body></html>`;
  }, [state, summary, range, currency, taxRate, taxable, taxDue, takeHome]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Export</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reflects the current date range: {range.from} to {range.to}
          </p>
        </div>
      </div>

      <Tabs defaultValue="reports" className="w-full">
        <TabsList className="rounded-full">
          <TabsTrigger value="reports" className="rounded-full">Reports</TabsTrigger>
          <TabsTrigger value="tax" className="rounded-full">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-5 flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-2xl border-border shadow-card">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">CSV</div>
                  <div className="text-xs text-muted-foreground">For spreadsheets & bookkeeping</div>
                </div>
                <Button variant="outline" className="rounded-full" onClick={() => download(`ridetracks_${range.from}_${range.to}.csv`, "text/csv", csv)}>
                  <Download className="mr-1 h-4 w-4" /> Download CSV
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border shadow-card">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Excel</div>
                  <div className="text-xs text-muted-foreground">CSV opens directly in Excel</div>
                </div>
                <Button variant="outline" className="rounded-full" onClick={() => download(`ridetracks_${range.from}_${range.to}.xls`, "application/vnd.ms-excel", csv)}>
                  <Download className="mr-1 h-4 w-4" /> Download .xls
                </Button>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border shadow-card">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">PDF</div>
                  <div className="text-xs text-muted-foreground">Opens the print dialog — choose “Save as PDF”</div>
                </div>
                <Button variant="outline" className="rounded-full" onClick={exportPDF}>
                  <Download className="mr-1 h-4 w-4" /> Generate PDF
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border-border shadow-card">
            <CardContent className="p-5">
              <div className="mb-4 text-sm font-semibold">Preview</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat label="Gross Revenue" value={formatMoney(summary.gross, currency)} />
                <Stat label="Fleet Deductions" value={formatMoney(summary.fleetDeductionsTotal, currency)} />
                <Stat label="Weekly Fees" value={formatMoney(summary.weeklyFees, currency)} />
                <Stat label="Operating Expenses" value={formatMoney(summary.operatingExpenses, currency)} />
                <Stat label="Expected Partner Payment" value={formatMoney(summary.expectedPartnerPayment, currency)} />
                <Stat label="Net Profit" value={formatMoney(summary.netProfit, currency)} accent />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-5 flex flex-col gap-6">
          <Card className="rounded-2xl border-border shadow-card">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Payslip — {state.fleet.fleetName || "Your fleet"}</div>
                  <div className="text-xs text-muted-foreground">
                    Issued under your company name from Settings, using your entries for the selected period.
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:max-w-xs">
                <Label htmlFor="taxRate">Tax rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Gross Revenue" value={formatMoney(summary.gross, currency)} />
                <Stat label="Total Deductions" value={formatMoney(summary.fleetTake + summary.operatingExpenses, currency)} />
                <Stat label={`Tax @ ${taxRate}%`} value={formatMoney(taxDue, currency)} />
                <Stat label="Net Pay After Tax" value={formatMoney(takeHome, currency)} accent />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="rounded-full"
                  onClick={() => printHtml(payslipHtml, `payslip_${range.from}_${range.to}.html`)}
                >
                  <Download className="mr-1 h-4 w-4" /> Download Payslip (PDF)
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => download(`payslip_${range.from}_${range.to}.html`, "text/html", payslipHtml)}
                >
                  <Download className="mr-1 h-4 w-4" /> Save as HTML
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
