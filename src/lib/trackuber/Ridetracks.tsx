import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppState, DateRange, DateRangePreset, DayEntry, Deduction, FleetSettings, Profile } from "./types";
import { computeRange, todayISO } from "./calc";
import { supabase } from "@/integrations/supabase/client";

export type Workspace = "rides" | "foods";

const STORAGE_PREFIX = "trackuber_v2_state:";
const RANGE_PREFIX = "trackuber_v2_range:";
const WORKSPACE_PREFIX = "trackuber_v2_workspace:";
const GUEST_KEY = "guest";

const ridesFleet: FleetSettings = {
  fleetName: "",
  weeklyAppFee: 0,
  currency: "zł",
  firstDayOfWeek: 1,
  deductions: [
    { id: "d1", name: "Fleet Commission", type: "percent", value: 0, applyTo: "gross" },
  ],
  categories: ["Fuel", "Food", "Repairs", "Other"],
};

const foodsFleet: FleetSettings = {
  fleetName: "",
  weeklyAppFee: 0,
  currency: "zł",
  firstDayOfWeek: 1,
  deductions: [],
  categories: ["Fuel", "Bike/Scooter", "Repairs", "Phone", "Other"],
};

const ridesProfile: Profile = {
  driverName: "",
  email: "",
  fleetName: "",
  vehicle: "",
  registration: "",
  memberSince: new Date().toISOString().slice(0, 10),
  theme: "light",
};

const foodsProfile: Profile = {
  ...ridesProfile,
};


function defaultFleetFor(ws: Workspace): FleetSettings {
  return ws === "foods" ? foodsFleet : ridesFleet;
}
function defaultProfileFor(ws: Workspace): Profile {
  return ws === "foods" ? foodsProfile : ridesProfile;
}
function defaultStateFor(ws: Workspace): AppState {
  return { entries: {}, fleet: defaultFleetFor(ws), profile: defaultProfileFor(ws) };
}

function stateKey(userKey: string, ws: Workspace) {
  return `${STORAGE_PREFIX}${userKey}:${ws}`;
}
function rangeKey(userKey: string, ws: Workspace) {
  return `${RANGE_PREFIX}${userKey}:${ws}`;
}

function loadState(userKey: string, ws: Workspace): AppState {
  if (typeof window === "undefined") return defaultStateFor(ws);
  try {
    // migrate legacy key (pre-workspace) into 'rides'
    const legacy = ws === "rides" ? localStorage.getItem(STORAGE_PREFIX + userKey) : null;
    const raw = localStorage.getItem(stateKey(userKey, ws)) ?? legacy;
    if (!raw) return defaultStateFor(ws);
    const parsed = JSON.parse(raw) as AppState;
    const dFleet = defaultFleetFor(ws);
    const dProfile = defaultProfileFor(ws);
    return {
      entries: parsed.entries ?? {},
      fleet: {
        ...dFleet,
        ...parsed.fleet,
        deductions: parsed.fleet?.deductions ?? dFleet.deductions,
        categories: parsed.fleet?.categories ?? dFleet.categories,
      },
      profile: { ...dProfile, ...parsed.profile },
    };
  } catch {
    return defaultStateFor(ws);
  }
}

function loadRange(userKey: string, ws: Workspace): DateRange {
  if (typeof window === "undefined") return computeRange("thisMonth");
  try {
    const legacy = ws === "rides" ? localStorage.getItem(RANGE_PREFIX + userKey) : null;
    const raw = localStorage.getItem(rangeKey(userKey, ws)) ?? legacy;
    if (raw) return JSON.parse(raw) as DateRange;
  } catch {}
  return computeRange("thisMonth");
}

function loadWorkspace(userKey: string): Workspace {
  if (typeof window === "undefined") return "rides";
  try {
    const raw = localStorage.getItem(WORKSPACE_PREFIX + userKey);
    if (raw === "foods" || raw === "rides") return raw;
  } catch {}
  return "rides";
}

