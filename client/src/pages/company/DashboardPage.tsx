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
  Loader2
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.fullName}
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Provider Portal</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">NDIS Compliance</div>
            <p className="text-xs text-muted-foreground">
              Audit and compliance workspace
            </p>
            <div className="mt-2">
              {isOnboardingComplete ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Onboarding Complete
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Onboarding In Progress
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{user?.role}</div>
            <p className="text-xs text-muted-foreground">
              Current access level
            </p>
            {(user?.role === "CompanyAdmin" || user?.role === "Auditor") && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <Shield className="h-3 w-3" />
                  Audit access enabled
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Audits</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            {auditsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-xl font-bold">
                  {activeAudits.length > 0 
                    ? `${activeAudits.length} Active Audit${activeAudits.length > 1 ? "s" : ""}` 
                    : "No Active Audits"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Create internal or external audits
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="pt-2 flex gap-2">
            <Button size="sm" asChild data-testid="button-create-audit">
              <Link href="/audits/new">Create Audit</Link>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" asChild data-testid="link-view-audits">
              <Link href="/audits">
                View audits
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Scope</CardTitle>
            <FileStack className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            {servicesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <>
                <div className="text-xl font-bold">
                  {totalLineItems > 0 
                    ? `${totalLineItems} Line Items in Scope` 
                    : "Scope Not Set"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalLineItems > 0 ? "Services being audited" : "Configure your service scope"}
                </p>
              </>
            )}
          </CardContent>
          <CardFooter className="pt-2">
            <Button variant="ghost" size="sm" className="gap-1" asChild data-testid="link-view-scope">
              <Link href="/onboarding">
                {totalLineItems > 0 ? "View scope" : "Set up scope"}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Compliance Overview
          </CardTitle>
          <CardDescription>
            Your audit readiness and compliance status at a glance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
              <div className="flex items-center gap-3">
                {isOnboardingComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Clock className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <div className="font-medium">Audit Readiness</div>
                  <div className="text-sm text-muted-foreground">
                    {isOnboardingComplete 
                      ? "Ready for internal audit" 
                      : "Not ready (complete onboarding first)"}
                  </div>
                </div>
              </div>
              {!isOnboardingComplete && (
                <Button variant="outline" size="sm" asChild data-testid="button-complete-onboarding">
                  <Link href="/onboarding">Complete Onboarding</Link>
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
              <div className="flex items-center gap-3">
                {lastClosedAudit ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <div className="font-medium">Last Audit</div>
                  <div className="text-sm text-muted-foreground">
                    {lastClosedAudit 
                      ? `${lastClosedAudit.title} (${new Date(lastClosedAudit.createdAt).toLocaleDateString()})` 
                      : "No audits yet"}
                  </div>
                </div>
              </div>
              {!lastClosedAudit && isOnboardingComplete && (
                <Button variant="outline" size="sm" asChild data-testid="button-start-first-audit">
                  <Link href="/audits/new">Start First Audit</Link>
                </Button>
              )}
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
              <div className="flex items-center gap-3">
                {findingsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : openFindings.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : majorFindings.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <div className="font-medium">Open Findings</div>
                  <div className="text-sm text-muted-foreground">
                    {findingsLoading ? "Loading..." : 
                      openFindings.length === 0 
                        ? "No open findings" 
                        : `${openFindings.length} finding${openFindings.length > 1 ? "s" : ""} require attention${majorFindings.length > 0 ? ` (${majorFindings.length} major)` : ""}`}
                  </div>
                </div>
              </div>
              {openFindings.length > 0 && (
                <Button variant="outline" size="sm" asChild data-testid="button-view-findings">
                  <Link href="/findings">View Findings</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
