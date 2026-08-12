import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Car, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PENDING_ACCOUNT_TYPE_KEY, type AccountType } from "@/lib/auth/AuthProvider";
import { detectLocation, CURRENCY_OPTIONS } from "@/lib/auth/location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — RideTracks" },
      { name: "description", content: "Sign in or create your RideTracks driver or fleet partner account." },
      { property: "og:title", content: "Sign in — RideTracks" },
      { property: "og:description", content: "Sign in or create your RideTracks driver or fleet partner account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("driver");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("zł");
  const [detecting, setDetecting] = useState(false);

  async function goHome() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { data: p } = await supabase.from("profiles").select("account_type").eq("id", uid).maybeSingle();
      if (p?.account_type === "fleet") return navigate({ to: "/fleet", replace: true });
    }
    navigate({ to: "/dashboard", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goHome();
    });
  }, [navigate]);

  function handleDetect() {
    setDetecting(true);
    const loc = detectLocation();
    setDetecting(false);
    if (!loc) return toast.error("Couldn't detect your location — please pick a currency.");
    setCountry(loc.country);
    setCurrency(loc.currency);
    toast.success(`Detected ${loc.country} — currency set to ${loc.currency}`);
  }

  async function handleGoogle() {
    setBusy(true);
    if (mode === "signup") localStorage.setItem(PENDING_ACCOUNT_TYPE_KEY, accountType);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: {
          display_name: displayName,
          account_type: accountType,
          ...(accountType === "driver" ? { country, currency } : {}),
        },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return toast.error("That email is already registered. Sign in instead — one email can only hold one account.");
    }
    toast.success("Account created. Check your email if confirmation is required, then sign in.");
    setMode("signin");
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
          {mode === "forgot" ? (
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
                        Forgot password?
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
                          accountType === o.key ? "border-primary bg-accent" : "border-border hover:bg-secondary",
                        ].join(" ")}
                      >
                        <div className="text-sm font-semibold">{o.title}</div>
                        <div className="text-xs text-muted-foreground">{o.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">{accountType === "fleet" ? "Company name" : "Name"}</Label>
                    <Input
                      id="su-name"
                      required
                      placeholder={accountType === "fleet" ? "Your company" : "Your full name"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-pw">Password</Label>
                    <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>

                  {accountType === "driver" && (
                    <div className="space-y-2 rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="su-country">Location</Label>
                        <Button type="button" size="sm" variant="ghost" onClick={handleDetect} disabled={detecting}>
                          <MapPin className="h-3.5 w-3.5" /> Detect automatically
                        </Button>
                      </div>
                      <Input
                        id="su-country"
                        placeholder="Country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                      <div className="space-y-1">
                        <Label htmlFor="su-currency" className="text-xs text-muted-foreground">Currency</Label>
                        <select
                          id="su-currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {CURRENCY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </form>
                <OrDivider />
                <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
                  Continue with Google
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Are you an admin? <Link to="/admin-login" className="text-primary hover:underline">Admin sign in</Link>
        </p>
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
