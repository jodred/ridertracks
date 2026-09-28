import { formatMoney } from "@/lib/trackuber/calc";
import type { DriverRow } from "@/lib/fleet/fleet";

export type DriverArrangement = "employment" | "mandate" | "b2b";
export type IncomeCostType = "standard250" | "commuter300" | "percent20" | "custom";

export interface FleetTaxProfile {
  fleet_user_id: string;
  legal_name: string;
  nip: string;
  regon: string;
  address_line: string;
  postal_code: string;
  city: string;
  tax_office: string;
  bank_account: string;
  document_prefix: string;
}

export interface DriverTaxProfile {
  driver_id: string;
  fleet_user_id: string;
  arrangement: DriverArrangement;
  pesel: string;
  nip: string;
  address_line: string;
  postal_code: string;
  city: string;
  tax_resident: boolean;
  under_26: boolean;
  apply_social_insurance: boolean;
  apply_sickness_insurance: boolean;
  pension_rate: number;
  disability_rate: number;
  sickness_rate: number;
  health_rate: number;
  income_cost_type: IncomeCostType;
  custom_income_cost: number;
  pit_rate: number;
  pit2_reduction: number;
  ppk_rate: number;
  vat_rate: number;
  vat_exempt: boolean;
  self_billing: boolean;
}

export interface PolishSettlementCalculation {
  arrangement: DriverArrangement;
  grossRemuneration: number;
  pension: number;
  disability: number;
  sickness: number;
  socialTotal: number;
  healthBase: number;
  health: number;
  incomeCosts: number;
  taxableBase: number;
  pitAdvance: number;
  ppk: number;
  netPay: number;
  vatNet: number;
  vatAmount: number;
  vatGross: number;
}

export const ARRANGEMENT_LABELS: Record<DriverArrangement, string> = {
  employment: "Umowa o pracę",
  mandate: "Umowa zlecenie",
  b2b: "B2B",
};

export function defaultDriverTaxProfile(
  driverId: string,
  fleetUserId: string,
  arrangement: DriverArrangement = "mandate",
): DriverTaxProfile {
  return {
    driver_id: driverId,
    fleet_user_id: fleetUserId,
    arrangement,
    pesel: "",
    nip: "",
    address_line: "",
    postal_code: "",
    city: "",
    tax_resident: true,
    under_26: false,
    apply_social_insurance: arrangement !== "b2b",
    apply_sickness_insurance: arrangement === "employment",
    pension_rate: 9.76,
    disability_rate: 1.5,
    sickness_rate: 2.45,
    health_rate: 9,
    income_cost_type: arrangement === "employment" ? "standard250" : "percent20",
    custom_income_cost: 0,
    pit_rate: 12,
    pit2_reduction: 0,
    ppk_rate: 0,
    vat_rate: 23,
    vat_exempt: false,
    self_billing: false,
  };
}

