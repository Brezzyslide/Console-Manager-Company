import { ReactNode, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { getOnboardingStatus } from "@/lib/company-api";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  Loader2,
  Shield,
  Settings,
  AlertTriangle,
  FolderOpen,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface CompanyLayoutProps {
  children: ReactNode;
  requireRole?: ("CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly")[];
  skipOnboardingCheck?: boolean;
}

export function CompanyLayout({ children, requireRole, skipOnboardingCheck = false }: CompanyLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated, requiresPasswordReset, logout } = useCompanyAuth();
  
  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: getOnboardingStatus,
    enabled: isAuthenticated && !requiresPasswordReset && !skipOnboardingCheck,
  });
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/?mode=provider");
    }
  }, [isLoading, isAuthenticated, setLocation]);
  
  useEffect(() => {
    if (isAuthenticated && requiresPasswordReset && location !== "/company/password-reset") {
      setLocation("/company/password-reset");
    }
  }, [isAuthenticated, requiresPasswordReset, location, setLocation]);
  
  useEffect(() => {
    if (!skipOnboardingCheck && isAuthenticated && !requiresPasswordReset && onboardingStatus) {
      if (onboardingStatus.onboardingStatus !== "completed" && location !== "/onboarding") {
        setLocation("/onboarding");
      }
    }
  }, [skipOnboardingCheck, isAuthenticated, requiresPasswordReset, onboardingStatus, location, setLocation]);

  if (isLoading || (!skipOnboardingCheck && onboardingLoading && isAuthenticated && !requiresPasswordReset)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-background animate-pulse" />
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-primary absolute -top-2 -left-2" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireRole && user && !requireRole.includes(user.role as any)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="h-20 w-20 rounded-2xl gradient-danger mx-auto flex items-center justify-center glow-danger">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
          <Button 
            onClick={() => setLocation("/company/dashboard")} 
            className="gradient-primary hover:opacity-90 text-background"
            data-testid="button-go-dashboard"
          >
            Go to Dashboard
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    setLocation("/?mode=provider");
  };

  const isAdmin = user?.role === "CompanyAdmin";

  const navItems = [
    { href: "/company/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/findings", label: "Findings", icon: AlertTriangle, testId: "nav-findings" },
    { href: "/evidence", label: "Evidence", icon: FolderOpen, testId: "nav-evidence", startsWith: true },
  ];

  const adminItems = [
    { href: "/company/admin/users", label: "Users", icon: Users, testId: "nav-admin-users" },
    { href: "/company/settings/services", label: "Services", icon: Settings, testId: "nav-services" },
  ];

  const isActive = (href: string, startsWith?: boolean) => {
    if (startsWith) return location.startsWith(href);
    return location === href;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/company/dashboard" className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-lg gradient-mixed flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold text-foreground">Provider Portal</span>
                </div>
              </Link>
              
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href, item.startsWith);
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${active 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }
                        `}
                        data-testid={item.testId}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
                
                {isAdmin && (
                  <>
                    <div className="h-6 w-px bg-border mx-2" />
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link key={item.href} href={item.href}>
                          <button
                            className={`
                              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                              ${active 
                                ? 'bg-accent/10 text-accent' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                              }
                            `}
                            data-testid={item.testId}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </button>
                        </Link>
                      );
                    })}
                  </>
                )}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-border">
                  <span className="text-sm font-semibold text-foreground">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground leading-none">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.role}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground hover:bg-destructive/10"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </div>
  );
}

export default CompanyLayout;
