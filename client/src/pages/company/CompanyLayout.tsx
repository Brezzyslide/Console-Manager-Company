import { ReactNode, useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { getOnboardingStatus, getBillingStatus } from "@/lib/company-api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  ClipboardCheck,
  FileBarChart,
  ListChecks,
  Clipboard,
  Activity,
  Sparkles,
  BookOpen,
  Flame,
  MessageSquareWarning,
  ShieldAlert,
  TrendingUp,
  FileEdit,
  Scale
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
  
  const { data: billingStatus } = useQuery({
    queryKey: ["billingStatus"],
    queryFn: getBillingStatus,
    enabled: isAuthenticated && !requiresPasswordReset,
    staleTime: 60000,
    refetchInterval: 60000,
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
            <div className="h-12 w-12 rounded-[var(--radius)] bg-primary flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-primary/30 absolute -top-2 -left-2" />
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
          <div className="h-20 w-20 rounded-[var(--radius)] bg-destructive/10 mx-auto flex items-center justify-center border border-destructive/20">
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
          <Button 
            onClick={() => setLocation("/company/dashboard")} 
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

  const coreItems = [
    { href: "/company/dashboard", label: "Audit Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/compliance-dashboard", label: "Compliance Dashboard", icon: ClipboardCheck, testId: "nav-compliance-dashboard" },
  ];

  const auditModuleItems = [
    { href: "/audits", label: "Audits", icon: ClipboardCheck, testId: "nav-audits", startsWith: true },
    { href: "/findings", label: "Findings", icon: AlertTriangle, testId: "nav-findings" },
    { href: "/reports", label: "Audit Reports", icon: FileBarChart, testId: "nav-reports" },
    { href: "/evidence", label: "Evidence Locker", icon: FolderOpen, testId: "nav-evidence", startsWith: true },
  ];

  const complianceModuleItems = [
    { href: "/sites-participants", label: "Sites & People", icon: Building2, testId: "nav-sites-participants" },
    { href: "/compliance-review", label: "Compliance Checks", icon: ListChecks, testId: "nav-compliance" },
    { href: "/weekly-reports", label: "AI Reports", icon: Sparkles, testId: "nav-weekly-reports", roles: ["CompanyAdmin", "Auditor"] as const },
    { href: "/restrictive-practices", label: "Restrictive Practices", icon: Shield, testId: "nav-restrictive-practices", roles: ["CompanyAdmin", "Auditor", "Reviewer"] as const },
  ];

  const registerModuleItems = [
    { href: "/registers", label: "All Registers", icon: BookOpen, testId: "nav-registers-home" },
    { href: "/registers/evacuation-drills", label: "Evacuation Drills", icon: Flame, testId: "nav-evacuation-drills", startsWith: true },
    { href: "/registers/complaints", label: "Complaints", icon: MessageSquareWarning, testId: "nav-complaints", startsWith: true },
    { href: "/registers/risks", label: "Risk Register", icon: ShieldAlert, testId: "nav-risks", startsWith: true },
    { href: "/registers/improvements", label: "Continuous Improvement", icon: TrendingUp, testId: "nav-improvements", startsWith: true },
    { href: "/registers/policies", label: "Policy Updates", icon: FileEdit, testId: "nav-policies", startsWith: true },
    { href: "/registers/legislative", label: "Legislative Register", icon: Scale, testId: "nav-legislative", startsWith: true },
  ];

  const adminItems = [
    { href: "/company/admin/users", label: "Users", icon: Users, testId: "nav-admin-users" },
    { href: "/company/settings/services", label: "Services", icon: Settings, testId: "nav-services" },
  ];

  const isActive = (href: string, startsWith?: boolean) => {
    if (startsWith) return location.startsWith(href);
    return location === href;
  };

  const isModuleActive = (items: typeof auditModuleItems) => {
    return items.some(item => isActive(item.href, item.startsWith));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/company/dashboard" className="flex items-center gap-3 group">
                <div className="h-9 w-9 rounded-[var(--radius)] bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-semibold text-foreground">Provider Portal</span>
                </div>
              </Link>
              
              <nav className="hidden lg:flex items-center gap-1">
                {coreItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors
                          ${active 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors
                        ${isModuleActive(auditModuleItems)
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                      data-testid="nav-audit-module"
                    >
                      <Clipboard className="h-4 w-4" />
                      Audit Module
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {auditModuleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href, item.startsWith);
                      return (
                        <Link key={item.href} href={item.href}>
                          <DropdownMenuItem className={`cursor-pointer ${active ? 'bg-primary/10 text-primary' : ''}`} data-testid={item.testId}>
                            <Icon className="h-4 w-4 mr-2" />
                            {item.label}
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors
                        ${isModuleActive(complianceModuleItems)
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                      data-testid="nav-compliance-module"
                    >
                      <Activity className="h-4 w-4" />
                      Compliance Module
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {complianceModuleItems
                      .filter(item => !item.roles || (user?.role && item.roles.includes(user.role as any)))
                      .map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href, (item as any).startsWith);
                        return (
                          <Link key={item.href} href={item.href}>
                            <DropdownMenuItem className={`cursor-pointer ${active ? 'bg-primary/10 text-primary' : ''}`} data-testid={item.testId}>
                              <Icon className="h-4 w-4 mr-2" />
                              {item.label}
                            </DropdownMenuItem>
                          </Link>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors
                        ${isModuleActive(registerModuleItems)
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                      data-testid="nav-register-module"
                    >
                      <BookOpen className="h-4 w-4" />
                      Register
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {registerModuleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href, (item as any).startsWith);
                      return (
                        <Link key={item.href} href={item.href}>
                          <DropdownMenuItem className={`cursor-pointer ${active ? 'bg-primary/10 text-primary' : ''}`} data-testid={item.testId}>
                            <Icon className="h-4 w-4 mr-2" />
                            {item.label}
                          </DropdownMenuItem>
                        </Link>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                
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
                              flex items-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium transition-colors
                              ${active 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                  <span className="text-sm font-medium text-primary">
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
        {billingStatus?.showWarning && billingStatus.message && (
          <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                {billingStatus.message}
              </p>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export default CompanyLayout;
