import { createFileRoute, Link, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ShieldCheck, UserCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../lib/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RideTracks" },
      { name: "description", content: "Manage RideTracks accounts and administrator access." },
      { property: "og:title", content: "Admin — RideTracks" },
      { property: "og:description", content: "Manage RideTracks accounts and administrator access." },
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
  const recentRows = rows.slice(0, 5);

  if (loading || !isAdmin) return null;

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="bg-gradient-to-br from-primary to-primary/75 px-5 py-7 text-primary-foreground sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
                <ShieldCheck className="h-4 w-4" /> Secure operations
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Admin dashboard</h1>
              <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
                Review registered accounts and manage RideTracks operations from one protected workspace.
              </p>
            </div>
            <Badge className="rounded-full bg-white/15 px-3 py-1 text-primary-foreground hover:bg-white/15">Admin access</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-border shadow-card">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registered accounts</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{rows.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Accounts visible to your administrator role</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border shadow-card">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Administrators</CardTitle>
            <UserCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tracking-tight">{adminIds.size}</div>
            <p className="mt-1 text-xs text-muted-foreground">Accounts allowed into this console</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Directory</div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Recent accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select an account to view its profile and access details.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{rows.length} total</span>
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
                    <td colSpan={5} className="px-5 py-8 text-center text-sm text-muted-foreground">No accounts registered yet.</td>
                  </tr>
                )}
                {recentRows.map((r) => {
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
