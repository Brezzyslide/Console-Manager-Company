import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  FileText,
  MessageSquare,
  Send,
  X,
  ExternalLink,
  Loader2,
  History,
  ShieldCheck,
  Link2,
  Plus,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { 
  getFindingDetail, 
  addFindingComment, 
  closeFinding,
  updateFinding,
  createFindingEvidenceRequest,
  type FindingDetail,
  type FindingActivity,
  type EvidenceType
} from "@/lib/company-api";
import { useCompanyAuth } from "@/hooks/use-company-auth";

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "CLIENT_PROFILE", label: "Client Profile / Intake Record" },
  { value: "NDIS_PLAN", label: "NDIS Plan" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "GUARDIAN_DOCUMENTATION", label: "Guardian / Nominee Documentation" },
  { value: "CARE_PLAN", label: "Care / Support Plan" },
  { value: "BSP", label: "Behaviour Support Plan (BSP)" },
  { value: "MMP", label: "Mealtime Management Plan (MMP)" },
  { value: "HEALTH_PLAN", label: "Health Management Plan" },
  { value: "COMMUNICATION_PLAN", label: "Communication Plan" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "EMERGENCY_PLAN", label: "Emergency / Evacuation Plan" },
  { value: "ROSTER", label: "Roster / Shift Allocation" },
  { value: "SHIFT_NOTES", label: "Shift Notes / Case Notes" },
  { value: "DAILY_LOG", label: "Daily Support Log" },
  { value: "PROGRESS_NOTES", label: "Progress Notes" },
  { value: "ACTIVITY_RECORD", label: "Activity / Community Access Record" },
  { value: "QUALIFICATION", label: "Qualification / Credential" },
  { value: "WWCC", label: "WWCC / Police Check / NDIS Screening" },
  { value: "TRAINING_RECORD", label: "Training Record / Certificate" },
  { value: "SUPERVISION_RECORD", label: "Supervision Record" },
  { value: "MEDICATION_PLAN", label: "Medication Management Plan" },
  { value: "MAR", label: "Medication Administration Record (MAR)" },
  { value: "PRN_LOG", label: "PRN Protocol / Usage Log" },
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "COMPLAINT_RECORD", label: "Complaint Record" },
  { value: "RP_RECORD", label: "Restrictive Practice Record" },
  { value: "SERVICE_BOOKING", label: "Service Booking / Funding Allocation" },
  { value: "INVOICE_CLAIM", label: "Invoice / Claim Record" },
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure Document" },
  { value: "REVIEW_RECORD", label: "Review / Monitoring Record" },
  { value: "OTHER", label: "Other Document" },
];

const activityIcons: Record<FindingActivity["activityType"], any> = {
  CREATED: AlertCircle,
  STATUS_CHANGED: History,
  OWNER_ASSIGNED: User,
  DUE_DATE_SET: Calendar,
  COMMENT_ADDED: MessageSquare,
  EVIDENCE_REQUESTED: FileText,
  EVIDENCE_SUBMITTED: Send,
  EVIDENCE_REVIEWED: ShieldCheck,
  CLOSURE_INITIATED: Clock,
  CLOSED: CheckCircle2,
  REOPENED: AlertTriangle,
};

const activityLabels: Record<FindingActivity["activityType"], string> = {
  CREATED: "Finding Created",
  STATUS_CHANGED: "Status Changed",
  OWNER_ASSIGNED: "Owner Assigned",
  DUE_DATE_SET: "Due Date Set",
  COMMENT_ADDED: "Comment Added",
  EVIDENCE_REQUESTED: "Evidence Requested",
  EVIDENCE_SUBMITTED: "Evidence Submitted",
  EVIDENCE_REVIEWED: "Evidence Reviewed",
  CLOSURE_INITIATED: "Closure Initiated",
  CLOSED: "Finding Closed",
  REOPENED: "Finding Reopened",
};