interface StoreCtx {
  state: AppState;
  range: DateRange;
  workspace: Workspace;
  setWorkspace: (ws: Workspace) => void;
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
  const [workspace, setWorkspaceState] = useState<Workspace>("rides");
  const [state, setState] = useState<AppState>(() => defaultStateFor("rides"));
  const [range, setRangeState] = useState<DateRange>(() => computeRange("thisMonth"));
  const [hydrated, setHydrated] = useState(false);
  const remoteReadyRef = useRef(false);

  async function loadRemote(uid: string, ws: Workspace): Promise<AppState | null> {
    const { data, error } = await supabase
      .from("user_data")
      .select("entries, fleet, profile")
      .eq("user_id", uid)
      .eq("workspace", ws)
      .maybeSingle();
    if (error || !data) return null;
    const dFleet = defaultFleetFor(ws);
    const dProfile = defaultProfileFor(ws);
    return {
      entries: (data.entries as unknown as AppState["entries"]) ?? {},
      fleet: { ...dFleet, ...((data.fleet as unknown) as Partial<FleetSettings>) },
      profile: { ...dProfile, ...((data.profile as unknown) as Partial<Profile>) },
    };
  }

  async function hydrateFor(uid: string | null, ws: Workspace) {
    const key = uid ?? GUEST_KEY;
    setUserKey(key);
    setWorkspaceState(ws);
    const local = loadState(key, ws);
    setState(local);
    setRangeState(loadRange(key, ws));
    setHydrated(true);
    if (uid) {
      remoteReadyRef.current = false;
      const remote = await loadRemote(uid, ws);
      if (remote) {
        setState(remote);
      } else {
        await supabase.from("user_data").upsert(
          {
            user_id: uid,
            workspace: ws,
            entries: local.entries as any,
            fleet: local.fleet as any,
            profile: local.profile as any,
          },
          { onConflict: "user_id,workspace" },
        );
      }
      remoteReadyRef.current = true;
    } else {
      remoteReadyRef.current = false;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      const ws = loadWorkspace(uid ?? GUEST_KEY);
      hydrateFor(uid, ws);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      const ws = loadWorkspace(uid ?? GUEST_KEY);
      hydrateFor(uid, ws);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(stateKey(userKey, workspace), JSON.stringify(state));
    if (userKey !== GUEST_KEY && remoteReadyRef.current) {
      const t = setTimeout(() => {
        supabase
          .from("user_data")
          .upsert(
            {
              user_id: userKey,
              workspace,
              entries: state.entries as any,
              fleet: state.fleet as any,
              profile: state.profile as any,
            },
            { onConflict: "user_id,workspace" },
          )
          .then(({ error }) => {
            if (error) console.error("Sync failed:", error);
          });
      }, 500);
      return () => clearTimeout(t);
    }
  }, [state, hydrated, userKey, workspace]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(rangeKey(userKey, workspace), JSON.stringify(range));
  }, [range, hydrated, userKey, workspace]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WORKSPACE_PREFIX + userKey, workspace);
  }, [workspace, hydrated, userKey]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", state.profile.theme === "dark");
  }, [state.profile.theme, hydrated]);

  function setWorkspace(ws: Workspace) {
    if (ws === workspace) return;
    hydrateFor(userKey === GUEST_KEY ? null : userKey, ws);
  }

  const api = useMemo<StoreCtx>(() => ({
    state,
    range,
    workspace,
    setWorkspace,
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
        const dFleet = defaultFleetFor(workspace);
        const dProfile = defaultProfileFor(workspace);
        setState({
          entries: parsed.entries ?? {},
          fleet: { ...dFleet, ...parsed.fleet },
          profile: { ...dProfile, ...parsed.profile },
        });
        return true;
      } catch {
        return false;
      }
    },
  }), [state, range, workspace, userKey]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within TrackUberProvider");
  return ctx;
}

export { todayISO };
