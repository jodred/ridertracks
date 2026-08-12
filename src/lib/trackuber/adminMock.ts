import type { AppState, DayEntry, FleetSettings, Profile } from "./types";
import { addDays, todayISO } from "./calc";

export interface Rider {
  id: string;
  profile: Profile;
  fleet: FleetSettings;
  entries: Record<string, DayEntry>;
}

function defaultFleet(name: string, appFee: number, commission: number): FleetSettings {
  return {
    fleetName: name,
    weeklyAppFee: appFee,
    currency: "zł",
    firstDayOfWeek: 1,
    deductions: [{ id: "d1", name: "Fleet Commission", type: "percent", value: commission, applyTo: "gross" }],
    categories: ["Fuel", "Food", "Repairs", "Other"],
  };
}

// Deterministic pseudo-random from seed
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateEntries(seed: number, days = 30, avgGross = 500, cashRatio = 0.2): Record<string, DayEntry> {
  const rnd = seeded(seed);
  const entries: Record<string, DayEntry> = {};
  const today = todayISO();
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    // Skip ~1 in 7 (day off)
    if (rnd() < 0.12) continue;
    const gross = Math.round((avgGross * (0.7 + rnd() * 0.7)) * 100) / 100;
    const cashCollected = Math.round((gross * cashRatio * (0.6 + rnd())) * 100) / 100;
    const expenses = [
      {
        id: `${seed}-f-${i}`,
        category: "Fuel",
        amount: Math.round((40 + rnd() * 60) * 100) / 100,
        paymentMethod: (rnd() > 0.5 ? "card" : "cash") as "card" | "cash",
      },
    ];
    if (rnd() > 0.5) {
      expenses.push({
        id: `${seed}-fd-${i}`,
        category: "Food",
        amount: Math.round((10 + rnd() * 20) * 100) / 100,
        paymentMethod: "card",
      });
    }
    entries[date] = { date, gross, cashCollected, expenses, updatedAt: Date.now() };
  }
  return entries;
}

export const mockRiders: Rider[] = [
  {
    id: "rider-1",
    profile: {
      driverName: "Marek Kowalski",
      email: "marek@example.com",
      fleetName: "",
      vehicle: "Toyota Corolla",
      registration: "WA 1234A",
      memberSince: "2025-03-14",
      theme: "light",
    },
    fleet: defaultFleet("", 50, 7),
    entries: generateEntries(101, 30, 620, 0.22),
  },
  {
    id: "rider-2",
    profile: {
      driverName: "Anna Nowak",
      email: "anna@example.com",
      fleetName: "CityRide",
      vehicle: "Skoda Octavia",
      registration: "WA 5678B",
      memberSince: "2024-11-02",
      theme: "light",
    },
    fleet: defaultFleet("CityRide", 40, 8),
    entries: generateEntries(202, 30, 540, 0.18),
  },
  {
    id: "rider-3",
    profile: {
      driverName: "Piotr Zieliński",
      email: "piotr@example.com",
      fleetName: "Freelance",
      vehicle: "Kia Ceed",
      registration: "WA 9012C",
      memberSince: "2026-01-20",
      theme: "light",
    },
    fleet: defaultFleet("Freelance", 0, 0),
    entries: generateEntries(303, 30, 460, 0.35),
  },
];

export function currentUserAsRider(state: AppState): Rider {
  return {
    id: "me",
    profile: state.profile,
    fleet: state.fleet,
    entries: state.entries,
  };
}
