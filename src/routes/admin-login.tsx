import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Admin sign in — RideTracks" },
      { name: "description", content: "Restricted admin console access for RideTracks operators." },
      { property: "og:title", content: "Admin sign in — RideTracks" },
      { property: "og:description", content: "Restricted admin console access." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    // Verify admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!role) {
      await supabase.auth.signOut();
      setBusy(false);
      return toast.error("This account does not have admin access.");
    }
    setBusy(false);
    navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">RideTracks Admin</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight">Admin console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted access. Only accounts with an admin role may sign in here.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="a-email">Email</Label>
              <Input id="a-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-pw">Password</Label>
              <Input id="a-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>Sign in to admin</Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Driver account? <Link to="/auth" className="text-primary hover:underline">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
