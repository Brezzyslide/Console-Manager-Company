import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, Plus, Link, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getEvidenceRequests, 
  getCompanyUsers, 
  createStandaloneEvidenceRequest,
  type EvidenceRequest, 
  type EvidenceStatus,
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
  { value: "BSP", label: "Behaviour Support Plan (BSP)" },
  { value: "MMP", label: "Mealtime Management Plan (MMP)" },
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

const statusConfig: Record<EvidenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED: { label: "Requested", color: "bg-blue-500", icon: <Clock className="h-4 w-4" /> },
  SUBMITTED: { label: "Submitted", color: "bg-yellow-500", icon: <AlertCircle className="h-4 w-4" /> },
  UNDER_REVIEW: { label: "Under Review", color: "bg-purple-500", icon: <Eye className="h-4 w-4" /> },
  ACCEPTED: { label: "Accepted", color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
};

const evidenceTypeLabels: Record<string, string> = {
  // Client Identity & Authority
  CLIENT_PROFILE: "Client Profile / Intake",
  NDIS_PLAN: "NDIS Plan",
  SERVICE_AGREEMENT: "Service Agreement",
  CONSENT_FORM: "Consent Form",
  GUARDIAN_DOCUMENTATION: "Guardian / Nominee Documentation",
  // Assessment & Planning
  CARE_PLAN: "Care / Support Plan",
  BSP: "Behaviour Support Plan",
  MMP: "Mealtime Management Plan",
  HEALTH_PLAN: "Health Management Plan",
  COMMUNICATION_PLAN: "Communication Plan",
  RISK_ASSESSMENT: "Risk Assessment",
  EMERGENCY_PLAN: "Emergency Plan",
  // Delivery of Supports
  ROSTER: "Roster / Shift Allocation",
  SHIFT_NOTES: "Shift Notes / Case Notes",
  DAILY_LOG: "Daily Support Log",
  PROGRESS_NOTES: "Progress Notes",
  ACTIVITY_RECORD: "Activity Record",
  // Staff & Personnel
  QUALIFICATION: "Qualification / Credential",
  WWCC: "WWCC / Police Check / Screening",
  TRAINING_RECORD: "Training Record",
  SUPERVISION_RECORD: "Supervision Record",
  // Medication & Health
  MEDICATION_PLAN: "Medication Management Plan",
  MAR: "Medication Administration Record",
  PRN_LOG: "PRN Protocol / Log",
  // Incidents & Complaints
  INCIDENT_REPORT: "Incident Report",
  COMPLAINT_RECORD: "Complaint Record",
  RP_RECORD: "Restrictive Practice Record",
  // Funding & Claims
  SERVICE_BOOKING: "Service Booking / Funding",
  INVOICE_CLAIM: "Invoice / Claim Record",
  // Governance
  POLICY: "Policy Document",
  PROCEDURE: "Procedure",
  // Other
  REVIEW_RECORD: "Review / Monitoring Record",
  OTHER: "Other",
  // Legacy types (backward compatibility)
  CASE_NOTE: "Case Note",
  MEDICATION_RECORD: "Medication Record",
  CLEARANCE: "Clearance",
  SUPERVISION: "Supervision",
  ROSTER_TIMESHEET: "Roster/Timesheet",
  INCIDENT_RECORD: "Incident Record",
};

