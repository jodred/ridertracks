import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "driver" | "fleet";
export const PENDING_ACCOUNT_TYPE_KEY = "ridetracks_pending_account_type";

interface AuthCtx {
  user: User | null;
  isAdmin: boolean;
  accountType: AccountType | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAdmin: false,
  accountType: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
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
        .select("account_type")
        .eq("id", u.id)
        .maybeSingle();

      let type = (data?.account_type as AccountType | undefined) ?? null;

      // A freshly created profile defaults to "driver"; honour the choice made at sign-up.
      const desired =
        (u.user_metadata?.["account_type"] as AccountType | undefined) ??
        (typeof window !== "undefined"
          ? (localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) as AccountType | null)
          : null);

      const fleetNameFromMeta = u.user_metadata?.["fleet_name"] as string | undefined;

      if (desired === "fleet" && type !== "fleet") {
        await supabase
          .from("profiles")
          .update({ account_type: "fleet", display_name: fleetNameFromMeta || data?.display_name })
          .eq("id", u.id);
        type = "fleet";
      }
      if (typeof window !== "undefined") localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
      if (mounted) setAccountType(type ?? "driver");
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
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
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
