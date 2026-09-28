import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/trackuber/AppShell";
import { useAuth } from "../lib/auth/AuthProvider";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

function AppGate() {
  const { user, loading, accountType, isAdmin, needsFleetPartnerName } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Administrators use the dedicated email/password admin console and do not
    // participate in driver or fleet onboarding.
    if (needsFleetPartnerName && !isAdmin) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Redirect to appropriate dashboard based on account type
    const pathname = window.location.pathname;
    const isFleetPath = pathname === "/fleet" || pathname.startsWith("/fleet/");
    const isSharedPath = pathname === "/settings" || pathname === "/profile";
    if (accountType === "driver" && isFleetPath) {
      navigate({ to: "/dashboard", replace: true });
    } else if (accountType === "fleet" && !isFleetPath && !isSharedPath) {
      navigate({ to: "/fleet", replace: true });
    }
  }, [user, loading, accountType, isAdmin, needsFleetPartnerName, navigate]);

  if (loading || !user || (needsFleetPartnerName && !isAdmin)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
