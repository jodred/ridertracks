import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  FileBarChart,
  Settings,
  User,
  Car,
} from "lucide-react";
import type { ReactNode } from "react";
import { GlobalDateRangePicker } from "./GlobalDateRangePicker";
import { useStore } from "../../lib/trackuber/store";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }
const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/entry", label: "Daily Entry", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

const mobileNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/entry", label: "Entry", icon: PlusCircle },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useStore();

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-sidebar px-4 py-6 lg:flex lg:flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">TrackUber</div>
            <div className="text-xs text-muted-foreground">{state.fleet.fleetName}</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
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
        <div className="mt-auto rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          <div className="font-medium text-foreground">{state.profile.driverName || "Driver"}</div>
          <div className="truncate">{state.profile.email || "Add email in profile"}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">TrackUber</div>
          </div>
          <div className="ml-auto">
            <GlobalDateRangePicker />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden">
        {mobileNavItems.map((item) => {
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