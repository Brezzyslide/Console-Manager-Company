import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { getOnboardingStatus, getAudits, getFindings, getCompanyServices } from "@/lib/company-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  FileStack,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Shield,
  AlertTriangle,
  Loader2,
  Sparkles,
  TrendingUp,
  Target
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useCompanyAuth();
  
  const { data: onboardingStatus } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: getOnboardingStatus,
  });
  
  const { data: audits = [], isLoading: auditsLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: () => getAudits(),
  });
  
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ["findings"],
    queryFn: () => getFindings(),
  });
  
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["companyServices"],
    queryFn: getCompanyServices,
  });
  
  const activeAudits = audits.filter(a => 
    a.status === "DRAFT" || a.status === "IN_PROGRESS" || a.status === "IN_REVIEW"
  );
  
  const closedAudits = audits.filter(a => a.status === "CLOSED");
  const lastClosedAudit = closedAudits.length > 0 
    ? closedAudits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;
  
  const openFindings = findings.filter(f => f.status === "OPEN" || f.status === "UNDER_REVIEW");
  const majorFindings = openFindings.filter(f => f.severity === "MAJOR_NC");
  
  const isOnboardingComplete = onboardingStatus?.onboardingStatus === "completed";
  const totalLineItems = servicesData?.totalSelected ?? 0;
  
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">Welcome back</p>
          <h1 className="text-3xl font-bold">
            <span className="text-gradient-primary">{user?.fullName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="px-3 py-1.5 border-primary/30 bg-primary/5 text-primary"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {user?.role}
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card hover-lift border-border/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-foreground">NDIS Ready</div>
            <p className="text-xs text-muted-foreground mt-1">
              Compliance management active
            </p>
            <div className="mt-3">
              {isOnboardingComplete ? (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Onboarding Complete
                </Badge>
              ) : (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
                  <Clock className="h-3 w-3" />
                  In Progress
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover-lift border-border/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Access Level</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-foreground">{user?.role}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current permissions
            </p>
            {(user?.role === "CompanyAdmin" || user?.role === "Auditor") && (
              <div className="mt-3">
                <Badge className="bg-primary/10 text-primary border-primary/20 gap-1">
                  <Shield className="h-3 w-3" />
                  Audit Access
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-card hover-lift border-border/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Audits</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-2 relative">
            {auditsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {activeAudits.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeAudits.length === 1 ? "Active audit" : "Active audits"}
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="pt-3 flex gap-2">
            <Button 
              size="sm" 
              className="gradient-primary text-background hover:opacity-90" 
              asChild 
              data-testid="button-create-audit"
            >
              <Link href="/audits/new">Create Audit</Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild data-testid="link-view-audits">
              <Link href="/audits">
                View
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="glass-card hover-lift border-border/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scope</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <FileStack className="h-4 w-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-2 relative">
            {servicesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {totalLineItems}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalLineItems === 1 ? "Line item" : "Line items"} in scope
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="pt-3">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" asChild data-testid="link-view-scope">
              <Link href="/company/settings/services">
                {totalLineItems > 0 ? "Manage" : "Configure"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card className="glass-card border-border/50 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/3 rounded-full blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-mixed flex items-center justify-center shadow-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle>Compliance Overview</CardTitle>
              <CardDescription>
                Your audit readiness and compliance status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  isOnboardingComplete 
                    ? 'bg-emerald-500/10' 
                    : 'bg-amber-500/10'
                }`}>
                  {isOnboardingComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Clock className="h-5 w-5 text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">Audit Readiness</div>
                  <div className="text-sm text-muted-foreground">
                    {isOnboardingComplete 
                      ? "Ready for internal audit" 
                      : "Complete onboarding to begin"}
                  </div>
                </div>
              </div>
              {!isOnboardingComplete && (
                <Button 
                  size="sm" 
                  className="gradient-primary text-background hover:opacity-90"
                  asChild 
                  data-testid="button-complete-onboarding"
                >
                  <Link href="/onboarding">Complete Setup</Link>
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  lastClosedAudit 
                    ? 'bg-emerald-500/10' 
                    : 'bg-muted'
                }`}>
                  {lastClosedAudit ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">Last Completed Audit</div>
                  <div className="text-sm text-muted-foreground">
                    {lastClosedAudit 
                      ? `${lastClosedAudit.title} • ${new Date(lastClosedAudit.createdAt).toLocaleDateString()}` 
                      : "No completed audits yet"}
                  </div>
                </div>
              </div>
              {!lastClosedAudit && isOnboardingComplete && (
                <Button 
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10"
                  asChild 
                  data-testid="button-start-first-audit"
                >
                  <Link href="/audits/new">Start Audit</Link>
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-colors">
              <div className="flex items-center gap-4">
                {findingsLoading ? (
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    openFindings.length === 0 
                      ? 'bg-emerald-500/10' 
                      : majorFindings.length > 0 
                        ? 'bg-red-500/10' 
                        : 'bg-amber-500/10'
                  }`}>
                    {openFindings.length === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : majorFindings.length > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                )}
                <div>
                  <div className="font-medium text-foreground">Open Findings</div>
                  <div className="text-sm text-muted-foreground">
                    {findingsLoading ? "Loading..." : 
                      openFindings.length === 0 
                        ? "All clear - no open findings" 
                        : `${openFindings.length} finding${openFindings.length > 1 ? "s" : ""} need attention${majorFindings.length > 0 ? ` (${majorFindings.length} major)` : ""}`}
                  </div>
                </div>
              </div>
              {openFindings.length > 0 && (
                <Button 
                  size="sm"
                  variant="outline"
                  className={majorFindings.length > 0 
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  }
                  asChild 
                  data-testid="button-view-findings"
                >
                  <Link href="/findings">Review</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
