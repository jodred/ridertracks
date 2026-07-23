export type PaymentMethod = "cash" | "card" | "split";

export type DeductionType = "percent" | "fixed";
export type DeductionApplyTo = "gross" | "net";

export interface Deduction {
  id: string;
  name: string;
  type: DeductionType;
  value: number;
  applyTo: DeductionApplyTo;
}

export interface ExpenseItem {
  id: string;
  category: string; // fuel | food | repairs | other | custom
  amount: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number; // for split: portion paid from wallet cash
  cardAmount?: number; // for split: portion paid by card
  invoice?: string; // data URL
  note?: string;
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  gross: number;
  cashCollected: number;
  expenses: ExpenseItem[];
  updatedAt: number;
}

export interface FleetSettings {
  fleetName: string;
  weeklyAppFee: number;
  currency: string;
  firstDayOfWeek: 0 | 1; // 0 Sun, 1 Mon
  deductions: Deduction[];
  categories: string[]; // available expense categories
}

export interface Profile {
  driverName: string;
  email: string;
  fleetName: string;
  vehicle: string;
  registration: string;
  memberSince: string;
  theme: "light" | "dark";
}

export interface AppState {
  entries: Record<string, DayEntry>;
  fleet: FleetSettings;
  profile: Profile;
}

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export interface DateRange {
  preset: DateRangePreset;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}