const moneyRound = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculatePolishSettlement(
  row: DriverRow,
  profile: DriverTaxProfile,
): PolishSettlementCalculation {
  const grossRemuneration = moneyRound(Math.max(0, row.payout));
  if (profile.arrangement === "b2b") {
    const vatNet = grossRemuneration;
    const vatAmount = profile.vat_exempt ? 0 : moneyRound(vatNet * (profile.vat_rate / 100));
    return {
      arrangement: profile.arrangement,
      grossRemuneration,
      pension: 0,
      disability: 0,
      sickness: 0,
      socialTotal: 0,
      healthBase: 0,
      health: 0,
      incomeCosts: 0,
      taxableBase: 0,
      pitAdvance: 0,
      ppk: 0,
      netPay: vatNet,
      vatNet,
      vatAmount,
      vatGross: moneyRound(vatNet + vatAmount),
    };
  }

  const pension = profile.apply_social_insurance
    ? moneyRound(grossRemuneration * (profile.pension_rate / 100))
    : 0;
  const disability = profile.apply_social_insurance
    ? moneyRound(grossRemuneration * (profile.disability_rate / 100))
    : 0;
  const sickness =
    profile.apply_social_insurance && profile.apply_sickness_insurance
      ? moneyRound(grossRemuneration * (profile.sickness_rate / 100))
      : 0;
  const socialTotal = moneyRound(pension + disability + sickness);
  const healthBase = moneyRound(Math.max(0, grossRemuneration - socialTotal));
  const health = moneyRound(healthBase * (profile.health_rate / 100));
  const incomeCosts = moneyRound(
    Math.min(
      healthBase,
      profile.income_cost_type === "standard250"
        ? 250
        : profile.income_cost_type === "commuter300"
          ? 300
          : profile.income_cost_type === "percent20"
            ? healthBase * 0.2
            : profile.custom_income_cost,
    ),
  );
  const taxableBase = Math.round(Math.max(0, healthBase - incomeCosts));
  const pitAdvance = profile.under_26
    ? 0
    : Math.max(0, Math.round(taxableBase * (profile.pit_rate / 100) - profile.pit2_reduction));
  const ppk = moneyRound(grossRemuneration * (profile.ppk_rate / 100));
  const netPay = moneyRound(grossRemuneration - socialTotal - health - pitAdvance - ppk);
  return {
    arrangement: profile.arrangement,
    grossRemuneration,
    pension,
    disability,
    sickness,
    socialTotal,
    healthBase,
    health,
    incomeCosts,
    taxableBase,
    pitAdvance,
    ppk,
    netPay,
    vatNet: 0,
    vatAmount: 0,
    vatGross: 0,
  };
}

export function documentTypeFor(arrangement: DriverArrangement) {
  if (arrangement === "employment") return "payroll" as const;
  if (arrangement === "mandate") return "mandate_statement" as const;
  return "b2b_statement" as const;
}

export function makeDocumentNumber(
  prefix: string,
  driverCode: string,
  periodTo: string,
  generatedAt = new Date(),
) {
  const compactTime = generatedAt.toISOString().replace(/\D/g, "").slice(0, 14);
  return `${prefix || "RT"}/${periodTo.slice(0, 7).replace("-", "/")}/${driverCode}/${compactTime}`;
}

function escapeHtml(value: string | number) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

