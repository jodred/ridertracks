import type { AppState, DateRange, DateRangePreset, DayEntry, Deduction, FleetSettings } from "./types";

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, days: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function startOfWeek(s: string, firstDay: 0 | 1 = 1): string {
  const d = parseISO(s);
  const dow = d.getDay();
  const diff = (dow - firstDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return todayISO(d);
}

export function endOfWeek(s: string, firstDay: 0 | 1 = 1): string {
  return addDays(startOfWeek(s, firstDay), 6);
}

export function startOfMonth(s: string): string {
  const d = parseISO(s);
  d.setDate(1);
  return todayISO(d);
}

export function endOfMonth(s: string): string {
  const d = parseISO(s);
  d.setMonth(d.getMonth() + 1, 0);
  return todayISO(d);
}

export function computeRange(
  preset: DateRangePreset,
  from?: string,
  to?: string,
  firstDay: 0 | 1 = 1,
): DateRange {
  const today = todayISO();
  switch (preset) {
    case "today":
      return { preset, from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { preset, from: y, to: y };
    }
    case "thisWeek":
      return { preset, from: startOfWeek(today, firstDay), to: endOfWeek(today, firstDay) };
    case "lastWeek": {
      const lw = addDays(startOfWeek(today, firstDay), -7);
      return { preset, from: lw, to: addDays(lw, 6) };
    }
    case "thisMonth":
      return { preset, from: startOfMonth(today), to: endOfMonth(today) };
    case "lastMonth": {
      const d = parseISO(today);
      d.setMonth(d.getMonth() - 1);
      const s = todayISO(d);
      return { preset, from: startOfMonth(s), to: endOfMonth(s) };
    }
    case "custom":
      return { preset, from: from ?? today, to: to ?? today };
  }
}

export function inRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

export function entriesInRange(entries: Record<string, DayEntry>, range: DateRange): DayEntry[] {
  return Object.values(entries)
    .filter((e) => inRange(e.date, range))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function entriesInPeriod(
  entries: Record<string, DayEntry>,
  from: string,
  to: string,
): DayEntry[] {
  return Object.values(entries)
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface DeductionResult {
  id: string;
  name: string;
  amount: number;
}

export function applyDeductions(gross: number, deductions: Deduction[]): {
  results: DeductionResult[];
  total: number;
  net: number;
} {
  let net = gross;
  const results: DeductionResult[] = [];
  for (const d of deductions) {
    const base = d.applyTo === "gross" ? gross : net;
    const amount = d.type === "percent" ? (base * d.value) / 100 : d.value;
    results.push({ id: d.id, name: d.name, amount });
    net -= amount;
  }
  return { results, total: results.reduce((s, r) => s + r.amount, 0), net };
}

/**
 * For a given date, is it the first working day (gross > 0) in its calendar week?
 * Working day = has an entry with gross > 0.
 */
export function isFirstWorkingDayOfWeek(
  date: string,
  entries: Record<string, DayEntry>,
  firstDay: 0 | 1 = 1,
): boolean {
  const entry = entries[date];
  if (!entry || entry.gross <= 0) return false;
  const weekStart = startOfWeek(date, firstDay);
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (d === date) return true;
    const e = entries[d];
    if (e && e.gross > 0) return false;
  }
  return false;
}

/**
 * Get all "first working day" dates for weeks that intersect a range.
 * These are dates on which the weekly fee is charged.
 */
export function weeklyFeeDatesInRange(
  entries: Record<string, DayEntry>,
  range: DateRange,
  firstDay: 0 | 1 = 1,
): string[] {
  // find each week overlapping range
  const seen = new Set<string>();
  const results: string[] = [];
  let cursor = startOfWeek(range.from, firstDay);
  while (cursor <= range.to) {
    const weekStart = cursor;
    if (!seen.has(weekStart)) {
      seen.add(weekStart);
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        const e = entries[d];
        if (e && e.gross > 0) {
          if (d >= range.from && d <= range.to) results.push(d);
          break;
        }
      }
    }
    cursor = addDays(cursor, 7);
  }
  return results;
}

export interface PeriodSummary {
  gross: number; // raw gross entered by user
  netGross: number; // gross minus fleet deductions (commission)
  cashCollected: number;
  fleetDeductions: DeductionResult[];
  fleetDeductionsTotal: number;
  weeklyFees: number;
  weeklyFeeCount: number;
  fleetTake: number; // fleetDeductionsTotal + weeklyFees
  operatingExpenses: number;
  expensesByCategory: Record<string, number>;
  cardRevenue: number;
  totalExpenses: number; // operating only (fleet fees excluded)
  expectedPartnerPayment: number;
  netProfit: number;
  cashWallet: number;
  daily: DailySummary[];
}

export interface DailySummary {
  date: string;
  gross: number; // raw gross entered by user
  netGross: number; // gross minus fleet deductions
  cash: number;
  expenses: number;
  profit: number;
  partnerPayment: number;
}

function cashPortion(ex: { paymentMethod: string; amount: number; cashAmount?: number }): number {
  if (ex.paymentMethod === "cash") return ex.amount;
  if (ex.paymentMethod === "split") return ex.cashAmount ?? 0;
  return 0;
}

/**
 * Cash wallet = cumulative cashCollected − cumulative cash-paid expenses, from all history up to range.to.
 */
export function computeCashWallet(entries: Record<string, DayEntry>, upToDate: string): number {
  let wallet = 0;
  const sorted = Object.values(entries)
    .filter((e) => e.date <= upToDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    wallet += e.cashCollected;
    for (const ex of e.expenses) {
      wallet -= cashPortion(ex);
    }
  }
  return wallet;
}

/**
 * Wallet available at the moment a specific expense on `date` is paid.
 * Considers all prior days + today's cashCollected + prior expenses today.
 */
export function walletBeforeExpense(
  entries: Record<string, DayEntry>,
  date: string,
  expensesToday: { paymentMethod: string; amount: number; cashAmount?: number }[],
  currentIdx: number,
  cashCollectedToday: number,
): number {
  let wallet = 0;
  const prior = Object.values(entries)
    .filter((e) => e.date < date)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const e of prior) {
    wallet += e.cashCollected;
    for (const ex of e.expenses) wallet -= cashPortion(ex);
  }
  wallet += cashCollectedToday || 0;
  for (let i = 0; i < currentIdx; i++) wallet -= cashPortion(expensesToday[i]);
  return wallet;
}