const statusColors: Record<string, string> = {
  OPEN: "bg-red-500",
  UNDER_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useCompanyAuth();
  
  const [newComment, setNewComment] = useState("");
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closureNote, setClosureNote] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [upgradeToConformity, setUpgradeToConformity] = useState(false);
  const [showEvidenceRequestDialog, setShowEvidenceRequestDialog] = useState(false);
  const [evidenceType, setEvidenceType] = useState<EvidenceType | "">("");
  const [evidenceRequestNote, setEvidenceRequestNote] = useState("");
  const [evidenceDueDate, setEvidenceDueDate] = useState("");
  const [createdPublicLink, setCreatedPublicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: finding, isLoading } = useQuery({
    queryKey: ["findingDetail", id],
    queryFn: () => getFindingDetail(id!),
    enabled: !!id,
  });

  const addCommentMutation = useMutation({
    mutationFn: (comment: string) => addFindingComment(id!, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findingDetail", id] });
      setNewComment("");
      toast({ title: "Comment added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: { closureNote: string; evidenceItemIds?: string[]; upgradeToConformity?: boolean }) => closeFinding(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findingDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["auditOutcomes"] });
      setShowCloseDialog(false);
      setClosureNote("");
      setSelectedEvidenceIds([]);
      setUpgradeToConformity(false);
      toast({ title: "Finding closed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to close finding", description: error.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: "OPEN" | "UNDER_REVIEW" | "CLOSED") => updateFinding(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findingDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      toast({ title: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const evidenceRequestMutation = useMutation({
    mutationFn: (data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null }) => 
      createFindingEvidenceRequest(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["findingDetail", id] });
      const publicLink = `${window.location.origin}/upload/${data.publicToken}`;
      setCreatedPublicLink(publicLink);
      toast({ title: "Evidence request created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create evidence request", description: error.message, variant: "destructive" });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleClose = () => {
    if (closureNote.trim().length < 10) {
      toast({ title: "Closure note too short", description: "Please provide at least 10 characters", variant: "destructive" });
      return;
    }
    closeMutation.mutate({ 
      closureNote: closureNote.trim(), 
      evidenceItemIds: selectedEvidenceIds.length > 0 ? selectedEvidenceIds : undefined,
      upgradeToConformity: upgradeToConformity || undefined,
    });
  };

  const handleCreateEvidenceRequest = () => {
    if (!evidenceType || !evidenceRequestNote.trim()) {
      toast({ title: "Missing information", description: "Please select evidence type and add a request note", variant: "destructive" });
      return;
    }
    evidenceRequestMutation.mutate({
      evidenceType: evidenceType as EvidenceType,
      requestNote: evidenceRequestNote.trim(),
      dueDate: evidenceDueDate || null,
    });
  };

  const handleCopyLink = () => {
    if (createdPublicLink) {
      navigator.clipboard.writeText(createdPublicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const closeEvidenceDialog = () => {
    setShowEvidenceRequestDialog(false);
    setEvidenceType("");
    setEvidenceRequestNote("");
    setEvidenceDueDate("");
    setCreatedPublicLink(null);
    setCopied(false);
  };

  const allEvidenceItems = finding?.evidenceRequests?.flatMap(req => req.items) || [];
  const canClose = ["CompanyAdmin", "Reviewer"].includes(user?.role || "");
  const canRequestEvidence = ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "");
  const hasExistingRequest = finding?.evidenceRequests && finding.evidenceRequests.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Finding not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/findings")} data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Finding Detail</h1>
            <Badge variant={finding.severity === "MAJOR_NC" ? "destructive" : "default"} className="text-sm">
              {finding.severity === "MAJOR_NC" ? "Major NC" : "Minor NC"}
            </Badge>
            <Badge className={`${statusColors[finding.status]} text-white`}>
              {finding.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{finding.audit?.title}</p>
        </div>
        {finding.status !== "CLOSED" && canClose && (
          <Button onClick={() => setShowCloseDialog(true)} data-testid="button-close-finding">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Close Finding
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Finding Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Indicator</label>
                <p className="mt-1">{finding.indicator?.indicatorText}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Finding Text</label>
                <p className="mt-1">{finding.findingText}</p>
              </div>
              {finding.closureNote && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Closure Note</label>
                  <p className="mt-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                    {finding.closureNote}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{format(new Date(finding.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{finding.owner?.fullName || "Unassigned"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <p className="text-sm">{finding.dueDate ? format(new Date(finding.dueDate), "MMM d, yyyy") : "Not set"}</p>
                </div>
                {finding.closedAt && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Closed</label>
                    <p className="text-sm">{format(new Date(finding.closedAt), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Corrective Action Timeline
              </CardTitle>
              <CardDescription>Complete journey from identification to resolution</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {finding.activities.map((activity, index) => {
                      const Icon = activityIcons[activity.activityType] || MessageSquare;
                      const isFirst = index === 0;
                      const isLast = index === finding.activities.length - 1;
                      
                      return (
                        <div key={activity.id} className="relative pl-10" data-testid={`activity-${activity.id}`}>
                          <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${
                            activity.activityType === "CLOSED" ? "bg-green-500" :
                            activity.activityType === "CREATED" ? "bg-red-500" :
                            "bg-primary"
                          }`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <div className="bg-card border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{activityLabels[activity.activityType]}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(activity.createdAt), "MMM d, yyyy h:mm a")}
                              </span>
                            </div>
                            {activity.performedByUser && (
                              <p className="text-xs text-muted-foreground mt-1">
                                by {activity.performedByUser.fullName}
                              </p>
                            )}
                            {activity.previousValue && activity.newValue && (
                              <p className="text-sm mt-2">
                                <span className="text-muted-foreground">{activity.previousValue}</span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">{activity.newValue}</span>
                              </p>
                            )}
                            {activity.comment && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">{activity.comment}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Add Comment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Textarea
                  placeholder="Add a comment to the corrective action log..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="input-new-comment"
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  data-testid="button-add-comment"
                >
                  {addCommentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Add Comment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {finding.status !== "CLOSED" && (
                <>
                  {finding.status === "OPEN" && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => statusMutation.mutate("UNDER_REVIEW")}
                      disabled={statusMutation.isPending}
                      data-testid="button-status-under-review"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Move to Under Review
                    </Button>
                  )}
                  {finding.status === "UNDER_REVIEW" && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => statusMutation.mutate("OPEN")}
                      disabled={statusMutation.isPending}
                      data-testid="button-status-open"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Move Back to Open
                    </Button>
                  )}
                </>
              )}
              {finding.status === "CLOSED" && canClose && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => statusMutation.mutate("OPEN")}
                  disabled={statusMutation.isPending}
                  data-testid="button-reopen"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reopen Finding
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Evidence Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {finding.evidenceRequests.length === 0 ? (
                <div className="text-center py-4">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No evidence requests yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {finding.evidenceRequests.map(request => {
                    const evidenceLabel = EVIDENCE_TYPES.find(t => t.value === request.evidenceType)?.label || request.evidenceType;
                    return (
                      <div key={request.id} className="p-4 border rounded-lg bg-card space-y-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium leading-tight">{evidenceLabel}</span>
                            <Badge 
                              className={`shrink-0 ${
                                request.status === "ACCEPTED" ? "bg-green-500" :
                                request.status === "SUBMITTED" ? "bg-blue-500" :
                                request.status === "REJECTED" ? "bg-red-500" :
                                "bg-amber-500"
                              }`}
                            >
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{request.requestNote}</p>
                        </div>
                        
                        {request.items.length > 0 && (
                          <div className="pt-3 border-t space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {request.items.length} File{request.items.length > 1 ? 's' : ''} Submitted
                            </p>
                            <div className="space-y-1.5">
                              {request.items.map(item => (
                                <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{item.fileName}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {request.publicToken && request.status === "REQUESTED" && (
                          <div className="pt-3 border-t space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Public Upload Link
                            </p>
                            <div className="flex items-center gap-2">
                              <Input 
                                value={`${window.location.origin}/upload/${request.publicToken}`}
                                readOnly
                                className="text-sm h-9 font-mono text-xs"
                              />
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="shrink-0 h-9"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/upload/${request.publicToken}`);
                                  toast({ title: "Link copied to clipboard" });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {canRequestEvidence && !hasExistingRequest && finding.status !== "CLOSED" && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowEvidenceRequestDialog(true)}
                  data-testid="button-request-evidence"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Request Evidence
                </Button>
              )}
            </CardContent>
          </Card>

          {finding.closureEvidence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Closure Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {finding.closureEvidence.map(ce => (
                    <div key={ce.id} className="p-2 border rounded text-sm">
                      Evidence linked at closure
                      {ce.note && <p className="text-muted-foreground mt-1">{ce.note}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Close Finding</DialogTitle>
            <DialogDescription>
              Provide a closure note explaining how this non-conformance was resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Closure Note *</label>
              <Textarea
                placeholder="Describe how this finding was resolved, what corrective actions were taken, and any supporting evidence..."
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                className="min-h-[120px] mt-1"
                data-testid="input-closure-note"
              />
              <p className={`text-xs mt-1 ${closureNote.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"}`}>
                {closureNote.trim().length}/10 minimum characters
              </p>
            </div>
            {allEvidenceItems.length > 0 && (
              <div>
                <label className="text-sm font-medium">Link Supporting Evidence (Optional)</label>
                <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto border rounded p-2">
                  {allEvidenceItems.map(item => (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded">
                      <input
                        type="checkbox"
                        checked={selectedEvidenceIds.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEvidenceIds([...selectedEvidenceIds, item.id]);
                          } else {
                            setSelectedEvidenceIds(selectedEvidenceIds.filter(id => id !== item.id));
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{item.fileName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 border rounded-lg bg-muted/30">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={upgradeToConformity}
                  onChange={(e) => setUpgradeToConformity(e.target.checked)}
                  className="h-5 w-5 mt-0.5"
                  data-testid="checkbox-upgrade-conformity"
                />
                <div>
                  <span className="text-sm font-medium">Upgrade to Conformity</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Update the audit indicator rating to Conformity. The original finding record will be preserved, but the indicator will now show as conformant in the audit results.
                  </p>
                </div>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleClose} 
              disabled={closureNote.trim().length < 10 || closeMutation.isPending}
              data-testid="button-confirm-close"
            >
              {closeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Close Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvidenceRequestDialog} onOpenChange={(open) => !open && closeEvidenceDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Evidence</DialogTitle>
            <DialogDescription>
              Create a request for evidence to support corrective action for this finding. A shareable link will be generated for external uploads.
            </DialogDescription>
          </DialogHeader>
          
          {createdPublicLink ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                  <Check className="h-5 w-5" />
                  Evidence Request Created
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Share this link with the person who needs to upload the evidence:
                </p>
                <div className="flex items-center gap-2">
                  <Input 
                    value={createdPublicLink}
                    readOnly
                    className="text-sm"
                  />
                  <Button onClick={handleCopyLink} variant="outline">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeEvidenceDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Evidence Type *</Label>
                  <Select value={evidenceType} onValueChange={(v) => setEvidenceType(v as EvidenceType)}>
                    <SelectTrigger data-testid="select-evidence-type">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {EVIDENCE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Request Note *</Label>
                  <Textarea
                    placeholder="Describe what evidence is needed and why..."
                    value={evidenceRequestNote}
                    onChange={(e) => setEvidenceRequestNote(e.target.value)}
                    className="min-h-[80px]"
                    data-testid="input-evidence-request-note"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Submission Deadline (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="input-evidence-due-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {evidenceDueDate ? format(new Date(evidenceDueDate), "PPP") : <span className="text-muted-foreground">Select deadline date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={evidenceDueDate ? new Date(evidenceDueDate) : undefined}
                        onSelect={(date) => setEvidenceDueDate(date ? format(date, "yyyy-MM-dd") : "")}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeEvidenceDialog}>Cancel</Button>
                <Button 
                  onClick={handleCreateEvidenceRequest}
                  disabled={!evidenceType || !evidenceRequestNote.trim() || evidenceRequestMutation.isPending}
                  data-testid="button-create-evidence-request"
                >
                  {evidenceRequestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Create Request
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
