import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "driver" | "fleet";
export const PENDING_ACCOUNT_TYPE_KEY = "ridetracks_pending_account_type";
const RIDETRACKS_STORAGE_PREFIXES = ["trackuber_v2_", "ridetracks_"];

async function clearRideTracksBrowserData() {
  if (typeof window === "undefined") return;

  for (const key of Object.keys(localStorage)) {
    if (RIDETRACKS_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
  sessionStorage.clear();
  if ("caches" in window) {
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
  }
}

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;
  accountType: AccountType | null;
  needsFleetPartnerName: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAdmin: false,
  accountType: null,
  needsFleetPartnerName: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [needsFleetPartnerName, setNeedsFleetPartnerName] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadRole(uid: string) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (mounted) setIsAdmin(Boolean(data));
    }

    async function loadAccountType(u: User) {
      const { data } = await supabase
        .from("profiles")
        .select("account_type, fleet_partner_name")
        .eq("id", u.id)
        .maybeSingle();

      let type = (data?.account_type as AccountType | undefined) ?? null;

      // A freshly created profile defaults to "driver"; honour the choice made at sign-up.
      const desired =
        (u.user_metadata?.["account_type"] as AccountType | undefined) ??
        (typeof window !== "undefined"
          ? (localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) as AccountType | null)
          : null);

      const fleetPartnerName = (
        u.user_metadata?.["fleet_partner_name"] ?? u.user_metadata?.["fleet_name"]
      ) as string | undefined;
      const profileUpdates: { account_type?: AccountType; fleet_partner_name?: string } = {};

      if (desired && type !== desired) {
        profileUpdates.account_type = desired;
        type = desired;
      }
      if (fleetPartnerName?.trim() && data?.fleet_partner_name !== fleetPartnerName.trim()) {
        profileUpdates.fleet_partner_name = fleetPartnerName.trim();
      }
      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from("profiles").update(profileUpdates).eq("id", u.id);
      }
      if (typeof window !== "undefined") localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
      if (mounted) {
        setAccountType(type ?? "driver");
        setNeedsFleetPartnerName(!data?.fleet_partner_name?.trim());
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        Promise.all([loadRole(u.id), loadAccountType(u)]).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadRole(u.id);
        loadAccountType(u);
      } else {
        setIsAdmin(false);
        setAccountType(null);
        setNeedsFleetPartnerName(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        isAdmin,
        accountType,
        needsFleetPartnerName,
        loading,
        signOut: async () => {
          try {
            const { error } = await supabase.auth.signOut({ scope: "local" });
            if (error) throw error;
          } finally {
            // The local app must not retain user data, even if the network request fails.
            await clearRideTracksBrowserData();
          }
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
