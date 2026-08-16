import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/trackuber/AppShell";
import { useAuth } from "../lib/auth/AuthProvider";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

function AppGate() {
  const { user, loading, accountType } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Redirect to appropriate dashboard based on account type
    const pathname = window.location.pathname;
    if (accountType === "driver" && pathname.includes("/fleet")) {
      navigate({ to: "/dashboard", replace: true });
    } else if (accountType === "fleet" && !pathname.includes("/fleet")) {
      navigate({ to: "/fleet", replace: true });
    }
  }, [user, loading, accountType, navigate]);

  if (loading || !user) {
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
