import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useConsoleAuth } from "@/hooks/use-console-auth";
import { 
  LayoutDashboard, 
  Building2, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Menu,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useConsoleAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/?mode=console");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-white animate-pulse" />
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-accent absolute -top-2 -left-2" />
          </div>
          <p className="text-muted-foreground text-sm">Loading console...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = location === href || location.startsWith(href + "/");
    return (
      <Link href={href}>
        <button
          className={`
            w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all mb-1
            ${isActive 
              ? 'gradient-accent text-white shadow-lg' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }
          `}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar/80 backdrop-blur-xl text-sidebar-foreground border-r border-border/50">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center shadow-lg glow-accent">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground leading-none">Console</h1>
            <span className="text-xs text-muted-foreground">Platform Manager</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-4 py-4">
        <div className="mb-8">
          <h3 className="px-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
            Tenants
          </h3>
          <NavItem href="/console/companies" icon={Building2} label="Companies" />
        </div>
        
        <div>
          <h3 className="px-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
            System
          </h3>
          <NavItem href="/console/audit" icon={LayoutDashboard} label="Audit Log" />
          <NavItem href="/console/settings" icon={Settings} label="Settings" />
        </div>
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center border border-border">
            <span className="text-sm font-semibold text-foreground">
              {user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-40">
        <SidebarContent />
      </div>

      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-sm border-border/50">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border/50">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-auto relative">
        <div className="container max-w-5xl mx-auto p-6 md:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
