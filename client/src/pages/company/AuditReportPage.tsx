import React, { useState, useEffect } from "react";
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
  Trash2,
  Pencil,
  FileSignature,
  MessageSquare,
  ClipboardList
} from "lucide-react";
import { AuditNavTabs } from "@/components/AuditNavTabs";
import { getAudit, type IndicatorRating } from "@/lib/company-api";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  SITE_VISIT_DOCUMENT_CHECKLIST, 
  PARTICIPANT_FEEDBACK_CHECKLIST,
  STAFF_HR_DOCUMENTATION_CHECKLIST,
  type ChecklistItem,
  initializeChecklist 
} from "@shared/audit-checklists";

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
  
  // Interview feedback checklist state (for participants)
  const [feedbackChecklist, setFeedbackChecklist] = useState<ChecklistItem[]>(
    initializeChecklist(PARTICIPANT_FEEDBACK_CHECKLIST)
  );
  // Staff HR documentation checklist state (for staff interviews)
  const [staffHRChecklist, setStaffHRChecklist] = useState<ChecklistItem[]>(
    initializeChecklist(STAFF_HR_DOCUMENTATION_CHECKLIST)
  );
  
  // Site visit form state
  const [showAddSiteVisitDialog, setShowAddSiteVisitDialog] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [participantsAtSite, setParticipantsAtSite] = useState("");
  const [filesReviewedCount, setFilesReviewedCount] = useState("");
  const [observationsPositive, setObservationsPositive] = useState("");
  const [observationsConcerns, setObservationsConcerns] = useState("");
  // Site visit document checklist state
  const [documentChecklist, setDocumentChecklist] = useState<ChecklistItem[]>(
    initializeChecklist(SITE_VISIT_DOCUMENT_CHECKLIST)
  );

  // Methodology edit state
  const [showMethodologyDialog, setShowMethodologyDialog] = useState(false);
  const [selectedMethodology, setSelectedMethodology] = useState<string>("");

  // Document checklist commentary state
  const [leadAuditorComment, setLeadAuditorComment] = useState("");
  const [staffInterviewCommentary, setStaffInterviewCommentary] = useState("");
  const [clientInterviewCommentary, setClientInterviewCommentary] = useState("");
  const [siteVisitCommentary, setSiteVisitCommentary] = useState("");
  const [commentaryHasChanges, setCommentaryHasChanges] = useState(false);

  // Registration groups witnessing state
  type RegistrationGroupItem = {
    lineItemId: string;
    itemCode: string;
    itemLabel: string;
    recommended: boolean;
    status: "KEEP" | "ADD" | "REMOVE";
    witnessed: "YES" | "NO" | "NA";
  };
  const [registrationGroups, setRegistrationGroups] = useState<RegistrationGroupItem[]>([]);
  const [registrationGroupsInitialized, setRegistrationGroupsInitialized] = useState(false);

  // Conclusion data state
  type ConclusionData = {
    conclusionText: string;
    reviewersNote: string;
    reviewersRecommendationDate: string;
    endorsement1: boolean;
    endorsement2: boolean;
    endorsement3: boolean;
    followUpRequired: boolean;
    leadAuditorName: string;
    leadAuditorSignature: string;
    signatureDate: string;
  };
  const [conclusionData, setConclusionData] = useState<ConclusionData>({
    conclusionText: "",
    reviewersNote: "",
    reviewersRecommendationDate: "",
    endorsement1: false,
    endorsement2: false,
    endorsement3: false,
    followUpRequired: false,
    leadAuditorName: "",
    leadAuditorSignature: "",
    signatureDate: "",
  });

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

  // Load commentary fields from audit data
  useEffect(() => {
    if (reportData?.audit) {
      const audit = reportData.audit as any;
      if (audit.leadAuditorComment) setLeadAuditorComment(audit.leadAuditorComment);
      if (audit.staffInterviewCommentary) setStaffInterviewCommentary(audit.staffInterviewCommentary);
      if (audit.clientInterviewCommentary) setClientInterviewCommentary(audit.clientInterviewCommentary);
      if (audit.siteVisitCommentary) setSiteVisitCommentary(audit.siteVisitCommentary);
      
      // Load registration groups witnessing data
      if (audit.registrationGroupsWitnessing && !registrationGroupsInitialized) {
        setRegistrationGroups(audit.registrationGroupsWitnessing);
        setRegistrationGroupsInitialized(true);
      }
      
      // Load conclusion data
      if (audit.conclusionData) {
        setConclusionData(prev => ({ ...prev, ...audit.conclusionData }));
      }
    }
  }, [reportData, registrationGroupsInitialized]);

  // Fetch scope line items to initialize registration groups
  const { data: scopeLineItems } = useQuery({
    queryKey: ["auditScopeLineItems", id],
    queryFn: async () => {
      const res = await fetch(`/api/company/audits/${id}/scope`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  // Initialize registration groups from scope line items
  useEffect(() => {
    if (scopeLineItems && scopeLineItems.length > 0 && !registrationGroupsInitialized) {
      const existingData = (reportData?.audit as any)?.registrationGroupsWitnessing;
      if (existingData && existingData.length > 0) {
        setRegistrationGroups(existingData);
      } else {
        const groups = scopeLineItems.map((item: any) => ({
          lineItemId: item.lineItemId || item.id,
          itemCode: item.itemCode || item.lineItem?.itemCode || "",
          itemLabel: item.itemLabel || item.lineItem?.itemLabel || "",
          recommended: false,
          status: "KEEP" as const,
          witnessed: "NA" as const,
        }));
        setRegistrationGroups(groups);
      }
      setRegistrationGroupsInitialized(true);
    }
  }, [scopeLineItems, registrationGroupsInitialized, reportData]);

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
      feedbackChecklist?: ChecklistItem[];
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
      documentChecklist?: ChecklistItem[];
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

  const updateMethodologyMutation = useMutation({
    mutationFn: async (methodology: string) => {
      const res = await fetch(`/api/company/audits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ methodology }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update methodology" }));
        throw new Error(error.error || "Failed to update methodology");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      setShowMethodologyDialog(false);
      toast({ title: "Methodology updated", description: "The audit methodology has been updated." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const saveCommentaryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/company/audits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leadAuditorComment,
          staffInterviewCommentary,
          clientInterviewCommentary,
          siteVisitCommentary,
          registrationGroupsWitnessing: registrationGroups,
          conclusionData,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(error.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      queryClient.invalidateQueries({ queryKey: ["auditReportData", id] });
      setCommentaryHasChanges(false);
      toast({ title: "Changes saved", description: "Your changes have been saved successfully." });
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
    setFeedbackChecklist(initializeChecklist(PARTICIPANT_FEEDBACK_CHECKLIST));
    setStaffHRChecklist(initializeChecklist(STAFF_HR_DOCUMENTATION_CHECKLIST));
  };

  const resetSiteVisitForm = () => {
    setSiteName("");
    setSiteAddress("");
    setParticipantsAtSite("");
    setFilesReviewedCount("");
    setObservationsPositive("");
    setObservationsConcerns("");
    setDocumentChecklist(initializeChecklist(SITE_VISIT_DOCUMENT_CHECKLIST));
  };
  
  const toggleChecklistItem = (
    checklist: ChecklistItem[], 
    setChecklist: React.Dispatch<React.SetStateAction<ChecklistItem[]>>,
    index: number,
    field: 'checked' | 'partial'
  ) => {
    const updated = [...checklist];
    if (field === 'checked') {
      updated[index].checked = !updated[index].checked;
      if (updated[index].checked) updated[index].partial = false;
    } else {
      updated[index].partial = !updated[index].partial;
      if (updated[index].partial) updated[index].checked = false;
    }
    setChecklist(updated);
  };

  const handleAddInterview = () => {
    if (!interviewType || !interviewMethod) return;
    // Use appropriate checklist based on interview type
    const activeChecklist = interviewType === 'STAFF' ? staffHRChecklist : feedbackChecklist;
    const checkedItems = activeChecklist.filter(item => item.checked || item.partial);
    addInterviewMutation.mutate({
      interviewType,
      interviewMethod,
      intervieweeName: intervieweeName || undefined,
      intervieweeRole: intervieweeRole || undefined,
      keyObservations: keyObservations || undefined,
      feedbackChecklist: checkedItems.length > 0 ? activeChecklist : undefined,
    });
  };

  const handleAddSiteVisit = () => {
    if (!siteName) return;
    const checkedItems = documentChecklist.filter(item => item.checked || item.partial);
    addSiteVisitMutation.mutate({
      siteName,
      siteAddress: siteAddress || undefined,
      participantsAtSite: participantsAtSite ? parseInt(participantsAtSite) : undefined,
      filesReviewedCount: filesReviewedCount ? parseInt(filesReviewedCount) : undefined,
      observationsPositive: observationsPositive || undefined,
      observationsConcerns: observationsConcerns || undefined,
      documentChecklist: checkedItems.length > 0 ? documentChecklist : undefined,
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
          <TabsTrigger value="document-checklist" data-testid="tab-document-checklist">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Document Checklist
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
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Methodology</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {audit.methodology === "ONSITE" ? "On-site" :
                       audit.methodology === "REMOTE" ? "Remote" :
                       audit.methodology === "HYBRID" ? "Hybrid" : "Not set"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setShowMethodologyDialog(true)}
                      data-testid="edit-methodology-button"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
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

        {/* Document Checklist Tab */}
        <TabsContent value="document-checklist" className="space-y-4">
          {/* Overall Compliance Status Card */}
          <Card data-testid="compliance-status-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-primary">Overall Compliance Status</CardTitle>
              <CardDescription>
                NDIS Practice Standards compliance summary based on indicator responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // NDIS Standards definitions
                const NDIS_STANDARDS: Record<string, { number: string; name: string; division: string }> = {
                  "11": { number: "11", name: "Governance and Operational Management", division: "Division 2 – Governance and Operational Management" },
                  "12": { number: "12", name: "Risk Management", division: "Division 2 – Governance and Operational Management" },
                  "13": { number: "13", name: "Quality Management", division: "Division 2 – Governance and Operational Management" },
                  "14": { number: "14", name: "Information Management", division: "Division 2 – Governance and Operational Management" },
                  "15": { number: "15", name: "Feedback and Complaints Management", division: "Division 2 – Governance and Operational Management" },
                  "16": { number: "16", name: "Incident Management", division: "Division 2 – Governance and Operational Management" },
                  "17": { number: "17", name: "Human Resource Management", division: "Division 3 – Provision of Supports" },
                  "18": { number: "18", name: "Continuity of Supports", division: "Division 3 – Provision of Supports" },
                  "18A": { number: "18A", name: "Emergency and Disaster Management", division: "Division 3 – Provision of Supports" },
                };

                // Keywords to map indicators to standards
                const KEYWORD_MAPPINGS: { keywords: string[]; standard: string }[] = [
                  { keywords: ["governance", "organisational structure", "delegations", "roles and responsibilities", "board", "policy register", "whistleblower"], standard: "11" },
                  { keywords: ["risk management", "risk register", "client-specific risk"], standard: "12" },
                  { keywords: ["continuous improvement", "quality improvement", "internal audit", "external audit", "management review"], standard: "13" },
                  { keywords: ["privacy", "confidentiality", "information management", "record keeping"], standard: "14" },
                  { keywords: ["complaints", "feedback"], standard: "15" },
                  { keywords: ["incident"], standard: "16" },
                  { keywords: ["police check", "worker screening", "qualification", "training", "induction", "supervision", "performance review", "staff register", "rostering", "code of conduct"], standard: "17" },
                  { keywords: ["continuity", "transition"], standard: "18" },
                  { keywords: ["emergency", "evacuation", "fire safety", "disaster"], standard: "18A" },
                ];

                const getStandardForIndicator = (text: string): string | null => {
                  if (!text) return null;
                  const normalized = text.toLowerCase();
                  for (const mapping of KEYWORD_MAPPINGS) {
                    for (const keyword of mapping.keywords) {
                      if (normalized.includes(keyword.toLowerCase())) {
                        return mapping.standard;
                      }
                    }
                  }
                  return null;
                };

                const ratingToScore: Record<string, number> = {
                  "CONFORMITY_BEST_PRACTICE": 3,
                  "CONFORMITY": 2,
                  "MINOR_NC": 1,
                  "MAJOR_NC": 0,
                };

                // Group responses by standard
                const standardScores: Record<string, { total: number; count: number }> = {};
                
                indicatorResponses.forEach((response: any) => {
                  const standardKey = getStandardForIndicator(response.indicatorText || "");
                  if (standardKey && response.rating) {
                    if (!standardScores[standardKey]) {
                      standardScores[standardKey] = { total: 0, count: 0 };
                    }
                    standardScores[standardKey].total += ratingToScore[response.rating] || 0;
                    standardScores[standardKey].count += 1;
                  }
                });

                // Calculate average per standard
                const standardResults = Object.entries(standardScores).map(([key, scores]) => ({
                  ...NDIS_STANDARDS[key],
                  avgRating: scores.count > 0 ? Math.round((scores.total / scores.count) * 10) / 10 : 0,
                  indicatorCount: scores.count,
                })).sort((a, b) => a.number.localeCompare(b.number));

                // Group by division
                const byDivision: Record<string, typeof standardResults> = {};
                standardResults.forEach(result => {
                  if (!byDivision[result.division]) {
                    byDivision[result.division] = [];
                  }
                  byDivision[result.division].push(result);
                });

                if (standardResults.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No indicator responses recorded yet. Complete the audit to see compliance status.
                    </div>
                  );
                }

                return (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-primary/90 text-primary-foreground">
                          <th className="text-left px-4 py-3 font-medium w-32">Standard</th>
                          <th className="text-left px-4 py-3 font-medium">Name</th>
                          <th className="text-center px-4 py-3 font-medium w-24">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(byDivision).map(([division, standards]) => (
                          <React.Fragment key={division}>
                            <tr className="bg-slate-100">
                              <td colSpan={3} className="px-4 py-2 font-semibold text-slate-700">
                                {division}
                              </td>
                            </tr>
                            {standards.map((std) => (
                              <tr key={std.number} className="border-t border-slate-200 hover:bg-slate-50">
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3">{std.number} {std.name}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-semibold ${
                                    std.avgRating >= 2.5 ? 'text-green-600' : 
                                    std.avgRating >= 1.5 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {std.avgRating}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card data-testid="document-checklist-card">
            <CardHeader>
              <CardTitle>Auditor Commentary</CardTitle>
              <CardDescription>
                Consolidate your observations and commentary from all audit activities. These commentary sections will appear in the final audit report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lead Auditor Comment */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Lead Auditor Comment</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Overall observations and summary from the lead auditor regarding the audit process and findings.
                </p>
                <Textarea
                  value={leadAuditorComment}
                  onChange={(e) => {
                    setLeadAuditorComment(e.target.value);
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Enter lead auditor's overall observations and summary..."
                  className="min-h-[120px]"
                  data-testid="input-lead-auditor-comment"
                />
              </div>

              {/* Staff Interview Commentary */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">Staff Interview Commentary</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consolidated observations from staff interviews. Include key themes, compliance awareness, and procedural understanding noted during staff interviews.
                </p>
                <Textarea
                  value={staffInterviewCommentary}
                  onChange={(e) => {
                    setStaffInterviewCommentary(e.target.value);
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Staff demonstrated good understanding of procedures... Key themes included..."
                  className="min-h-[150px]"
                  data-testid="input-staff-interview-commentary"
                />
              </div>

              {/* Client/Participant Interview Commentary */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg">Client/Participant Interview Commentary</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consolidated observations from participant and client interviews. Include feedback themes, satisfaction levels, and any concerns raised by participants.
                </p>
                <Textarea
                  value={clientInterviewCommentary}
                  onChange={(e) => {
                    setClientInterviewCommentary(e.target.value);
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Participants expressed satisfaction with... Common themes included..."
                  className="min-h-[150px]"
                  data-testid="input-client-interview-commentary"
                />
              </div>

              {/* Site Visit Commentary */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-lg">Site Visit Commentary</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Consolidated observations from site visits. Include environmental observations, facility conditions, documentation practices, and operational processes observed.
                </p>
                <Textarea
                  value={siteVisitCommentary}
                  onChange={(e) => {
                    setSiteVisitCommentary(e.target.value);
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Site facilities were well-maintained... Documentation was organized and accessible..."
                  className="min-h-[150px]"
                  data-testid="input-site-visit-commentary"
                />
              </div>

              {/* Summary Statistics */}
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">Audit Activities Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{interviews.filter(i => i.interviewType === 'STAFF').length}</div>
                    <div className="text-sm text-muted-foreground">Staff Interviews</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{interviews.filter(i => i.interviewType === 'PARTICIPANT').length}</div>
                    <div className="text-sm text-muted-foreground">Participant Interviews</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{siteVisits.length}</div>
                    <div className="text-sm text-muted-foreground">Site Visits</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{findings.reduce((acc: number, f: any) => acc + (f.evidenceRequests?.length || 0), 0)}</div>
                    <div className="text-sm text-muted-foreground">Evidence Requests</div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => saveCommentaryMutation.mutate()}
                  disabled={!commentaryHasChanges || saveCommentaryMutation.isPending}
                  data-testid="button-save-commentary"
                >
                  {saveCommentaryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save All Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Registration Groups & Witnessing */}
          <Card data-testid="registration-groups-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Registration Groups & Witnessing
              </CardTitle>
              <CardDescription>
                Review scope line items and record witnessing status for each registration group.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {registrationGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scope line items found. Add registration groups in the audit scope to see them here.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="text-left px-4 py-3 font-medium w-32">NDIS Code</th>
                        <th className="text-left px-4 py-3 font-medium">Registration Group</th>
                        <th className="text-center px-4 py-3 font-medium w-28">Recommended</th>
                        <th className="text-center px-4 py-3 font-medium w-32">Status</th>
                        <th className="text-center px-4 py-3 font-medium w-28">Witnessed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationGroups.map((group, idx) => (
                        <tr key={group.lineItemId} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-sm">{group.itemCode}</td>
                          <td className="px-4 py-3">{group.itemLabel}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={group.recommended}
                              onChange={(e) => {
                                const updated = [...registrationGroups];
                                updated[idx] = { ...updated[idx], recommended: e.target.checked };
                                setRegistrationGroups(updated);
                                setCommentaryHasChanges(true);
                              }}
                              className="h-4 w-4"
                              data-testid={`checkbox-recommended-${idx}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Select
                              value={group.status}
                              onValueChange={(value: "KEEP" | "ADD" | "REMOVE") => {
                                const updated = [...registrationGroups];
                                updated[idx] = { ...updated[idx], status: value };
                                setRegistrationGroups(updated);
                                setCommentaryHasChanges(true);
                              }}
                            >
                              <SelectTrigger className="w-24" data-testid={`select-status-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="KEEP">Keep</SelectItem>
                                <SelectItem value="ADD">Add</SelectItem>
                                <SelectItem value="REMOVE">Remove</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Select
                              value={group.witnessed}
                              onValueChange={(value: "YES" | "NO" | "NA") => {
                                const updated = [...registrationGroups];
                                updated[idx] = { ...updated[idx], witnessed: value };
                                setRegistrationGroups(updated);
                                setCommentaryHasChanges(true);
                              }}
                            >
                              <SelectTrigger className="w-20" data-testid={`select-witnessed-${idx}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="YES">Yes</SelectItem>
                                <SelectItem value="NO">No</SelectItem>
                                <SelectItem value="NA">N/A</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => saveCommentaryMutation.mutate()}
                  disabled={!commentaryHasChanges || saveCommentaryMutation.isPending}
                  data-testid="button-save-registration-groups"
                >
                  {saveCommentaryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conclusion & Sign-off */}
          <Card data-testid="conclusion-signoff-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Conclusion & Sign-off
              </CardTitle>
              <CardDescription>
                Complete the audit conclusion, endorsements, and lead auditor sign-off.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Conclusion Text */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Audit Conclusion</Label>
                <Textarea
                  value={conclusionData.conclusionText}
                  onChange={(e) => {
                    setConclusionData(prev => ({ ...prev, conclusionText: e.target.value }));
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Based on the evidence gathered during this audit, the organisation has demonstrated..."
                  className="min-h-[120px]"
                  data-testid="input-conclusion-text"
                />
              </div>

              {/* Reviewer's Note */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Reviewer's Note</Label>
                <p className="text-sm text-muted-foreground">
                  Internal notes from the review process (not included in public report).
                </p>
                <Textarea
                  value={conclusionData.reviewersNote}
                  onChange={(e) => {
                    setConclusionData(prev => ({ ...prev, reviewersNote: e.target.value }));
                    setCommentaryHasChanges(true);
                  }}
                  placeholder="Reviewer notes and comments..."
                  className="min-h-[80px]"
                  data-testid="input-reviewers-note"
                />
                <div className="flex items-center gap-4">
                  <Label>Recommendation Date:</Label>
                  <Input
                    type="date"
                    value={conclusionData.reviewersRecommendationDate}
                    onChange={(e) => {
                      setConclusionData(prev => ({ ...prev, reviewersRecommendationDate: e.target.value }));
                      setCommentaryHasChanges(true);
                    }}
                    className="w-48"
                    data-testid="input-recommendation-date"
                  />
                </div>
              </div>

              {/* Auditor Endorsements */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Auditor Endorsements</Label>
                <p className="text-sm text-muted-foreground">
                  Confirm the following statements before signing off on this audit.
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conclusionData.endorsement1}
                      onChange={(e) => {
                        setConclusionData(prev => ({ ...prev, endorsement1: e.target.checked }));
                        setCommentaryHasChanges(true);
                      }}
                      className="h-5 w-5 mt-0.5"
                      data-testid="checkbox-endorsement-1"
                    />
                    <span>I confirm that the audit was conducted in accordance with the NDIS Quality and Safeguards Commission requirements and applicable standards.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conclusionData.endorsement2}
                      onChange={(e) => {
                        setConclusionData(prev => ({ ...prev, endorsement2: e.target.checked }));
                        setCommentaryHasChanges(true);
                      }}
                      className="h-5 w-5 mt-0.5"
                      data-testid="checkbox-endorsement-2"
                    />
                    <span>I confirm that the findings and conclusions in this report are based on objective evidence gathered during the audit.</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conclusionData.endorsement3}
                      onChange={(e) => {
                        setConclusionData(prev => ({ ...prev, endorsement3: e.target.checked }));
                        setCommentaryHasChanges(true);
                      }}
                      className="h-5 w-5 mt-0.5"
                      data-testid="checkbox-endorsement-3"
                    />
                    <span>I confirm that all non-conformances have been accurately documented and communicated to the organisation.</span>
                  </label>
                </div>
              </div>

              {/* Follow-up Requirements */}
              <div className="space-y-3 pt-4 border-t">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conclusionData.followUpRequired}
                    onChange={(e) => {
                      setConclusionData(prev => ({ ...prev, followUpRequired: e.target.checked }));
                      setCommentaryHasChanges(true);
                    }}
                    className="h-5 w-5"
                    data-testid="checkbox-followup-required"
                  />
                  <span className="font-semibold">Follow-up audit required</span>
                </label>
                <p className="text-sm text-muted-foreground ml-8">
                  Check this box if a follow-up audit is required to verify corrective actions.
                </p>
              </div>

              {/* Lead Auditor Signature */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold">Lead Auditor Sign-off</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lead Auditor Name</Label>
                    <Input
                      value={conclusionData.leadAuditorName}
                      onChange={(e) => {
                        setConclusionData(prev => ({ ...prev, leadAuditorName: e.target.value }));
                        setCommentaryHasChanges(true);
                      }}
                      placeholder="Full name"
                      data-testid="input-lead-auditor-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signature Date</Label>
                    <Input
                      type="date"
                      value={conclusionData.signatureDate}
                      onChange={(e) => {
                        setConclusionData(prev => ({ ...prev, signatureDate: e.target.value }));
                        setCommentaryHasChanges(true);
                      }}
                      className="w-48"
                      data-testid="input-signature-date"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Digital Signature</Label>
                  <Input
                    value={conclusionData.leadAuditorSignature}
                    onChange={(e) => {
                      setConclusionData(prev => ({ ...prev, leadAuditorSignature: e.target.value }));
                      setCommentaryHasChanges(true);
                    }}
                    placeholder="Type your name to sign digitally"
                    className="font-cursive italic"
                    data-testid="input-lead-auditor-signature"
                  />
                </div>
              </div>

              {/* Confidentiality & Disclaimer */}
              <div className="pt-4 border-t space-y-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Confidentiality Statement</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    This audit report contains confidential information intended solely for the use of the organisation named in this report. 
                    Any distribution, copying, or disclosure of this report to third parties without the prior written consent of the certifying body is strictly prohibited.
                  </p>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-lg space-y-3 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">Disclaimer</h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This audit report represents the findings at the time of the audit based on the evidence available. 
                    The audit does not guarantee compliance at any other time. The organisation remains responsible for ongoing compliance with all applicable requirements.
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => saveCommentaryMutation.mutate()}
                  disabled={!commentaryHasChanges || saveCommentaryMutation.isPending}
                  data-testid="button-save-conclusion"
                >
                  {saveCommentaryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Conclusion & Sign-off
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Interview Dialog */}
      <Dialog open={showAddInterviewDialog} onOpenChange={setShowAddInterviewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            
            {interviewType === "PARTICIPANT" && (
              <div className="space-y-2">
                <Label className="text-primary font-semibold">Participant Feedback Checklist</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                  {feedbackChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleChecklistItem(feedbackChecklist, setFeedbackChecklist, idx, 'checked')}
                        data-testid={`checkbox-feedback-${idx}`}
                      />
                      <span className={`text-sm flex-1 ${item.checked ? 'text-foreground' : item.partial ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {item.item}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(feedbackChecklist, setFeedbackChecklist, idx, 'partial')}
                        className={`text-xs px-2 py-0.5 rounded ${item.partial ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        Partial
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {interviewType === "STAFF" && (
              <div className="space-y-2">
                <Label className="text-primary font-semibold">HR Documentation Checklist</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto bg-muted/30">
                  {staffHRChecklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleChecklistItem(staffHRChecklist, setStaffHRChecklist, idx, 'checked')}
                        data-testid={`checkbox-staff-hr-${idx}`}
                      />
                      <span className={`text-sm flex-1 ${item.checked ? 'text-foreground' : item.partial ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                        {item.item}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleChecklistItem(staffHRChecklist, setStaffHRChecklist, idx, 'partial')}
                        className={`text-xs px-2 py-0.5 rounded ${item.partial ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >
                        Partial
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Site Visit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-primary font-semibold">Document Checklist</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                {documentChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleChecklistItem(documentChecklist, setDocumentChecklist, idx, 'checked')}
                      data-testid={`checkbox-document-${idx}`}
                    />
                    <span className={`text-sm flex-1 ${item.checked ? 'text-foreground' : item.partial ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {item.item}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(documentChecklist, setDocumentChecklist, idx, 'partial')}
                      className={`text-xs px-2 py-0.5 rounded ${item.partial ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      Partial
                    </button>
                  </div>
                ))}
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

      <Dialog open={showMethodologyDialog} onOpenChange={(open) => {
        setShowMethodologyDialog(open);
        if (open && audit) {
          setSelectedMethodology(audit.methodology || "");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Audit Methodology</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Methodology</Label>
              <Select value={selectedMethodology} onValueChange={setSelectedMethodology}>
                <SelectTrigger data-testid="select-methodology-edit">
                  <SelectValue placeholder="Select methodology" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONSITE">On-site - Physical presence at provider locations</SelectItem>
                  <SelectItem value="REMOTE">Remote - Virtual audit via video conferencing</SelectItem>
                  <SelectItem value="HYBRID">Hybrid - Combination of on-site and remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMethodologyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedMethodology && updateMethodologyMutation.mutate(selectedMethodology)}
              disabled={!selectedMethodology || updateMethodologyMutation.isPending}
              data-testid="button-save-methodology"
            >
              {updateMethodologyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
