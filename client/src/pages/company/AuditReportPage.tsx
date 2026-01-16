import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Loader2, 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Eye,
  Users,
  MapPin,
  Wand2,
  Plus,
  Trash2
} from "lucide-react";
import { AuditNavTabs } from "@/components/AuditNavTabs";
import { getAudit, type IndicatorRating } from "@/lib/company-api";
import { format } from "date-fns";

const ratingColors: Record<IndicatorRating, string> = {
  CONFORMITY_BEST_PRACTICE: "text-emerald-500 bg-emerald-500/10",
  CONFORMITY: "text-green-500 bg-green-500/10",
  MINOR_NC: "text-yellow-500 bg-yellow-500/10",
  MAJOR_NC: "text-red-500 bg-red-500/10",
};

const ratingLabels: Record<IndicatorRating, string> = {
  CONFORMITY_BEST_PRACTICE: "Conformity with Best Practice",
  CONFORMITY: "Conformity",
  MINOR_NC: "Minor NC",
  MAJOR_NC: "Major NC",
};

interface AuditReportData {
  audit: any;
  company: any;
  interviews: any[];
  siteVisits: any[];
  indicatorResponses: any[];
  findings: any[];
}

export default function AuditReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Interview form state
  const [showAddInterviewDialog, setShowAddInterviewDialog] = useState(false);
  const [interviewType, setInterviewType] = useState<string>("");
  const [interviewMethod, setInterviewMethod] = useState<string>("");
  const [intervieweeName, setIntervieweeName] = useState("");
  const [intervieweeRole, setIntervieweeRole] = useState("");
  const [keyObservations, setKeyObservations] = useState("");
  
  // Site visit form state
  const [showAddSiteVisitDialog, setShowAddSiteVisitDialog] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [participantsAtSite, setParticipantsAtSite] = useState("");
  const [filesReviewedCount, setFilesReviewedCount] = useState("");
  const [observationsPositive, setObservationsPositive] = useState("");
  const [observationsConcerns, setObservationsConcerns] = useState("");

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => getAudit(id!),
    enabled: !!id,
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<AuditReportData>({
    queryKey: ["auditReportData", id],
    queryFn: async () => {
      const res = await fetch(`/api/company/audits/${id}/report-data`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch report data");
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (reportData?.audit?.executiveSummary) {
      setExecutiveSummary(reportData.audit.executiveSummary);
    }
  }, [reportData]);

  const generateSummaryMutation = useMutation({
    mutationFn: async (regenerate: boolean = false) => {
      const res = await fetch(`/api/company/audits/${id}/generate-executive-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ regenerate }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to generate summary" }));
        throw new Error(error.error || "Failed to generate summary");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setExecutiveSummary(data.summary);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      toast({
        title: "Summary generated",
        description: "Your AI-powered executive summary is ready for review.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Failed to generate executive summary. Please try again.",
      });
    },
  });

  const saveSummaryMutation = useMutation({
    mutationFn: async (summaryToSave: string) => {
      const res = await fetch(`/api/company/audits/${id}/executive-summary`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ summary: summaryToSave }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to save summary" }));
        throw new Error(error.error || "Failed to save summary");
      }
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      toast({
        title: "Summary saved",
        description: "Your executive summary has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: error.message || "Failed to save executive summary. Please try again.",
      });
    },
  });

  const handleSummaryChange = (value: string) => {
    setExecutiveSummary(value);
    setHasChanges(true);
  };

  const addInterviewMutation = useMutation({
    mutationFn: async (data: {
      interviewType: string;
      interviewMethod: string;
      intervieweeName?: string;
      intervieweeRole?: string;
      keyObservations?: string;
    }) => {
      const res = await fetch(`/api/company/audits/${id}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to add interview" }));
        throw new Error(error.error || "Failed to add interview");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      setShowAddInterviewDialog(false);
      resetInterviewForm();
      toast({ title: "Interview added", description: "The interview has been recorded." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: async (interviewId: string) => {
      const res = await fetch(`/api/company/audits/${id}/interviews/${interviewId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to delete interview" }));
        throw new Error(error.error || "Failed to delete interview");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      toast({ title: "Interview deleted" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const addSiteVisitMutation = useMutation({
    mutationFn: async (data: {
      siteName: string;
      siteAddress?: string;
      participantsAtSite?: number;
      filesReviewedCount?: number;
      observationsPositive?: string;
      observationsConcerns?: string;
    }) => {
      const res = await fetch(`/api/company/audits/${id}/site-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to add site visit" }));
        throw new Error(error.error || "Failed to add site visit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      setShowAddSiteVisitDialog(false);
      resetSiteVisitForm();
      toast({ title: "Site visit added", description: "The site visit has been recorded." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteSiteVisitMutation = useMutation({
    mutationFn: async (siteVisitId: string) => {
      const res = await fetch(`/api/company/audits/${id}/site-visits/${siteVisitId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to delete site visit" }));
        throw new Error(error.error || "Failed to delete site visit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      toast({ title: "Site visit deleted" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const resetInterviewForm = () => {
    setInterviewType("");
    setInterviewMethod("");
    setIntervieweeName("");
    setIntervieweeRole("");
    setKeyObservations("");
  };

  const resetSiteVisitForm = () => {
    setSiteName("");
    setSiteAddress("");
    setParticipantsAtSite("");
    setFilesReviewedCount("");
    setObservationsPositive("");
    setObservationsConcerns("");
  };

  const handleAddInterview = () => {
    if (!interviewType || !interviewMethod) return;
    addInterviewMutation.mutate({
      interviewType,
      interviewMethod,
      intervieweeName: intervieweeName || undefined,
      intervieweeRole: intervieweeRole || undefined,
      keyObservations: keyObservations || undefined,
    });
  };

  const handleAddSiteVisit = () => {
    if (!siteName) return;
    addSiteVisitMutation.mutate({
      siteName,
      siteAddress: siteAddress || undefined,
      participantsAtSite: participantsAtSite ? parseInt(participantsAtSite) : undefined,
      filesReviewedCount: filesReviewedCount ? parseInt(filesReviewedCount) : undefined,
      observationsPositive: observationsPositive || undefined,
      observationsConcerns: observationsConcerns || undefined,
    });
  };

  const isLoading = auditLoading || reportLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64" data-testid="loading-spinner">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!audit || !reportData) {
    return (
      <div className="text-center py-8" data-testid="error-not-found">
        <p className="text-muted-foreground">Audit not found</p>
        <Button variant="link" onClick={() => navigate("/company/audits")}>
          Back to Audits
        </Button>
      </div>
    );
  }

  const interviews = reportData.interviews || [];
  const siteVisits = reportData.siteVisits || [];
  const indicatorResponses = reportData.indicatorResponses || [];
  const findings = reportData.findings || [];

  const conformityBestPracticeCount = indicatorResponses.filter((r: any) => r.rating === "CONFORMITY_BEST_PRACTICE").length;
  const conformityCount = indicatorResponses.filter((r: any) => r.rating === "CONFORMITY").length;
  const minorNcCount = indicatorResponses.filter((r: any) => r.rating === "MINOR_NC").length;
  const majorNcCount = indicatorResponses.filter((r: any) => r.rating === "MAJOR_NC").length;
  const totalIndicators = indicatorResponses.length;
  
  const scorePoints = indicatorResponses.reduce((sum: number, r: any) => sum + (r.scorePoints || 0), 0);
  const maxPoints = totalIndicators * 3;
  const scorePercent = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="audit-report-page">
      <Button variant="ghost" className="mb-2" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="page-title">
          {audit.title}
        </h1>
        <p className="text-muted-foreground">Audit Report</p>
      </div>

      <AuditNavTabs auditId={id!} currentTab="report" />

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList data-testid="report-tabs">
          <TabsTrigger value="summary" data-testid="tab-summary">
            <Sparkles className="h-4 w-4 mr-2" />
            Executive Summary
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="interviews" data-testid="tab-interviews">
            <Users className="h-4 w-4 mr-2" />
            Interviews ({interviews.length})
          </TabsTrigger>
          <TabsTrigger value="sites" data-testid="tab-sites">
            <MapPin className="h-4 w-4 mr-2" />
            Site Visits ({siteVisits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card data-testid="executive-summary-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-violet-500" />
                    AI-Powered Executive Summary
                  </CardTitle>
                  <CardDescription>
                    Generate a professional summary using AI, then edit to customize
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!executiveSummary && (
                    <Button
                      onClick={() => generateSummaryMutation.mutate(false)}
                      disabled={generateSummaryMutation.isPending}
                      className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600"
                      data-testid="generate-summary-button"
                    >
                      {generateSummaryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Generate Summary
                    </Button>
                  )}
                  {executiveSummary && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => generateSummaryMutation.mutate(true)}
                        disabled={generateSummaryMutation.isPending}
                        data-testid="regenerate-summary-button"
                      >
                        {generateSummaryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                          onClick={() => saveSummaryMutation.mutate(executiveSummary)}
                          disabled={saveSummaryMutation.isPending || !hasChanges}
                          data-testid="save-summary-button"
                        >
                          {saveSummaryMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!executiveSummary ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg" data-testid="no-summary-placeholder">
                  <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-2">No executive summary yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Generate Summary" to create an AI-powered executive summary based on your audit data
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    value={executiveSummary}
                    onChange={(e) => handleSummaryChange(e.target.value)}
                    className="min-h-[300px] text-base leading-relaxed"
                    placeholder="Executive summary..."
                    data-testid="summary-textarea"
                  />
                  <p className="text-xs text-muted-foreground">
                    Word count: {executiveSummary.split(/\s+/).filter(Boolean).length}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="audit-details-card">
              <CardHeader>
                <CardTitle>Audit Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{audit.auditType}</span>
                </div>
                {audit.auditPurpose && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purpose</span>
                    <span className="font-medium">
                      {audit.auditPurpose === "INITIAL_CERTIFICATION" ? "Initial Certification" :
                       audit.auditPurpose === "RECERTIFICATION" ? "Recertification" :
                       audit.auditPurpose === "SURVEILLANCE" ? "Surveillance" :
                       audit.auditPurpose === "SCOPE_EXTENSION" ? "Scope Extension" :
                       audit.auditPurpose === "TRANSFER_AUDIT" ? "Transfer Audit" :
                       audit.auditPurpose === "SPECIAL_AUDIT" ? "Special Audit" : audit.auditPurpose}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Context</span>
                  <span className="font-medium">{audit.serviceContextLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scope Period</span>
                  <span className="font-medium">
                    {format(new Date(audit.scopeTimeFrom), "MMM d, yyyy")} - {format(new Date(audit.scopeTimeTo), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline">{audit.status}</Badge>
                </div>
              </CardContent>
            </Card>

            {(audit.entityName || audit.entityAbn || audit.entityAddress) && (
              <Card data-testid="entity-details-card">
                <CardHeader>
                  <CardTitle>Entity Being Audited</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audit.entityName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organisation</span>
                      <span className="font-medium">{audit.entityName}</span>
                    </div>
                  )}
                  {audit.entityAbn && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ABN</span>
                      <span className="font-medium">{audit.entityAbn}</span>
                    </div>
                  )}
                  {audit.entityAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-right max-w-[200px]">{audit.entityAddress}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card data-testid="score-summary-card">
              <CardHeader>
                <CardTitle>Score Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Overall Score</span>
                    <span className="font-bold text-xl">{scorePercent}%</span>
                  </div>
                  <Progress value={scorePercent} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {scorePoints} / {maxPoints} points
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className={`p-2 rounded-lg ${ratingColors.CONFORMITY_BEST_PRACTICE}`}>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{conformityBestPracticeCount}</span>
                    </div>
                    <p className="text-xs">Best Practice</p>
                  </div>
                  <div className={`p-2 rounded-lg ${ratingColors.CONFORMITY}`}>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">{conformityCount}</span>
                    </div>
                    <p className="text-xs">Conformity</p>
                  </div>
                  <div className={`p-2 rounded-lg ${ratingColors.MINOR_NC}`}>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{minorNcCount}</span>
                    </div>
                    <p className="text-xs">Minor NC</p>
                  </div>
                  <div className={`p-2 rounded-lg ${ratingColors.MAJOR_NC}`}>
                    <div className="flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{majorNcCount}</span>
                    </div>
                    <p className="text-xs">Major NC</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="indicators-breakdown-card">
            <CardHeader>
              <CardTitle>Indicators by Rating</CardTitle>
              <CardDescription>
                All {totalIndicators} indicators assessed in this audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {indicatorResponses.map((response: any) => (
                  <div 
                    key={response.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`indicator-response-${response.id}`}
                  >
                    <Badge className={ratingColors[response.rating as IndicatorRating]}>
                      {ratingLabels[response.rating as IndicatorRating]}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{response.indicatorCode}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {response.comment || "No comment"}
                      </p>
                    </div>
                  </div>
                ))}
                {indicatorResponses.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No indicator responses recorded yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          <Card data-testid="interviews-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Interviews Conducted</CardTitle>
                  <CardDescription>
                    {interviews.length} interview{interviews.length !== 1 ? "s" : ""} recorded for this audit
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddInterviewDialog(true)} data-testid="button-add-interview">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interview
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No interviews recorded</p>
                  <p className="text-sm text-muted-foreground">
                    Interview records enhance the quality of your audit report
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview: any) => (
                    <div 
                      key={interview.id} 
                      className="p-4 rounded-lg border"
                      data-testid={`interview-${interview.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{interview.interviewType}</Badge>
                          <Badge variant="secondary">{interview.interviewMethod}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {interview.interviewDate && (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(interview.interviewDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInterviewMutation.mutate(interview.id)}
                            disabled={deleteInterviewMutation.isPending}
                            data-testid={`button-delete-interview-${interview.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {interview.intervieweeName && (
                        <p className="font-medium">{interview.intervieweeName}</p>
                      )}
                      {interview.intervieweeRole && (
                        <p className="text-sm text-muted-foreground">{interview.intervieweeRole}</p>
                      )}
                      {interview.keyObservations && (
                        <p className="text-sm mt-2 p-2 bg-muted/50 rounded">
                          {interview.keyObservations}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <Card data-testid="site-visits-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Site Visits</CardTitle>
                  <CardDescription>
                    {siteVisits.length} site visit{siteVisits.length !== 1 ? "s" : ""} recorded for this audit
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddSiteVisitDialog(true)} data-testid="button-add-site-visit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Site Visit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {siteVisits.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No site visits recorded</p>
                  <p className="text-sm text-muted-foreground">
                    Site visit observations enhance the quality of your audit report
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {siteVisits.map((visit: any) => (
                    <div 
                      key={visit.id} 
                      className="p-4 rounded-lg border"
                      data-testid={`site-visit-${visit.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{visit.siteName}</h4>
                        <div className="flex items-center gap-2">
                          {visit.visitDate && (
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(visit.visitDate), "MMM d, yyyy")}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSiteVisitMutation.mutate(visit.id)}
                            disabled={deleteSiteVisitMutation.isPending}
                            data-testid={`button-delete-site-visit-${visit.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {visit.siteAddress && (
                        <p className="text-sm text-muted-foreground mb-2">{visit.siteAddress}</p>
                      )}
                      <div className="flex gap-4 text-sm">
                        {visit.participantsAtSite && (
                          <span className="text-muted-foreground">
                            {visit.participantsAtSite} participants
                          </span>
                        )}
                        {visit.filesReviewedCount && (
                          <span className="text-muted-foreground">
                            {visit.filesReviewedCount} files reviewed
                          </span>
                        )}
                      </div>
                      {visit.observationsPositive && (
                        <div className="mt-2 p-2 bg-green-500/10 rounded text-sm">
                          <span className="font-medium text-green-600">Positive: </span>
                          {visit.observationsPositive}
                        </div>
                      )}
                      {visit.observationsConcerns && (
                        <div className="mt-2 p-2 bg-yellow-500/10 rounded text-sm">
                          <span className="font-medium text-yellow-600">Concerns: </span>
                          {visit.observationsConcerns}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Interview Dialog */}
      <Dialog open={showAddInterviewDialog} onOpenChange={setShowAddInterviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Interview Type *</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger data-testid="select-interview-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARTICIPANT">Participant</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="STAKEHOLDER">Stakeholder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Method *</Label>
              <Select value={interviewMethod} onValueChange={setInterviewMethod}>
                <SelectTrigger data-testid="select-interview-method">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACE_TO_FACE">Face to Face</SelectItem>
                  <SelectItem value="PHONE">Phone</SelectItem>
                  <SelectItem value="VIDEO">Video Call</SelectItem>
                  <SelectItem value="FOCUS_GROUP">Focus Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Interviewee Name</Label>
              <Input
                value={intervieweeName}
                onChange={(e) => setIntervieweeName(e.target.value)}
                placeholder="Name of person interviewed"
                data-testid="input-interviewee-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Interviewee Role</Label>
              <Input
                value={intervieweeRole}
                onChange={(e) => setIntervieweeRole(e.target.value)}
                placeholder="Role or position"
                data-testid="input-interviewee-role"
              />
            </div>
            <div className="space-y-2">
              <Label>Key Observations</Label>
              <Textarea
                value={keyObservations}
                onChange={(e) => setKeyObservations(e.target.value)}
                placeholder="Key observations from the interview..."
                data-testid="input-key-observations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddInterviewDialog(false); resetInterviewForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddInterview}
              disabled={!interviewType || !interviewMethod || addInterviewMutation.isPending}
              data-testid="button-save-interview"
            >
              {addInterviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Site Visit Dialog */}
      <Dialog open={showAddSiteVisitDialog} onOpenChange={setShowAddSiteVisitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Site Name *</Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Name of the site visited"
                data-testid="input-site-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Input
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="Address of the site"
                data-testid="input-site-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Participants at Site</Label>
                <Input
                  type="number"
                  value={participantsAtSite}
                  onChange={(e) => setParticipantsAtSite(e.target.value)}
                  placeholder="0"
                  data-testid="input-participants-count"
                />
              </div>
              <div className="space-y-2">
                <Label>Files Reviewed</Label>
                <Input
                  type="number"
                  value={filesReviewedCount}
                  onChange={(e) => setFilesReviewedCount(e.target.value)}
                  placeholder="0"
                  data-testid="input-files-reviewed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Positive Observations</Label>
              <Textarea
                value={observationsPositive}
                onChange={(e) => setObservationsPositive(e.target.value)}
                placeholder="Positive observations during the visit..."
                data-testid="input-observations-positive"
              />
            </div>
            <div className="space-y-2">
              <Label>Areas of Concern</Label>
              <Textarea
                value={observationsConcerns}
                onChange={(e) => setObservationsConcerns(e.target.value)}
                placeholder="Any concerns identified..."
                data-testid="input-observations-concerns"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddSiteVisitDialog(false); resetSiteVisitForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSiteVisit}
              disabled={!siteName || addSiteVisitMutation.isPending}
              data-testid="button-save-site-visit"
            >
              {addSiteVisitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Site Visit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
