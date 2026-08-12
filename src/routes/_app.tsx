import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/trackuber/AppShell";
import { useAuth } from "../lib/auth/AuthProvider";
import { useStore } from "../lib/trackuber/Ridetracks";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

/** Routes a fleet partner may never open (driver-only surfaces). */
const DRIVER_ONLY = ["/dashboard", "/entry", "/history", "/reports"];

function AppGate() {
  const { user, loading, accountType } = useAuth();
  const { ready } = useStore();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [user, loading, navigate]);

  const isFleet = accountType === "fleet";
  const onFleetRoute = pathname === "/fleet" || pathname.startsWith("/fleet/");
  const onDriverRoute = DRIVER_ONLY.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (loading || !user || !accountType) return;
    if (isFleet && onDriverRoute) navigate({ to: "/fleet", replace: true });
    if (!isFleet && onFleetRoute) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, accountType, isFleet, onDriverRoute, onFleetRoute, navigate]);

  const blocked = !!accountType && ((isFleet && onDriverRoute) || (!isFleet && onFleetRoute));

  if (loading || !user || !accountType || !ready || blocked) {
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
