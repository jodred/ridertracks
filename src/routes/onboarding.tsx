import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — RideTracks" },
      { name: "description", content: "Complete your RideTracks onboarding" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, accountType: authAccountType } = useAuth();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [fleetName, setFleetName] = useState("");
  const [accountType, setAccountType] = useState<"driver" | "fleet">("driver");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const u = user ?? (await supabase.auth.getUser()).data.user;
      if (!u) {
        // Not authenticated: go to auth
        navigate({ to: "/auth", replace: true });
        return;
      }

      // determine accountType: prefer AuthProvider value, else localStorage pending key, else profiles table
      const pending = typeof window !== "undefined" ? (localStorage.getItem("ridetracks_pending_account_type") as "driver" | "fleet" | null) : null;
      const chosen = authAccountType ?? pending ?? "driver";
      setAccountType(chosen as "driver" | "fleet");

      // fetch existing profile and user_data to prefill fields
      const [{ data: p }, { data: ud }] = await Promise.all([
        supabase.from("profiles").select("display_name,account_type").eq("id", u.id).maybeSingle(),
        supabase.from("user_data").select("fleet,profile").eq("user_id", u.id).maybeSingle(),
      ]);

      const meta = u.user_metadata ?? {};
      const preName = (ud?.profile as any)?.driverName ?? p?.display_name ?? (meta["display_name"] as string) ?? "";
      const preFleet = (ud?.fleet as any)?.fleetName ?? (ud?.profile as any)?.fleetName ?? (meta["fleet_name"] as string) ?? "";

      setName(String(preName ?? ""));
      setFleetName(String(preFleet ?? ""));
      setLoading(false);
    }
    load();
  }, [user, authAccountType, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const trimmedName = name.trim();
    const trimmedFleet = fleetName.trim();
    if (!trimmedName) {
      setBusy(false);
      return toast.error("Name is required");
    }
    if (!trimmedFleet) {
      setBusy(false);
      return toast.error("Fleet Name / Company Name is required");
    }

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) {
      setBusy(false);
      return toast.error("Not authenticated");
    }

    try {
      // Update profiles table with display_name and account_type
      await supabase.from("profiles").update({ display_name: trimmedName, account_type: accountType }).eq("id", uid);

      // Merge with existing user_data if present
      const { data: existing } = await supabase.from("user_data").select("entries,fleet,profile,workspace").eq("user_id", uid).maybeSingle();
      const workspace = existing?.workspace ?? "rides";
      const nextFleet = { ...(existing?.fleet as any ?? {}), fleetName: trimmedFleet };
      const nextProfile = { ...(existing?.profile as any ?? {}), driverName: trimmedName, fleetName: trimmedFleet, email: u.user?.email ?? "" };

      await supabase.from("user_data").upsert({
        user_id: uid,
        workspace,
        entries: existing?.entries ?? {},
        fleet: nextFleet,
        profile: nextProfile,
      }, { onConflict: "user_id,workspace" });

      // clear pending key
      if (typeof window !== "undefined") localStorage.removeItem("ridetracks_pending_account_type");

      // navigate to appropriate dashboard
      if (accountType === "fleet") navigate({ to: "/fleet", replace: true });
      else navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Failed to complete onboarding");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold">Complete your RideTracks profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">This information is required to continue.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onb-name">Name</Label>
              <Input id="onb-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onb-fleet">Fleet Name / Company Name</Label>
              <Input id="onb-fleet" required value={fleetName} onChange={(e) => setFleetName(e.target.value)} placeholder="Enter fleet/company name" />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>Continue</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
