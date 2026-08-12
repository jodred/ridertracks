import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountType, PENDING_ACCOUNT_TYPE_KEY as _PENDING } from "@/lib/auth/AuthProvider";
import { PENDING_ACCOUNT_TYPE_KEY } from "@/lib/auth/AuthProvider";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding — RideTracks" },
      { name: "description", content: "Finish setting up your RideTracks account." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const [name, setName] = useState("");
  const [fleetName, setFleetName] = useState("");

  // Basic guard: ensure user is signed in
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getUser();
        const user = sessionData?.user ?? null;
        if (!user) {
          toast.error("You must be signed in to finish onboarding.");
          navigate({ to: "/auth", replace: true });
          return;
        }

        // Determine account type: profiles.account_type -> user_metadata -> localStorage -> default "driver"
        const [{ data: profileRow }, { data: udRow }] = await Promise.all([
          supabase.from("profiles").select("account_type,display_name").eq("id", user.id).maybeSingle(),
          supabase.from("user_data").select("profile,fleet").eq("user_id", user.id).maybeSingle(),
        ]);

        const fromProfile = profileRow?.account_type as AccountType | undefined;
        const fromMeta = (user.user_metadata?.["account_type"] as AccountType | undefined) ?? undefined;
        const fromStorage =
          typeof window !== "undefined"
            ? ((localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) as AccountType | null) ?? null)
            : null;

        const resolved: AccountType = fromProfile ?? fromMeta ?? (fromStorage ?? "driver");
        if (mounted) setAccountType(resolved);

        // Prefill name and fleetName from user_data or profile display_name or metadata
        const existingName =
          (udRow?.profile as any)?.driverName ??
          (udRow?.profile as any)?.display_name ??
          (profileRow?.display_name as string) ??
          (user.user_metadata?.["display_name"] as string) ??
          "";

        const existingFleet =
          (udRow?.fleet as any)?.fleetName ??
          (udRow?.profile as any)?.fleetName ??
          (user.user_metadata?.["fleet_name"] as string) ??
          "";

        if (mounted) {
          setName(existingName);
          setFleetName(existingFleet);
        }
      } catch (err: any) {
        console.error("Onboarding load error", err);
        toast.error("Failed to load onboarding data.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountType) return toast.error("Account type not resolved.");

    const trimmedName = name.trim();
    const trimmedFleet = fleetName.trim();

    if (!trimmedName) return toast.error("Name is required");
    if (!trimmedFleet) return toast.error("Fleet Name / Company Name is required");

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const user = sessionData?.user ?? null;
      if (!user) {
        toast.error("You must be signed in to complete onboarding.");
        navigate({ to: "/auth", replace: true });
        return;
      }
      const uid = user.id;

      // 1) Update profiles table (display_name, account_type)
      const profileUpdate: Record<string, any> = { display_name: trimmedName };
      if (accountType) profileUpdate.account_type = accountType;

      await supabase.from("profiles").upsert({ id: uid, ...profileUpdate }, { onConflict: "id" });

      // 2) Merge + upsert user_data.profile and user_data.fleet
      // Fetch existing row to preserve other fields
      const { data: udExisting } = await supabase.from("user_data").select("profile,fleet,workspace").eq("user_id", uid).maybeSingle();

      const existingProfile = (udExisting?.profile as any) ?? {};
      const existingFleet = (udExisting?.fleet as any) ?? {};

      // Keep any existing fields but ensure we set canonical values:
      const newProfile = {
        ...existingProfile,
        display_name: trimmedName,
        driverName: trimmedName,
        // keep other profile fields intact
      };

      const newFleet = {
        ...existingFleet,
        fleetName: trimmedFleet,
        // keep other fleet settings intact
      };

      // Upsert user_data row
      await supabase
        .from("user_data")
        .upsert(
          {
            user_id: uid,
            profile: newProfile,
            fleet: newFleet,
            // Note: workspace left alone if present in existing row; upsert won't remove it
          },
          { onConflict: "user_id" }
        );

      // 3) If account_type not set in profiles previously, ensure it's stored
      // Upsert already handled account_type above.

      // 4) Remove pending account type from localStorage (client-only)
      if (typeof window !== "undefined") localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);

      toast.success("Onboarding complete.");

      // 5) Redirect according to account type
      if (accountType === "fleet") {
        navigate({ to: "/fleet", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      console.error("Onboarding submit error", err);
      toast.error(err?.message || "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">RideTracks</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight">Finish account setup</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide the required details to complete your onboarding.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="onb-name">Name</Label>
              <Input
                id="onb-name"
                required
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onb-fleet">Fleet Name / Company Name</Label>
              <Input
                id="onb-fleet"
                required
                placeholder="Fleet or company name"
                value={fleetName}
                onChange={(e) => setFleetName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Account type</div>
              <div className="text-sm font-medium">{accountType ?? "driver"}</div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              Continue
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}