export default function EvidenceLockerPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [newRequestForm, setNewRequestForm] = useState({
    evidenceType: "" as EvidenceType | "",
    requestNote: "",
    dueDate: "",
  });

  const handleCopyLink = (e: React.MouseEvent, request: EvidenceRequest) => {
    e.stopPropagation();
    if (!request.publicToken) {
      toast({
        title: "Link not available",
        description: "This evidence request does not have a shareable link",
        variant: "destructive",
      });
      return;
    }
    const uploadUrl = `${window.location.origin}/upload/${request.publicToken}`;
    navigator.clipboard.writeText(uploadUrl);
    setCopiedId(request.id);
    toast({
      title: "Link copied",
      description: "The shareable upload link has been copied to your clipboard",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const { data: requests, isLoading } = useQuery({
    queryKey: ["evidenceRequests", statusFilter],
    queryFn: () => getEvidenceRequests({
      status: statusFilter !== "all" ? statusFilter as EvidenceStatus : undefined,
    }),
  });

  const { data: users } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null }) => 
      createStandaloneEvidenceRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
      setShowNewRequestDialog(false);
      setNewRequestForm({ evidenceType: "", requestNote: "", dueDate: "" });
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unknown";
    const foundUser = users?.find(u => u.id === userId);
    return foundUser?.fullName || "Unknown";
  };

  const canCreateRequest = ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "");

  const handleCreateRequest = () => {
    if (!newRequestForm.evidenceType || !newRequestForm.requestNote) return;
    createRequestMutation.mutate({
      evidenceType: newRequestForm.evidenceType as EvidenceType,
      requestNote: newRequestForm.requestNote,
      dueDate: newRequestForm.dueDate || null,
    });
  };

  const pendingCount = requests?.filter(r => r.status === "REQUESTED" || r.status === "SUBMITTED").length || 0;
  const acceptedCount = requests?.filter(r => r.status === "ACCEPTED").length || 0;
  const rejectedCount = requests?.filter(r => r.status === "REJECTED").length || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Evidence Locker</h1>
          <p className="text-muted-foreground">Track and manage evidence submissions</p>
        </div>
        {canCreateRequest && (
          <Button onClick={() => setShowNewRequestDialog(true)} data-testid="button-new-request">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{acceptedCount}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="REQUESTED">Requested</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : requests?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No evidence requests</h3>
            <p className="text-muted-foreground text-sm">
              Evidence requests will appear here when requested for audit findings
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests?.map(request => {
            const statusInfo = statusConfig[request.status];
            return (
              <Card 
                key={request.id} 
                className="hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/evidence/${request.id}`)}
                data-testid={`card-evidence-request-${request.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={statusInfo.color} data-testid={`badge-status-${request.id}`}>
                          <span className="mr-1">{statusInfo.icon}</span>
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline">
                          {evidenceTypeLabels[request.evidenceType] || request.evidenceType}
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-2">{request.requestNote}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => handleCopyLink(e, request)}
                        title="Copy shareable upload link"
                        data-testid={`button-copy-link-${request.id}`}
                      >
                        {copiedId === request.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Link className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" data-testid={`button-view-${request.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {request.indicator && (
                    <div className="mb-3 p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Indicator:</span>
                        <span className="font-medium">{request.indicator.indicatorText}</span>
                      </div>
                      {request.audit && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Audit:</span>
                          <span>{request.audit.title}</span>
                          {request.audit.serviceContextLabel && (
                            <>
                              <span>|</span>
                              <span>{request.audit.serviceContextLabel}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>Requested by:</span>
                      <span className="font-medium">{getUserName(request.requestedByCompanyUserId)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Created:</span>
                      <span className="font-medium">{format(new Date(request.createdAt), "dd MMM yyyy")}</span>
                    </div>
                    {request.dueDate && (
                      <div className="flex items-center gap-1">
                        <span>Due:</span>
                        <span className="font-medium">{format(new Date(request.dueDate), "dd MMM yyyy")}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Evidence Request</DialogTitle>
            <DialogDescription>
              Request a document for compliance or routine collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Evidence Type *</Label>
              <Select 
                value={newRequestForm.evidenceType} 
                onValueChange={(v) => setNewRequestForm(prev => ({ ...prev, evidenceType: v as EvidenceType }))}
              >
                <SelectTrigger data-testid="select-evidence-type">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  {evidenceTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Request Note *</Label>
              <Textarea
                value={newRequestForm.requestNote}
                onChange={(e) => setNewRequestForm(prev => ({ ...prev, requestNote: e.target.value }))}
                placeholder="Describe what document is needed..."
                data-testid="input-request-note"
              />
            </div>

            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={newRequestForm.dueDate}
                onChange={(e) => setNewRequestForm(prev => ({ ...prev, dueDate: e.target.value }))}
                data-testid="input-due-date"
              />
            </div>
          </div>
          {createRequestMutation.error && (
            <p className="text-sm text-destructive">{(createRequestMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRequestDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateRequest}
              disabled={!newRequestForm.evidenceType || !newRequestForm.requestNote || createRequestMutation.isPending}
              data-testid="button-create-request"
            >
              {createRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
