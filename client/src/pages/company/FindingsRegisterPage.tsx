import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, AlertCircle, Calendar, User, FileText, FolderOpen, CheckCircle, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { 
  getAuditOutcomes,
  getFindings, 
  getFinding, 
  updateFinding, 
  getCompanyUsers, 
  requestEvidence,
  getFindingEvidence,
  getAudits,
  type AuditOutcome,
  type Finding, 
  type FindingStatus,
  type EvidenceType 
} from "@/lib/company-api";
import { format } from "date-fns";
import { useCompanyAuth } from "@/hooks/use-company-auth";

const evidenceTypeOptions: { value: EvidenceType; label: string }[] = [
  // Client Identity & Authority
  { value: "CLIENT_PROFILE", label: "Client Profile / Intake" },
  { value: "NDIS_PLAN", label: "NDIS Plan" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "GUARDIAN_DOCUMENTATION", label: "Guardian / Nominee Documentation" },
  // Assessment & Planning
  { value: "CARE_PLAN", label: "Care / Support Plan" },
  { value: "BSP", label: "Behaviour Support Plan" },
  { value: "MMP", label: "Mealtime Management Plan" },
  { value: "HEALTH_PLAN", label: "Health Management Plan" },
  { value: "COMMUNICATION_PLAN", label: "Communication Plan" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "EMERGENCY_PLAN", label: "Emergency Plan" },
  // Delivery of Supports
  { value: "ROSTER", label: "Roster / Shift Allocation" },
  { value: "SHIFT_NOTES", label: "Shift Notes / Case Notes" },
  { value: "DAILY_LOG", label: "Daily Support Log" },
  { value: "PROGRESS_NOTES", label: "Progress Notes" },
  { value: "ACTIVITY_RECORD", label: "Activity Record" },
  // Staff & Personnel
  { value: "QUALIFICATION", label: "Qualification / Credential" },
  { value: "WWCC", label: "WWCC / Police Check / Screening" },
  { value: "TRAINING_RECORD", label: "Training Record" },
  { value: "SUPERVISION_RECORD", label: "Supervision Record" },
  // Medication & Health
  { value: "MEDICATION_PLAN", label: "Medication Management Plan" },
  { value: "MAR", label: "Medication Administration Record" },
  { value: "PRN_LOG", label: "PRN Protocol / Log" },
  // Incidents & Complaints
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "COMPLAINT_RECORD", label: "Complaint Record" },
  { value: "RP_RECORD", label: "Restrictive Practice Record" },
  // Funding & Claims
  { value: "SERVICE_BOOKING", label: "Service Booking / Funding" },
  { value: "INVOICE_CLAIM", label: "Invoice / Claim Record" },
  // Governance
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure" },
  // Other
  { value: "REVIEW_RECORD", label: "Review / Monitoring Record" },
  { value: "OTHER", label: "Other" },
];

const ratingConfig = {
  CONFORMANCE: { label: "Conformance", color: "bg-green-500", icon: CheckCircle, points: "+2" },
  OBSERVATION: { label: "Observation", color: "bg-blue-500", icon: Eye, points: "+1" },
  MINOR_NC: { label: "Minor NC", color: "bg-yellow-500", icon: AlertTriangle, points: "0" },
  MAJOR_NC: { label: "Major NC", color: "bg-red-500", icon: AlertCircle, points: "-2" },
};

