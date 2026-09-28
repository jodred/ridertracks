import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useStore } from "@/lib/trackuber/store";
import { nextDriverCode } from "@/lib/fleet/fleet";
import { AppLogo, ensureDefaultEarningSources, type EarningSource } from "@/lib/fleet/settlements";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/fleet/add-driver")({
  head: () => ({
    meta: [
      { title: "Add Driver — RideTracks" },
      {
        name: "description",
        content: "Add a driver to your fleet and assign them an automatic driver ID.",
      },
      { property: "og:title", content: "Add Driver — RideTracks" },
      {
        property: "og:description",
        content: "Add a driver to your fleet and assign an automatic driver ID.",
      },
    ],
  }),
  component: AddDriverPage,
});

function AddDriverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sources, setSources] = useState<EarningSource[]>([]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("fleet_drivers").select("code");
      setCode(
        nextDriverCode(
          state.fleet.fleetName,
          (data ?? []).map((d) => d.code as string),
        ),
      );
      if (!user) return;
      const { error: seedError } = await ensureDefaultEarningSources(user.id);
      if (seedError) return toast.error(seedError.message);
      const { data: sourceData, error: sourceError } = await supabase
        .from("fleet_earning_sources")
        .select("id, fleet_user_id, name, slug, logo_key, is_default, is_active, sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (sourceError) return toast.error(sourceError.message);
      setSources((sourceData ?? []) as EarningSource[]);
    })();
  }, [state.fleet.fleetName, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    if (sourceIds.length === 0) {
      setBusy(false);
      return toast.error("Assign at least one earning app");
    }
    const { data: driver, error } = await supabase
      .from("fleet_drivers")
      .insert({
        fleet_user_id: user.id,
        code,
        name: name.trim(),
        email: email.trim().toLowerCase(),
      })
      .select("id")
      .single();
    if (!error && driver) {
      const { error: assignmentError } = await supabase.from("fleet_driver_sources").insert(
        sourceIds.map((sourceId) => ({
          fleet_user_id: user.id,
          driver_id: driver.id,
          source_id: sourceId,
        })),
      );
      if (assignmentError) {
        setBusy(false);
        return toast.error(
          `Driver was added, but app assignment failed: ${assignmentError.message}`,
        );
      }
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${name.trim()} added as ${code}`);
    navigate({ to: "/fleet/drivers" });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <button
        onClick={() => navigate({ to: "/fleet" })}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Fleet Partner
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Add driver</h1>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="d-name">Driver name</Label>
              <Input
                id="d-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-email">Driver email</Label>
              <Input
                id="d-email"
                type="email"
                required
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Driver ID</Label>
              <Input
                value={code}
                readOnly
                className="rounded-xl bg-secondary text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from your company name ({state.fleet.fleetName}) and assigned in
                sequence.
              </p>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Earning apps</legend>
              <p className="text-xs text-muted-foreground">
                Choose every app this driver currently works with.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {sources.map((source) => {
                  const selected = sourceIds.includes(source.id);
                  return (
                    <label
                      key={source.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          setSourceIds((current) =>
                            event.target.checked
                              ? [...current, source.id]
                              : current.filter((id) => id !== source.id),
                          )
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <AppLogo source={source} />
                      <span className="text-sm font-medium">{source.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={busy || !code || sourceIds.length === 0}
            >
              <UserPlus className="h-4 w-4" /> Add driver
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
