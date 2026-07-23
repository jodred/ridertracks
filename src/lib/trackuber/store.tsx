import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState, DateRange, DateRangePreset, DayEntry, Deduction, FleetSettings, Profile } from "./types";
import { computeRange, todayISO } from "./calc";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_PREFIX = "trackuber_v2_state:";
const RANGE_PREFIX = "trackuber_v2_range:";
const GUEST_KEY = "guest";

const defaultFleet: FleetSettings = {
  fleetName: "Eternis",
  weeklyAppFee: 50,
  currency: "zł",
  firstDayOfWeek: 1,
  deductions: [
    { id: "d1", name: "Fleet Commission", type: "percent", value: 7, applyTo: "gross" },
  ],
  categories: ["Fuel", "Food", "Repairs", "Other"],
};

const defaultProfile: Profile = {
  driverName: "Driver",
  email: "",
  fleetName: "Eternis",
  vehicle: "",
  registration: "",
  memberSince: new Date().toISOString().slice(0, 10),
  theme: "light",
};

const defaultState: AppState = {
  entries: {},
  fleet: defaultFleet,
  profile: defaultProfile,
};

function loadState(userKey: string): AppState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userKey);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as AppState;
    return {
      entries: parsed.entries ?? {},
      fleet: { ...defaultFleet, ...parsed.fleet, deductions: parsed.fleet?.deductions ?? defaultFleet.deductions, categories: parsed.fleet?.categories ?? defaultFleet.categories },
      profile: { ...defaultProfile, ...parsed.profile },
    };
  } catch {
    return defaultState;
  }
}

function loadRange(userKey: string): DateRange {
  if (typeof window === "undefined") return computeRange("thisMonth");
  try {
    const raw = localStorage.getItem(RANGE_PREFIX + userKey);
    if (raw) return JSON.parse(raw) as DateRange;
  } catch {}
  return computeRange("thisMonth");
}

interface StoreCtx {
  state: AppState;
  range: DateRange;
  setRange: (r: DateRange) => void;
  setPreset: (p: DateRangePreset) => void;
  setCustomRange: (from: string, to: string) => void;
  upsertEntry: (entry: DayEntry) => void;
  deleteEntry: (date: string) => void;
  updateFleet: (f: Partial<FleetSettings>) => void;
  addDeduction: (d: Deduction) => void;
  updateDeduction: (id: string, patch: Partial<Deduction>) => void;
  removeDeduction: (id: string) => void;
  reorderDeductions: (ids: string[]) => void;
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

export function TrackUberProvider({ children }: { children: ReactNode }) {
  const [userKey, setUserKey] = useState<string>(GUEST_KEY);
  const [state, setState] = useState<AppState>(defaultState);
  const [range, setRangeState] = useState<DateRange>(() => computeRange("thisMonth"));
  const [hydrated, setHydrated] = useState(false);
  const remoteReadyRef = useRef(false);

  async function loadRemote(uid: string): Promise<AppState | null> {
    const { data, error } = await supabase
      .from("user_data")
      .select("entries, fleet, profile")
      .eq("user_id", uid)
      .maybeSingle();
    if (error || !data) return null;
    return {
      entries: (data.entries as AppState["entries"]) ?? {},
      fleet: { ...defaultFleet, ...(data.fleet as Partial<FleetSettings>) },
      profile: { ...defaultProfile, ...(data.profile as Partial<Profile>) },
    };
  }

  async function hydrateFor(uid: string | null) {
    const key = uid ?? GUEST_KEY;
    setUserKey(key);
    const local = loadState(key);
    setState(local);
    setRangeState(loadRange(key));
    setHydrated(true);
    if (uid) {
      remoteReadyRef.current = false;
      const remote = await loadRemote(uid);
      if (remote) {
        setState(remote);
      } else {
        await supabase.from("user_data").upsert({
          user_id: uid,
          entries: local.entries,
          fleet: local.fleet,
          profile: local.profile,
        });
      }
      remoteReadyRef.current = true;
    } else {
      remoteReadyRef.current = false;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      hydrateFor(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      hydrateFor(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_PREFIX + userKey, JSON.stringify(state));
    if (userKey !== GUEST_KEY && remoteReadyRef.current) {
      const t = setTimeout(() => {
        supabase
          .from("user_data")
          .upsert({
            user_id: userKey,
            entries: state.entries,
            fleet: state.fleet,
            profile: state.profile,
          })
          .then(({ error }) => {
            if (error) console.error("Sync failed:", error);
          });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [state, hydrated, userKey]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(RANGE_PREFIX + userKey, JSON.stringify(range));
  }, [range, hydrated, userKey]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", state.profile.theme === "dark");
  }, [state.profile.theme, hydrated]);

  const api = useMemo<StoreCtx>(() => ({
    state,
    range,
    setRange: (r) => setRangeState(r),
    setPreset: (p) => setRangeState(computeRange(p, undefined, undefined, state.fleet.firstDayOfWeek)),
    setCustomRange: (from, to) => setRangeState({ preset: "custom", from, to }),
    upsertEntry: (entry) =>
      setState((s) => ({ ...s, entries: { ...s.entries, [entry.date]: { ...entry, updatedAt: Date.now() } } })),
    deleteEntry: (date) =>
      setState((s) => {
        const next = { ...s.entries };
        delete next[date];
        return { ...s, entries: next };
      }),
    updateFleet: (f) => setState((s) => ({ ...s, fleet: { ...s.fleet, ...f } })),
    addDeduction: (d) => setState((s) => ({ ...s, fleet: { ...s.fleet, deductions: [...s.fleet.deductions, d] } })),
    updateDeduction: (id, patch) =>
      setState((s) => ({
        ...s,
        fleet: {
          ...s.fleet,
          deductions: s.fleet.deductions.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        },
      })),
    removeDeduction: (id) =>
      setState((s) => ({
        ...s,
        fleet: { ...s.fleet, deductions: s.fleet.deductions.filter((d) => d.id !== id) },
      })),
    reorderDeductions: (ids) =>
      setState((s) => ({
        ...s,
        fleet: {
          ...s.fleet,
          deductions: ids
            .map((id) => s.fleet.deductions.find((d) => d.id === id))
            .filter(Boolean) as Deduction[],
        },
      })),
    addCategory: (name) =>
      setState((s) => ({
        ...s,
        fleet: {
          ...s.fleet,
          categories: s.fleet.categories.includes(name) ? s.fleet.categories : [...s.fleet.categories, name],
        },
      })),
    removeCategory: (name) =>
      setState((s) => ({
        ...s,
        fleet: { ...s.fleet, categories: s.fleet.categories.filter((c) => c !== name) },
      })),
    updateProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
    exportData: () => JSON.stringify(state, null, 2),
    importData: (json) => {
      try {
        const parsed = JSON.parse(json) as AppState;
        setState({
          entries: parsed.entries ?? {},
          fleet: { ...defaultFleet, ...parsed.fleet },
          profile: { ...defaultProfile, ...parsed.profile },
        });
        return true;
      } catch {
        return false;
      }
    },
  }), [state, range]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within TrackUberProvider");
  return ctx;
}

export { todayISO };