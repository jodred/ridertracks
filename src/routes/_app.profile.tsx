import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useStore } from "../lib/trackuber/store";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RideTracks" },
      { name: "description", content: "Manage your driver profile and vehicle details." },
      { property: "og:title", content: "Profile — RideTracks" },
      { property: "og:description", content: "Manage your driver profile and vehicle details." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state, updateProfile } = useStore();
  const p = state.profile;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1>
      </div>

      <Card className="rounded-2xl border-border shadow-card">
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <Field label="Driver Name" value={p.driverName} onChange={(v) => updateProfile({ driverName: v })} />
          <Field label="Email" value={p.email} onChange={(v) => updateProfile({ email: v })} type="email" />
          <Field label="Fleet Name" value={p.fleetName} onChange={(v) => updateProfile({ fleetName: v })} />
          <Field label="Vehicle" value={p.vehicle} onChange={(v) => updateProfile({ vehicle: v })} placeholder="e.g. Toyota Corolla" />
          <Field label="Vehicle Registration" value={p.registration} onChange={(v) => updateProfile({ registration: v })} />
          <div className="space-y-2">
            <Label>Member Since</Label>
            <Input value={p.memberSince} disabled className="rounded-xl" />
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-fit rounded-full text-destructive"
        onClick={() => toast.info("Logout is available when cloud sync is enabled.")}
      >
        <LogOut className="mr-1 h-4 w-4" /> Log out
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} className="rounded-xl" />
    </div>
  );
}
