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
  FileText,
  Settings
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireRole && user && !requireRole.includes(user.role as any)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
          <Button onClick={() => setLocation("/company/dashboard")} data-testid="button-go-dashboard">
            Go to Dashboard
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/company/dashboard" className="flex items-center gap-2 font-semibold text-primary hover:opacity-80">
              <Building2 className="h-5 w-5" />
              <span>Provider Portal</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/company/dashboard">
                <Button 
                  variant={location === "/company/dashboard" ? "secondary" : "ghost"} 
                  size="sm"
                  data-testid="nav-dashboard"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              
              {isAdmin && (
                <>
                  <Link href="/company/admin/users">
                    <Button 
                      variant={location === "/company/admin/users" ? "secondary" : "ghost"} 
                      size="sm"
                      data-testid="nav-admin-users"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      User Management
                    </Button>
                  </Link>
                  <Link href="/company/settings/services">
                    <Button 
                      variant={location === "/company/settings/services" ? "secondary" : "ghost"} 
                      size="sm"
                      data-testid="nav-services"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Services
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
