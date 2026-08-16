import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

import { PENDING_ACCOUNT_TYPE_KEY, type AccountType } from "@/lib/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RideTracks" },
      { name: "description", content: "Sign in or create your RideTracks driver account." },
      { property: "og:title", content: "Sign in — RideTracks" },
      { property: "og:description", content: "Sign in or create your RideTracks driver account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "google-complete">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [fleetName, setFleetName] = useState("");
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("driver");
  const [googleUserId, setGoogleUserId] = useState<string | null>(null);

  async function goHome() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("account_type").eq("id", uid).maybeSingle();
      if (p?.account_type === "fleet") return navigate({ to: "/fleet" });
    }
    navigate({ to: "/dashboard" });
  }

  useEffect(() => {
    async function handleExistingSession() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, fleet_partner_name, account_type")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.fleet_partner_name?.trim()) {
        const metadata = user.user_metadata ?? {};
        setGoogleUserId(user.id);
        setEmail(user.email ?? "");
        setDisplayName(
          (metadata["full_name"] as string | undefined) ??
            (metadata["name"] as string | undefined) ??
            (metadata["display_name"] as string | undefined) ??
            profile?.display_name ??
            "",
        );
        setFleetName((metadata["fleet_partner_name"] as string | undefined) ?? "");
        const requestedAccountType =
          localStorage.getItem(PENDING_ACCOUNT_TYPE_KEY) ??
          (metadata["account_type"] as string | undefined) ??
          profile?.account_type;
        setAccountType(requestedAccountType === "fleet" ? "fleet" : "driver");
        setMode("google-complete");
        return;
      }

      goHome();
    }

    handleExistingSession();
  }, [navigate]);

  async function handleGoogle() {
    setBusy(true);
    if (mode === "signup") localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "https://ridetracks.com/auth",
      },
    });

    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setBusy(false);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    setBusy(false);
    goHome();
  }


  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    goHome();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: {
          display_name: displayName.trim(),
          account_type: accountType,
          fleet_partner_name: fleetName.trim(),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. Check your email if confirmation is required, then sign in.");
    setMode("signin");
  }

  async function handleGoogleProfileComplete(e: React.FormEvent) {
    e.preventDefault();
    const name = displayName.trim();
    const partnerName = fleetName.trim();
    if (!name || !partnerName || !googleUserId) return;

    setBusy(true);
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: googleUserId,
        email,
        display_name: name,
        fleet_partner_name: partnerName,
        account_type: accountType,
      }, { onConflict: "id" });

    if (profileError) {
      setBusy(false);
      return toast.error(profileError.message);
    }

    const { error: userError } = await supabase.auth.updateUser({
      data: {
        display_name: name,
        fleet_partner_name: partnerName,
        account_type: accountType,
      },
    });
    setBusy(false);
    if (userError) return toast.error(userError.message);

    localStorage.removeItem(PENDING_ACCOUNT_TYPE_KEY);
    goHome();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("If that email exists, a reset link has been sent.");
    setMode("signin");
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
          {mode === "google-complete" ? (
            <form onSubmit={handleGoogleProfileComplete} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Complete your profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm your details and add your Fleet Partner Name to continue. You will only be asked once.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-name">Your name</Label>
                <Input
                  id="google-name"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-email">Email</Label>
                <Input id="google-email" type="email" value={email} disabled readOnly />
                <p className="text-xs text-muted-foreground">Your sign-in email cannot be changed here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google-fleet-name">Fleet Partner Name</Label>
                <Input
                  id="google-fleet-name"
                  required
                  maxLength={100}
                  placeholder="e.g. CityRide Partners"
                  value={fleetName}
                  onChange={(e) => setFleetName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Required. This name is shown throughout your workspace.</p>
              </div>
              <Button type="submit" className="w-full" disabled={busy || !displayName.trim() || !fleetName.trim()}>
                Continue to RideTracks
              </Button>
            </form>
          ) : mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter your email — we'll send you a reset link.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            </form>
          ) : (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 space-y-4">
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-pw">Password</Label>
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setMode("forgot")}>
                        Forgot?
                      </button>
                    </div>
                    <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>Sign in</Button>
                </form>
                <OrDivider />
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                  Continue with Google
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 space-y-4">
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-2">
                    <Label>I am registering as</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "driver", title: "Driver", desc: "Track my own earnings" },
                        { key: "fleet", title: "Fleet partner", desc: "Manage my drivers" },
                      ] as const).map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => setAccountType(o.key)}
                          aria-pressed={accountType === o.key}
                          className={[
                            "rounded-xl border p-3 text-left transition-colors",
                            accountType === o.key
                              ? "border-primary bg-accent"
                              : "border-border hover:bg-secondary",
                          ].join(" ")}
                        >
                          <div className="text-sm font-semibold">{o.title}</div>
                          <div className="text-xs text-muted-foreground">{o.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Your name</Label>
                    <Input id="su-name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-fleet-name">Fleet Partner Name</Label>
                    <Input
                      id="su-fleet-name"
                      required
                      maxLength={100}
                      placeholder="e.g. CityRide Partners"
                      value={fleetName}
                      onChange={(e) => setFleetName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Shown throughout your driver and fleet workspace.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
                </form>
                <OrDivider />
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                  Continue with Google
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

      </div>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