export function summarize(state: AppState, range: DateRange): PeriodSummary {
  const list = entriesInRange(state.entries, range);
  const feeDates = new Set(weeklyFeeDatesInRange(state.entries, range, state.fleet.firstDayOfWeek));
  const weeklyFee = state.fleet.weeklyAppFee;

  let gross = 0;
  let netGross = 0;
  let cashCollected = 0;
  let operatingExpenses = 0;
  const expensesByCategory: Record<string, number> = {};
  const daily: DailySummary[] = [];

  for (const e of list) {
    gross += e.gross;
    cashCollected += e.cashCollected;
    let dayExpenses = 0;
    for (const ex of e.expenses) {
      operatingExpenses += ex.amount;
      dayExpenses += ex.amount;
      expensesByCategory[ex.category] = (expensesByCategory[ex.category] ?? 0) + ex.amount;
    }
    const feeToday = feeDates.has(e.date) ? weeklyFee : 0;
    const dayDed = applyDeductions(e.gross, state.fleet.deductions);
    const dayNetGross = e.gross - dayDed.total;
    netGross += dayNetGross;
    const dayProfit = e.gross - dayDed.total - dayExpenses - feeToday;
    const dayPartner = e.gross - e.cashCollected - dayDed.total - feeToday;
    daily.push({
      date: e.date,
      gross: e.gross,
      netGross: dayNetGross,
      cash: e.cashCollected,
      expenses: dayExpenses,
      profit: dayProfit,
      partnerPayment: dayPartner,
    });
  }

  const weeklyFeeCount = feeDates.size;
  const weeklyFees = weeklyFeeCount * weeklyFee;

  // Aggregate deductions across days
  const dedMap = new Map<string, DeductionResult>();
  for (const e of list) {
    const r = applyDeductions(e.gross, state.fleet.deductions);
    for (const item of r.results) {
      const prev = dedMap.get(item.id) ?? { id: item.id, name: item.name, amount: 0 };
      prev.amount += item.amount;
      dedMap.set(item.id, prev);
    }
  }
  const fleetDeductions = Array.from(dedMap.values());
  const fleetDeductionsTotal = fleetDeductions.reduce((s, r) => s + r.amount, 0);

  const cardRevenue = gross - cashCollected;
  const totalExpenses = operatingExpenses;
  const fleetTake = fleetDeductionsTotal + weeklyFees;
  const expectedPartnerPayment = gross - cashCollected - fleetDeductionsTotal - weeklyFees;
  const netProfit = gross - fleetDeductionsTotal - weeklyFees - operatingExpenses;
  const cashWallet = computeCashWallet(state.entries, range.to);

  return {
    gross,
    cashCollected,
    fleetDeductions,
    fleetDeductionsTotal,
    weeklyFees,
    weeklyFeeCount,
    fleetTake,
    operatingExpenses,
    expensesByCategory,
    cardRevenue,
    totalExpenses,
    expectedPartnerPayment,
    netProfit,
    cashWallet,
    daily,
  };
}

export function formatMoney(amount: number, currency = "zł"): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return `${sign}${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function formatDate(iso: string): string {
  const d = parseISO(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  const d = parseISO(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}