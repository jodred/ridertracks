import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  FileBarChart,
  Settings,
  User,
  Car,
  ShieldCheck,
  Users,
  Home,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { GlobalDateRangePicker } from "./GlobalDateRangePicker";
import { useStore } from "../../lib/trackuber/store";
import { useAuth } from "../../lib/auth/AuthProvider";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; adminOnly?: boolean }
const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/entry", label: "Daily Entry", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

const fleetNavItems: NavItem[] = [
  { to: "/fleet", label: "Home", icon: Home, exact: true },
  { to: "/fleet/drivers", label: "Drivers", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

const fleetMobileNavItems: NavItem[] = [
  { to: "/fleet", label: "Home", icon: Home, exact: true },
  { to: "/fleet/drivers", label: "Drivers", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

const mobileNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/entry", label: "Entry", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state, workspace, setWorkspace } = useStore();
  const { isAdmin, user, signOut, accountType } = useAuth();
  const isFleet = accountType === "fleet";
  const navigate = useNavigate();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const visibleNav = (isFleet ? fleetNavItems : navItems).filter((i) => !i.adminOnly || isAdmin);
  const visibleMobile = (isFleet ? fleetMobileNavItems : mobileNavItems).filter((i) => !i.adminOnly || isAdmin);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const workspaceToggle = (
    <div className="inline-flex items-center rounded-full border border-border bg-secondary p-0.5 text-xs font-medium">
      {(["rides", "foods"] as const).map((ws) => (
        <button
          key={ws}
          onClick={() => setWorkspace(ws)}
          className={[
            "rounded-full px-3 py-1 transition-colors",
            workspace === ws
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-pressed={workspace === ws}
        >
          {ws === "rides" ? "Rides" : "Foods"}
        </button>
      ))}
    </div>
  );


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar px-4 py-6 lg:flex lg:flex-col">
        <Link to={homeTo} className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">RideTracks</div>
            <div className="text-xs text-muted-foreground">{state.fleet.fleetName}</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {visibleNav.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{state.profile.driverName || "Driver"}</div>
            <div className="truncate">{user?.email || state.profile.email || "—"}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <Link to={homeTo} className="flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">RideTracks</div>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {!isFleet && workspaceToggle}
            {!isFleet && <GlobalDateRangePicker />}
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>

        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden">
        {visibleMobile.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
