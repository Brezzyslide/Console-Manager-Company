import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  Building2,
  Users,
  ShieldAlert,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  Activity,
  TrendingUp,
  FileWarning,
} from "lucide-react";

interface WorkSite {
  id: string;
  name: string;
  status: "active" | "inactive";
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  primarySiteId?: string;
  status: "active" | "inactive";
}

interface RestrictivePracticeAuthorization {
  id: string;
  participantId: string;
  practiceType: string;
  status: string;
  expiryDate: string;
  createdAt: string;
}

interface RestrictivePracticeUsageLog {
  id: string;
  participantId: string;
  practiceType: string;
  wasAuthorized: boolean;
  occurredAt: string;
  createdAt: string;
}

interface ComplianceRun {
  id: string;
  status: string;
  score?: number;
  passedItems: number;
  failedItems: number;
  totalItems: number;
  completedAt?: string;
  createdAt: string;
}

export default function ComplianceDashboardPage() {
  const [, navigate] = useLocation();

  const { data: workSites = [], isLoading: sitesLoading } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
    queryFn: async () => {
      const res = await fetch("/api/company/work-sites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch work sites");
      return res.json();
    },
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
    queryFn: async () => {
      const res = await fetch("/api/company/participants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
  });

  const { data: authorizations = [], isLoading: authLoading } = useQuery<RestrictivePracticeAuthorization[]>({
    queryKey: ["/api/company/restrictive-practices/authorizations"],
    queryFn: async () => {
      const res = await fetch("/api/company/restrictive-practices/authorizations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch authorizations");
      return res.json();
    },
  });

  const { data: usageLogs = [], isLoading: usageLoading } = useQuery<RestrictivePracticeUsageLog[]>({
    queryKey: ["/api/company/restrictive-practices/usage-logs"],
    queryFn: async () => {
      const res = await fetch("/api/company/restrictive-practices/usage-logs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage logs");
      return res.json();
    },
  });

  const { data: complianceRuns = [], isLoading: complianceLoading } = useQuery<ComplianceRun[]>({
    queryKey: ["/api/company/compliance-runs"],
    queryFn: async () => {
      const res = await fetch("/api/company/compliance-runs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = sitesLoading || participantsLoading || authLoading || usageLoading || complianceLoading;

  const activeSites = workSites.filter(s => s.status === "active");
  const activeParticipants = participants.filter(p => p.status === "active");

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const activeAuthorizations = authorizations.filter(a => a.status === "APPROVED" && new Date(a.expiryDate) > now);
  const pendingAuthorizations = authorizations.filter(a => a.status === "PENDING");
  const expiredAuthorizations = authorizations.filter(a => a.status === "APPROVED" && new Date(a.expiryDate) <= now);
  const expiringSoonAuthorizations = authorizations.filter(a => {
    if (a.status !== "APPROVED") return false;
    const expiry = new Date(a.expiryDate);
    return expiry > now && expiry <= thirtyDaysFromNow;
  });

  const recentUsageLogs = usageLogs.filter(u => new Date(u.occurredAt) >= thirtyDaysAgo);
  const unauthorizedUsageLast30Days = recentUsageLogs.filter(u => !u.wasAuthorized);

  const completedRuns = complianceRuns.filter(r => r.status === "COMPLETED");
  const pendingComplianceRuns = complianceRuns.filter(r => r.status === "IN_PROGRESS" || r.status === "PENDING");
  const recentCompletedRuns = completedRuns
    .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
    .slice(0, 5);

  const overdueComplianceRuns = pendingComplianceRuns.filter(r => {
    const createdAt = new Date(r.createdAt);
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > 7;
  });

  const passRate = completedRuns.length > 0 
    ? Math.round((completedRuns.filter(r => (r.score || 0) >= 80).length / completedRuns.length) * 100)
    : 0;

  const participantsBySite = activeSites.map(site => ({
    site,
    count: activeParticipants.filter(p => p.primarySiteId === site.id).length,
  }));

  const getParticipantName = (participantId: string) => {
    const p = participants.find(x => x.id === participantId);
    return p ? (p.displayName || `${p.firstName} ${p.lastName}`) : "Unknown";
  };

  const formatPracticeType = (type: string) => {
    return type.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Compliance Dashboard</h1>
        <p className="text-muted-foreground">Overview of sites, participants, and restrictive practices compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-sites-overview">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSites.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingComplianceRuns.length} pending checks
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-participants-overview">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeParticipants.length}</div>
            <p className="text-xs text-muted-foreground">
              Across {activeSites.length} sites
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-authorizations-overview">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Authorizations</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAuthorizations.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingAuthorizations.length} pending approval
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-compliance-overview">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Checks</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}% pass rate</div>
            <p className="text-xs text-muted-foreground">
              {completedRuns.length} completed, {overdueComplianceRuns.length} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {(expiredAuthorizations.length > 0 || unauthorizedUsageLast30Days.length > 0 || expiringSoonAuthorizations.length > 0 || overdueComplianceRuns.length > 0) && (
        <Card className="border-destructive/50 bg-destructive/5" data-testid="card-alerts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alerts Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiredAuthorizations.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <Clock className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Expired Authorizations</p>
                    <p className="text-sm text-muted-foreground">
                      {expiredAuthorizations.length} authorization{expiredAuthorizations.length !== 1 ? "s" : ""} have expired
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/restrictive-practices")}>
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {unauthorizedUsageLast30Days.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <FileWarning className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Unauthorized Practice Usage</p>
                    <p className="text-sm text-muted-foreground">
                      {unauthorizedUsageLast30Days.length} unauthorized usage{unauthorizedUsageLast30Days.length !== 1 ? "s" : ""} in the last 30 days
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/restrictive-practices")}>
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {expiringSoonAuthorizations.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-full">
                    <Calendar className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Expiring Soon</p>
                    <p className="text-sm text-muted-foreground">
                      {expiringSoonAuthorizations.length} authorization{expiringSoonAuthorizations.length !== 1 ? "s" : ""} expiring within 30 days
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/restrictive-practices")}>
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {overdueComplianceRuns.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <ClipboardCheck className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium">Overdue Compliance Checks</p>
                    <p className="text-sm text-muted-foreground">
                      {overdueComplianceRuns.length} compliance check{overdueComplianceRuns.length !== 1 ? "s" : ""} overdue (started more than 7 days ago)
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/compliance-review")}>
                  View <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common compliance tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/restrictive-practices")}
              data-testid="button-log-usage"
            >
              <Plus className="h-4 w-4 mr-2" />
              Log Restrictive Practice Usage
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/compliance-review")}
              data-testid="button-start-compliance-check"
            >
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Start a Compliance Check
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/restrictive-practices")}
              data-testid="button-view-expiring"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Expiring Authorizations
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate("/sites-participants")}
              data-testid="button-manage-sites"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Manage Sites & Participants
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-participants-by-site">
          <CardHeader>
            <CardTitle>Participants by Site</CardTitle>
            <CardDescription>Distribution across work sites</CardDescription>
          </CardHeader>
          <CardContent>
            {participantsBySite.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sites configured</p>
            ) : (
              <div className="space-y-3">
                {participantsBySite.map(({ site, count }) => (
                  <div key={site.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{site.name}</span>
                    </div>
                    <Badge variant="secondary">{count} participant{count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
                {activeParticipants.filter(p => !p.primarySiteId).length > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Unassigned</span>
                    </div>
                    <Badge variant="outline">
                      {activeParticipants.filter(p => !p.primarySiteId).length}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-restrictive-practices-summary">
          <CardHeader>
            <CardTitle>Restrictive Practices</CardTitle>
            <CardDescription>Authorization status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Active</span>
                </div>
                <Badge className="bg-green-100 text-green-800">{activeAuthorizations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Pending Approval</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">{pendingAuthorizations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">Expiring Soon</span>
                </div>
                <Badge className="bg-orange-100 text-orange-800">{expiringSoonAuthorizations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Expired</span>
                </div>
                <Badge className="bg-red-100 text-red-800">{expiredAuthorizations.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-recent-compliance">
          <CardHeader>
            <CardTitle>Recent Compliance Checks</CardTitle>
            <CardDescription>Latest completed compliance reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {recentCompletedRuns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No compliance checks completed yet</p>
                <Button variant="link" className="mt-2" onClick={() => navigate("/compliance-review")}>
                  Start your first check
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCompletedRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${(run.score || 0) >= 80 ? "bg-green-100" : "bg-red-100"}`}>
                        {(run.score || 0) >= 80 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">Score: {run.score || 0}%</p>
                        <p className="text-xs text-muted-foreground">
                          {run.passedItems} passed, {run.failedItems} failed
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {run.completedAt ? new Date(run.completedAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-usage">
          <CardHeader>
            <CardTitle>Recent Practice Usage</CardTitle>
            <CardDescription>Latest restrictive practice usage logs</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsageLogs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No usage logged in the last 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUsageLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${log.wasAuthorized ? "bg-green-100" : "bg-red-100"}`}>
                        {log.wasAuthorized ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{getParticipantName(log.participantId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPracticeType(log.practiceType)}
                          {!log.wasAuthorized && (
                            <Badge variant="destructive" className="ml-2 text-xs">Unauthorized</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
