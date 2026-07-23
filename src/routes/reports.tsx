import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { summarize, formatMoney } from "../lib/trackuber/calc";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — TrackUber" },
      { name: "description", content: "Export earnings, deductions, and profit as CSV, Excel, or PDF." },
      { property: "og:title", content: "Reports — TrackUber" },
      { property: "og:description", content: "Export earnings, deductions, and profit as CSV or PDF." },
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
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { state, range } = useStore();
  const summary = useMemo(() => summarize(state, range), [state, range]);
  const currency = state.fleet.currency;

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
          `<tr><td>${d.date}</td><td style="text-align:right">${formatMoney(d.gross, currency)}</td><td style="text-align:right">${formatMoney(d.cash, currency)}</td><td style="text-align:right">${formatMoney(d.expenses, currency)}</td><td style="text-align:right">${formatMoney(d.partnerPayment, currency)}</td><td style="text-align:right">${formatMoney(d.profit, currency)}</td></tr>`,
      )
      .join("");
    const html = `<!doctype html><html><head><title>TrackUber Report ${range.from} to ${range.to}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{margin:0 0 4px}small{color:#666}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:8px 12px;border-bottom:1px solid #eee;text-align:left}th{font-size:12px;text-transform:uppercase;color:#666}</style>
</head><body>
<h1>TrackUber Report</h1><small>${range.from} to ${range.to} - ${state.fleet.fleetName}</small>
<h3>Summary</h3>
<table>
<tr><td>Gross Revenue</td><td style="text-align:right">${formatMoney(summary.gross, currency)}</td></tr>
<tr><td>Fleet Deductions</td><td style="text-align:right">${formatMoney(summary.fleetDeductionsTotal, currency)}</td></tr>
<tr><td>Weekly App Fees (${summary.weeklyFeeCount})</td><td style="text-align:right">${formatMoney(summary.weeklyFees, currency)}</td></tr>
<tr><td>Operating Expenses</td><td style="text-align:right">${formatMoney(summary.operatingExpenses, currency)}</td></tr>
<tr><td>Expected Partner Payment</td><td style="text-align:right">${formatMoney(summary.expectedPartnerPayment, currency)}</td></tr>
<tr><td><b>Net Profit</b></td><td style="text-align:right"><b>${formatMoney(summary.netProfit, currency)}</b></td></tr>
</table>
<h3>Daily</h3>
<table><thead><tr><th>Date</th><th style="text-align:right">Gross</th><th style="text-align:right">Cash</th><th style="text-align:right">Expenses</th><th style="text-align:right">Partner</th><th style="text-align:right">Profit</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Export</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Report reflects the current date range: {range.from} to {range.to}
          </p>
        </div>
      </div>

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
            <Button variant="outline" className="rounded-full" onClick={() => download(`trackuber_${range.from}_${range.to}.csv`, "text/csv", csv)}>
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
            <Button variant="outline" className="rounded-full" onClick={() => download(`trackuber_${range.from}_${range.to}.xls`, "application/vnd.ms-excel", csv)}>
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
              <div className="text-xs text-muted-foreground">Print or save via your browser</div>
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
