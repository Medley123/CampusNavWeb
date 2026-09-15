import { useState, type ElementType, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BuildingsPage from "@/pages/BuildingsPage";
import { LayoutDashboard, Building2, ChevronRight, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveUsers } from "@/hooks/use-active-users";
import UsersPage from "@/pages/UsersPage";
import DashboardOverview from "@/pages/DashboardPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth";
import AdminSettingsPage from "@/pages/AdminSettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function NavItem({ href, icon: Icon, label, onNavigate }: { href: string; icon: ElementType; label: string; onNavigate?: () => void }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href} onClick={onNavigate}>
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{label}</span>
        {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
      </div>
    </Link>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeUsers = useActiveUsers();
  const { username, name, logout } = useAdminAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-sidebar flex flex-col h-screen transition-transform duration-200 md:sticky md:z-auto md:translate-x-0",
      open ? "translate-x-0" : "-translate-x-full",
    )}>
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-15 h-15 rounded-xl bg-primary/20 flex items-center justify-center">
            <img
              src="/cmpslogo.png"
              alt="CampusNav logo"
              className="w-15 h-15 rounded-lg object-cover"
            />
          </div>
          <div>
            <p className="text-sidebar-foreground font-bold text-base leading-none">CampusNav</p>
            <p className="text-sidebar-foreground/50 text-xs mt-1">Admin Panel</p>
          </div>
          <button
            type="button"
            aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
            title={`Switch to ${isDark ? "light" : "dark"} mode`}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-4 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2">Navigation</p>
        <NavItem href="/" icon={LayoutDashboard} label="Dashboard" onNavigate={onClose} />
        <NavItem href="/buildings" icon={Building2} label="Buildings" onNavigate={onClose} />
        <NavItem href="/users" icon={Users} label="Users" onNavigate={onClose} />
        <NavItem href="/settings" icon={Settings} label="Settings" onNavigate={onClose} />
      </nav>

      {/* Live active users */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#800000]/15 border border-[#800000]/30">
          <div className="relative flex-shrink-0">
            <Users className="w-4 h-4 text-[#800000] dark:text-red-300" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#800000] dark:bg-red-300 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#800000] dark:text-red-200 text-xs font-medium leading-none">Active Users</p>
            <p className="text-[#800000] dark:text-red-100 text-lg font-bold mt-0.5 leading-none">
              {activeUsers === null ? "—" : activeUsers}
            </p>
          </div>
          <span className="text-[#800000] dark:text-red-300 text-xs">live</span>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{name || username}</p>
            <p className="text-[11px] text-sidebar-foreground/40">Administrator</p>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void logout()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sidebar-foreground/30 text-xs">CTU Danao Campus</p>
        <p className="text-sidebar-foreground/20 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}

function DashboardPage() {
  return (
    <div className="flex-1 min-h-screen">
      <DashboardOverview />
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}
      <main className="min-w-0 flex-1 overflow-auto">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">CampusNav</span>
        </header>
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/buildings" component={BuildingsPage} />
        <Route path="/users" component={UsersPage} />
        <Route path="/settings" component={AdminSettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AdminAuthProvider>
            <AdminAuthGate />
          </AdminAuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function AdminAuthGate() {
  const { username, loading } = useAdminAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Checking admin session...</div>;
  }

  if (!username) return <AdminLoginPage />;

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
