import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../lib/auth/AuthProvider";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RideTracks" },
      { name: "description", content: "View all registered RideTracks drivers." },
      { property: "og:title", content: "Admin — RideTracks" },
      { property: "og:description", content: "View all registered RideTracks drivers." },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const matches = useMatches();
  const isDetail = matches.some((m) => m.routeId === "/_app/admin/$riderId");
  if (isDetail) return <Outlet />;
  return <AdminListPage />;
}

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
}

function AdminListPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setFetching(true);
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id,email,display_name,created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
      ]);
      setProfiles((p.data as ProfileRow[]) ?? []);
      setAdminIds(new Set(((r.data as { user_id: string }[]) ?? []).map((x) => x.user_id)));
      setFetching(false);
    })();
  }, [isAdmin]);

  const rows = useMemo(() => profiles, [profiles]);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Operations</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Registered drivers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone who has signed up for RideTracks. Click a driver to view their profile.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{rows.length} drivers</span>
        </div>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Driver</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                  <th className="px-5 py-3 font-medium">Role</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {fetching && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</td>
                  </tr>
                )}
                {!fetching && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No drivers registered yet.</td>
                  </tr>
                )}
                {rows.map((r) => {
                  const name = r.display_name || (r.email ? r.email.split("@")[0] : "Unnamed");
                  const initials = name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isRowAdmin = adminIds.has(r.id);
                  return (
                    <tr key={r.id} className="border-t border-border transition-colors hover:bg-accent/40">
                      <td className="px-5 py-4">
                        <Link to="/admin/$riderId" params={{ riderId: r.id }} className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {initials || "?"}
                          </div>
                          <div className="font-medium text-foreground">{name}</div>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{r.email || "—"}</td>
                      <td className="px-5 py-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4">
                        {isRowAdmin ? (
                          <Badge className="rounded-full">Admin</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">Driver</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          to="/admin/$riderId"
                          params={{ riderId: r.id }}
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          View
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