export function polishDocumentHtml(args: {
  company: FleetTaxProfile;
  driver: DriverRow;
  profile: DriverTaxProfile;
  calculation: PolishSettlementCalculation;
  documentNumber: string;
  from: string;
  to: string;
  currency: string;
}) {
  const { company, driver, profile, calculation, documentNumber, from, to, currency } = args;
  const money = (value: number) => formatMoney(value, currency);
  const title =
    profile.arrangement === "employment"
      ? "LISTA PŁAC – ODCINEK WYNAGRODZENIA"
      : profile.arrangement === "mandate"
        ? "RACHUNEK DO UMOWY ZLECENIA"
        : profile.self_billing
          ? "FAKTURA – SAMOFAKTUROWANIE"
          : "ZESTAWIENIE ROZLICZENIOWE B2B";
  const rows =
    profile.arrangement === "b2b"
      ? [
          ["Wartość netto usług", money(calculation.vatNet)],
          [
            profile.vat_exempt ? "VAT – zwolnienie" : `VAT ${profile.vat_rate}%`,
            money(calculation.vatAmount),
          ],
          ["Razem do zapłaty", money(calculation.vatGross)],
        ]
      : [
          ["Wynagrodzenie brutto", money(calculation.grossRemuneration)],
          ["Składka emerytalna", `− ${money(calculation.pension)}`],
          ["Składka rentowa", `− ${money(calculation.disability)}`],
          ["Składka chorobowa", `− ${money(calculation.sickness)}`],
          ["Koszty uzyskania przychodu", money(calculation.incomeCosts)],
          ["Podstawa opodatkowania", money(calculation.taxableBase)],
          ["Składka zdrowotna", `− ${money(calculation.health)}`],
          ["Zaliczka PIT", `− ${money(calculation.pitAdvance)}`],
          ["PPK pracownika", `− ${money(calculation.ppk)}`],
          ["Do wypłaty", money(calculation.netPay)],
        ];
  const earningRows = driver.sourceEarnings
    .filter((source) => source.amount > 0)
    .map(
      (source) =>
        `<tr><td>${escapeHtml(source.name)}</td><td class="right">${escapeHtml(money(source.amount))}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${escapeHtml(title)} ${escapeHtml(documentNumber)}</title>
<style>body{font-family:Arial,sans-serif;margin:36px;color:#17202a}h1{font-size:20px;margin:0 0 6px}h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;margin:26px 0 8px;color:#52606d}.top{display:flex;justify-content:space-between;border-bottom:2px solid #17202a;padding-bottom:16px}.meta{text-align:right;font-size:12px;line-height:1.6}.party{display:grid;grid-template-columns:1fr 1fr;gap:24px}.box{border:1px solid #d9e2ec;border-radius:8px;padding:12px;font-size:12px;line-height:1.6}table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #e7edf2;font-size:13px}.right{text-align:right}.total td{font-weight:700;border-top:2px solid #17202a}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:60px;text-align:center;font-size:11px}.line{border-top:1px solid #52606d;padding-top:7px}</style></head><body>
<div class="top"><div><h1>${escapeHtml(title)}</h1><div>Nr ${escapeHtml(documentNumber)}</div></div><div class="meta">Okres: ${escapeHtml(from)} – ${escapeHtml(to)}<br/>Data wystawienia: ${new Date().toLocaleDateString("pl-PL")}</div></div>
<h2>Strony rozliczenia</h2><div class="party"><div class="box"><b>${profile.arrangement === "b2b" ? "Nabywca" : "Płatnik"}</b><br/><strong>${escapeHtml(company.legal_name)}</strong><br/>NIP: ${escapeHtml(company.nip || "—")} · REGON: ${escapeHtml(company.regon || "—")}<br/>${escapeHtml(company.address_line)}<br/>${escapeHtml(`${company.postal_code} ${company.city}`.trim())}</div><div class="box"><b>${profile.arrangement === "b2b" ? "Sprzedawca / wykonawca" : "Pracownik / wykonawca"}</b><br/><strong>${escapeHtml(driver.driver.name)}</strong><br/>${profile.nip ? `NIP: ${escapeHtml(profile.nip)}` : `PESEL: ${escapeHtml(profile.pesel || "—")}`}<br/>${escapeHtml(profile.address_line)}<br/>${escapeHtml(`${profile.postal_code} ${profile.city}`.trim())}<br/>Forma: ${escapeHtml(ARRANGEMENT_LABELS[profile.arrangement])}</div></div>
<h2>Podstawa rozliczenia</h2><table>${earningRows}<tr class="total"><td>Łączne przychody z aplikacji</td><td class="right">${escapeHtml(money(driver.gross))}</td></tr><tr><td>Rozliczenie flotowe przed podatkami</td><td class="right">${escapeHtml(money(driver.payout))}</td></tr></table>
<h2>${profile.arrangement === "b2b" ? "Rozliczenie VAT" : "Rozliczenie podatkowo-składkowe"}</h2><table>${rows
    .map(
      ([label, value], index) =>
        `<tr${index === rows.length - 1 ? ' class="total"' : ""}><td>${escapeHtml(label)}</td><td class="right">${escapeHtml(value)}</td></tr>`,
    )
    .join("")}</table>
${company.bank_account ? `<p><b>Rachunek bankowy:</b> ${escapeHtml(company.bank_account)}</p>` : ""}
<div class="signatures"><div class="line">Osoba sporządzająca</div><div class="line">Odbiorca / wykonawca</div></div>
</body></html>`;
}

export function printPolishDocument(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);
  const documentRef = iframe.contentDocument;
  if (!documentRef || !iframe.contentWindow) return;
  documentRef.open();
  documentRef.write(html);
  documentRef.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1200);
  }, 180);
}
