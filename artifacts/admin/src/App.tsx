import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import BuildingsPage from "@/pages/BuildingsPage";
import { LayoutDashboard, Building2, ChevronRight, Users, Settings, Map, Info, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import UsersPage from "@/pages/UsersPage";
import DashboardOverview from "@/pages/DashboardPage";
import AdminAccountsPage from "@/pages/AdminAccountsPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/use-admin-auth";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import CampusFloorPlansPage from "@/pages/CampusFloorPlansPage";
import AppUpdatesPage from "@/pages/AppUpdatesPage";
import FeedbackPage from "@/pages/FeedbackPage";

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
  const { username, name, logout, role, campusName } = useAdminAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isSuperAdmin = role === "super_admin";

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-sidebar flex flex-col h-screen transition-transform duration-200 md:sticky md:z-auto md:translate-x-0",
      isSuperAdmin ? "super-admin-sidebar" : "campus-admin-sidebar",
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
          <div className="min-w-0 flex-1">
            <p className="break-words text-sidebar-foreground font-bold text-sm leading-tight">{"CampusNav"}</p>
            <p className="text-sidebar-foreground/60 text-xs mt-1">{isSuperAdmin ? "Superadmin Panel" : "Admin Panel"}</p>
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
        {role === "super_admin" ? (
          <>
            <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" onNavigate={onClose} />
            <NavItem href="/" icon={Building2} label="Campus Admins" onNavigate={onClose} />
            <NavItem href="/floor-plans" icon={Map} label="Floor Plans" onNavigate={onClose} />
            <NavItem href="/users" icon={Users} label="Users" onNavigate={onClose} />
            <NavItem href="/app-updates" icon={Info} label="App Info & Updates" onNavigate={onClose} />
            <NavItem href="/feedback" icon={MessageSquare} label="Feedback" onNavigate={onClose} />
            <NavItem href="/settings" icon={Settings} label="Settings" onNavigate={onClose} />
          </>
        ) : (
          <>
            <NavItem href="/" icon={LayoutDashboard} label="Dashboard" onNavigate={onClose} />
            <NavItem href="/buildings" icon={Building2} label="Buildings" onNavigate={onClose} />
            <NavItem href="/settings" icon={Settings} label="Settings" onNavigate={onClose} />
          </>
        )}
      </nav>

      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{isSuperAdmin ? "CampusNav SuperAdmin" : name || username}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{isSuperAdmin ? "Super Administrator" : "Administrator"}</p>
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
        <p className="text-sidebar-foreground/30 text-xs">{campusName || "Systemwide access"}</p>
        <p className="text-sidebar-foreground/20 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}

function DashboardPage() {
  const { campusName, role } = useAdminAuth();
  return (
    <div className="flex-1 min-h-screen">
      <DashboardOverview campusName={campusName} isSuperAdmin={role === "super_admin"} />
    </div>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role } = useAdminAuth();

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
      <main className={cn(
        "min-w-0 flex-1 overflow-auto",
        role === "super_admin" && "super-admin-main",
        role === "campus_admin" && "campus-admin-main",
      )}>
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
  const { role } = useAdminAuth();
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={role === "super_admin" ? AdminAccountsPage : DashboardPage} />
        <Route path="/dashboard" component={role === "super_admin" ? DashboardPage : NotFound} />
        <Route path="/admins" component={role === "super_admin" ? AdminAccountsPage : NotFound} />
        <Route path="/buildings" component={role === "campus_admin" ? BuildingsPage : NotFound} />
        <Route path="/users" component={role === "super_admin" ? UsersPage : NotFound} />
        <Route path="/floor-plans" component={role === "super_admin" ? CampusFloorPlansPage : NotFound} />
        <Route path="/app-updates" component={role === "super_admin" ? AppUpdatesPage : NotFound} />
        <Route path="/feedback" component={role === "super_admin" ? FeedbackPage : NotFound} />
        <Route path="/settings" component={role === "super_admin" || role === "campus_admin" ? AdminSettingsPage : NotFound} />
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
  const { username, loading, role } = useAdminAuth();

  useEffect(() => {
    document.title = role === "super_admin" ? "CampusNav Super Admin" : "CampusNav Admin";
  }, [role]);

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