const statusColors: Record<FindingStatus, string> = {
  OPEN: "bg-red-500",
  UNDER_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

export default function FindingsRegisterPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  
  const [editForm, setEditForm] = useState({
    ownerCompanyUserId: "",
    dueDate: "",
    status: "" as FindingStatus | "",
  });
  
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: "" as EvidenceType | "",
    requestNote: "",
    dueDate: "",
  });

  const { data: allOutcomes, isLoading: allOutcomesLoading } = useQuery({
    queryKey: ["auditOutcomes", "all", auditFilter],
    queryFn: () => getAuditOutcomes({
      auditId: auditFilter !== "all" ? auditFilter : undefined,
    }),
  });
  
  const outcomes = ratingFilter === "all" 
    ? allOutcomes 
    : allOutcomes?.filter(o => o.rating === ratingFilter);
    
  const outcomesLoading = allOutcomesLoading;

  const { data: findings, isLoading: findingsLoading } = useQuery({
    queryKey: ["findings", statusFilter, auditFilter],
    queryFn: () => getFindings({
      status: statusFilter !== "all" ? statusFilter as FindingStatus : undefined,
      auditId: auditFilter !== "all" ? auditFilter : undefined,
    }),
  });

  const { data: audits } = useQuery({
    queryKey: ["audits"],
    queryFn: () => getAudits(),
  });

  const { data: users } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateFinding(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      setShowEditDialog(false);
      setSelectedFinding(null);
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: ({ findingId, data }: { findingId: string; data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null } }) => 
      requestEvidence(findingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
      setShowEvidenceDialog(false);
      setEvidenceForm({ evidenceType: "", requestNote: "", dueDate: "" });
      navigate("/evidence");
    },
  });

  const handleEditFinding = async (findingId: string) => {
    const finding = findings?.find(f => f.id === findingId);
    if (!finding) return;
    
    setSelectedFinding(finding);
    setEditForm({
      ownerCompanyUserId: finding.ownerCompanyUserId || "",
      dueDate: finding.dueDate ? format(new Date(finding.dueDate), "yyyy-MM-dd") : "",
      status: finding.status,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedFinding) return;
    
    updateMutation.mutate({
      id: selectedFinding.id,
      updates: {
        ownerCompanyUserId: editForm.ownerCompanyUserId === "unassigned" ? null : editForm.ownerCompanyUserId || null,
        dueDate: editForm.dueDate || null,
        status: editForm.status || undefined,
      },
    });
  };

  const getOwnerName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users?.find(u => u.id === userId);
    return user?.fullName || "Unknown";
  };

  const isLoading = outcomesLoading || findingsLoading;

  const scoreSummary = allOutcomes?.reduce((acc, outcome) => {
    acc.total += outcome.scorePoints;
    acc.count += 1;
    acc.maxPoints += 2;
    return acc;
  }, { total: 0, count: 0, maxPoints: 0 }) || { total: 0, count: 0, maxPoints: 0 };

  const scorePercent = scoreSummary.maxPoints > 0 
    ? Math.round((scoreSummary.total / scoreSummary.maxPoints) * 100) 
    : 0;

  const ratingCounts = allOutcomes?.reduce((acc, outcome) => {
    acc[outcome.rating] = (acc[outcome.rating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const findingsByAuditAndIndicator = findings?.reduce((acc, finding) => {
    const key = `${finding.auditId}-${finding.templateIndicatorId}`;
    acc[key] = finding;
    return acc;
  }, {} as Record<string, Finding>) || {};

  const showNcItems = ratingFilter === "all" || ratingFilter === "MINOR_NC" || ratingFilter === "MAJOR_NC";
  const ncOutcomes = outcomes?.filter(o => o.rating === "MINOR_NC" || o.rating === "MAJOR_NC") || [];
  const positiveOutcomes = outcomes?.filter(o => o.rating === "CONFORMANCE" || o.rating === "OBSERVATION") || [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Results</h1>
        <p className="text-muted-foreground">View all audit indicator ratings and manage findings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Score</p>
                <p className="text-2xl font-bold">{scorePercent}%</p>
              </div>
              {scorePercent >= 70 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {scoreSummary.total} / {scoreSummary.maxPoints} points
            </p>
          </CardContent>
        </Card>
        
        {Object.entries(ratingConfig).map(([key, config]) => (
          <Card key={key} className={ratingFilter === key ? "ring-2 ring-primary" : ""}>
            <CardContent 
              className="py-4 cursor-pointer hover:bg-accent/50" 
              onClick={() => setRatingFilter(ratingFilter === key ? "all" : key)}
              data-testid={`filter-card-${key.toLowerCase()}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="text-2xl font-bold">{ratingCounts[key] || 0}</p>
                </div>
                <config.icon className={`h-8 w-8 ${config.color.replace("bg-", "text-")}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{config.points} pts each</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-48" data-testid="select-rating-filter">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="CONFORMANCE">Conformance</SelectItem>
            <SelectItem value="OBSERVATION">Observation</SelectItem>
            <SelectItem value="MINOR_NC">Minor NC</SelectItem>
            <SelectItem value="MAJOR_NC">Major NC</SelectItem>
          </SelectContent>
        </Select>

        <Select value={auditFilter} onValueChange={setAuditFilter}>
          <SelectTrigger className="w-48" data-testid="select-audit-filter">
            <SelectValue placeholder="Filter by audit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Audits</SelectItem>
            {audits?.map(audit => (
              <SelectItem key={audit.id} value={audit.id}>{audit.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showNcItems && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Finding status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : outcomes?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No audit results yet</p>
            <p className="text-sm text-muted-foreground">Complete an audit to see results here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(ratingFilter === "all" || ratingFilter === "CONFORMANCE" || ratingFilter === "OBSERVATION") && positiveOutcomes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Conformances & Observations
              </h2>
              <div className="space-y-2">
                {positiveOutcomes.map((outcome) => {
                  const config = ratingConfig[outcome.rating];
                  return (
                    <Card 
                      key={outcome.id}
                      className="bg-muted/30"
                      data-testid={`card-outcome-${outcome.id}`}
                    >
                      <CardContent className="py-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={config.color}>{config.label}</Badge>
                              <Badge variant="outline">{config.points} pts</Badge>
                              <span className="text-sm text-muted-foreground">#{outcome.sortOrder + 1}</span>
                            </div>
                            <p className="text-sm">{outcome.indicatorText}</p>
                            {outcome.comment && (
                              <p className="text-sm text-muted-foreground mt-1 italic">"{outcome.comment}"</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Audit: {outcome.auditTitle} | {format(new Date(outcome.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {showNcItems && ncOutcomes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Non-Conformances (Findings)
              </h2>
              <div className="space-y-3">
                {ncOutcomes.map((outcome) => {
                  const findingKey = `${outcome.auditId}-${outcome.templateIndicatorId}`;
                  const finding = findingsByAuditAndIndicator[findingKey];
                  const config = ratingConfig[outcome.rating];
                  
                  return (
                    <Card 
                      key={outcome.id}
                      className={`cursor-pointer hover:bg-accent/50 transition-colors ${outcome.rating === "MAJOR_NC" ? "border-red-200" : "border-yellow-200"}`}
                      onClick={() => finding && navigate(`/findings/${finding.id}`)}
                      data-testid={`card-finding-${outcome.id}`}
                    >
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <config.icon className={`h-5 w-5 ${config.color.replace("bg-", "text-")}`} />
                              <Badge className={config.color}>{config.label}</Badge>
                              <Badge variant="outline">{config.points} pts</Badge>
                              {finding && (
                                <Badge className={statusColors[finding.status]}>{finding.status}</Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">#{outcome.sortOrder + 1}: {outcome.indicatorText}</p>
                            {outcome.comment && (
                              <p className="text-sm text-muted-foreground line-clamp-2">Finding: {outcome.comment}</p>
                            )}
                            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                              {finding && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <User className="h-4 w-4" />
                                    {getOwnerName(finding.ownerCompanyUserId)}
                                  </div>
                                  {finding.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {format(new Date(finding.dueDate), "MMM d, yyyy")}
                                    </div>
                                  )}
                                </>
                              )}
                              <span>Audit: {outcome.auditTitle}</span>
                            </div>
                          </div>
                          {finding && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleEditFinding(finding.id); }}
                              data-testid={`button-edit-finding-${finding.id}`}
                            >
                              Quick Edit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Finding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{selectedFinding?.findingText}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select 
                value={editForm.ownerCompanyUserId} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, ownerCompanyUserId: v }))}
              >
                <SelectTrigger data-testid="select-owner">
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                data-testid="input-due-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v as FindingStatus }))}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {updateMutation.error && (
            <p className="text-sm text-destructive">{(updateMutation.error as Error).message}</p>
          )}
          <DialogFooter className="sm:justify-between">
            <div>
              {selectedFinding?.status !== "CLOSED" && ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "") && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setShowEditDialog(false);
                    setShowEvidenceDialog(true);
                  }}
                  data-testid="button-request-evidence"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Request Evidence
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                data-testid="button-save-finding"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Evidence</DialogTitle>
            <DialogDescription>
              Request evidence to address this finding
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{selectedFinding?.findingText}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Evidence Type *</Label>
              <Select 
                value={evidenceForm.evidenceType} 
                onValueChange={(v) => setEvidenceForm(prev => ({ ...prev, evidenceType: v as EvidenceType }))}
              >
                <SelectTrigger data-testid="select-evidence-type">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {evidenceTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Request Note *</Label>
              <Textarea
                value={evidenceForm.requestNote}
                onChange={(e) => setEvidenceForm(prev => ({ ...prev, requestNote: e.target.value }))}
                placeholder="Describe what evidence is needed and why..."
                data-testid="input-request-note"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={evidenceForm.dueDate}
                onChange={(e) => setEvidenceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                data-testid="input-evidence-due-date"
              />
            </div>
          </div>
          {evidenceMutation.error && (
            <p className="text-sm text-destructive">{(evidenceMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (!selectedFinding || !evidenceForm.evidenceType || !evidenceForm.requestNote) return;
                evidenceMutation.mutate({
                  findingId: selectedFinding.id,
                  data: {
                    evidenceType: evidenceForm.evidenceType as EvidenceType,
                    requestNote: evidenceForm.requestNote,
                    dueDate: evidenceForm.dueDate || null,
                  },
                });
              }}
              disabled={!evidenceForm.evidenceType || !evidenceForm.requestNote || evidenceMutation.isPending}
              data-testid="button-submit-evidence-request"
            >
              {evidenceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Request Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
