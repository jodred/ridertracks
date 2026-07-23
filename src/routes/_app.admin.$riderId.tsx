import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Calendar as CalIcon, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../lib/auth/AuthProvider";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/_app/admin/$riderId")({
  head: () => ({
    meta: [
      { title: "Driver · Admin — RideTracks" },
      { name: "description", content: "Driver profile detail." },
      { property: "og:title", content: "Driver · Admin — RideTracks" },
      { property: "og:description", content: "Driver profile detail." },
    ],
  }),
  component: RiderDetail,
});

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

function RiderDetail() {
  const { riderId } = Route.useParams();
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isRowAdmin, setIsRowAdmin] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setFetching(true);
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,email,display_name,created_at").eq("id", riderId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", riderId).eq("role", "admin").maybeSingle(),
      ]);
      setProfile((p.data as Profile | null) ?? null);
      setIsRowAdmin(Boolean(r.data));
      setFetching(false);
    })();
  }, [riderId, isAdmin]);

  if (loading || !isAdmin) return null;

  if (fetching) return <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>;

  if (!profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">Driver not found</h1>
        <Link to="/admin" className="mt-4 inline-flex text-sm text-primary hover:underline">
          Back to drivers
        </Link>
      </div>
    );
  }

  const name = profile.display_name || (profile.email ? profile.email.split("@")[0] : "Unnamed");
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All drivers
        </Link>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
              {isRowAdmin ? (
                <Badge className="rounded-full">Admin</Badge>
              ) : (
                <Badge variant="outline" className="rounded-full">Driver</Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {profile.email || "No email"}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalIcon className="h-3 w-3" />
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-secondary/40 shadow-card">
        <CardContent className="flex items-start gap-3 p-5">
          <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            Each driver's earnings, expenses, and daily entries are stored privately on their own device. As an admin
            you can see who is registered here, but individual trip data remains private to each driver.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
