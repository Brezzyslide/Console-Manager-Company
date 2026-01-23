import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link, Copy, Check, Shield, Clock, AlertTriangle, Trash2, ExternalLink, FileUp, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import {
  createAuditEvidencePortal,
  getAuditEvidencePortal,
  revokeAuditEvidencePortal,
  getGeneralEvidenceSubmissions,
  reviewGeneralEvidenceSubmission,
  createAuditEvidenceRequest,
  getAuditEvidenceRequests,
  type AuditEvidencePortal,
  type GeneralEvidenceSubmission,
  type EvidenceType,
} from "@/lib/company-api";
import { useCompanyAuth } from "@/hooks/use-company-auth";

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure Document" },
  { value: "TRAINING_RECORD", label: "Training Record" },
  { value: "QUALIFICATION", label: "Staff Qualification" },
  { value: "WWCC", label: "Working with Children Check" },
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "CARE_PLAN", label: "Care Plan" },
  { value: "BSP", label: "Behavior Support Plan" },
  { value: "PROGRESS_NOTES", label: "Progress Notes" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  auditId: string;
}

const generalEvidenceStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "Pending Review", color: "bg-yellow-500" },
  ACCEPTED: { label: "Accepted", color: "bg-green-500" },
  REJECTED: { label: "Rejected", color: "bg-red-500" },
};

export default function AuditEvidencePortalManager({ auditId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const { toast } = useToast();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("14");
  const [copied, setCopied] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<GeneralEvidenceSubmission | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"ACCEPTED" | "REJECTED">("ACCEPTED");
  const [reviewNote, setReviewNote] = useState("");
  const [showAddRequestDialog, setShowAddRequestDialog] = useState(false);
  const [newRequestForm, setNewRequestForm] = useState({
    evidenceType: "",
    requestNote: "",
    dueDate: "",
  });

  const { data: portalData, isLoading: portalLoading } = useQuery({
    queryKey: ["auditEvidencePortal", auditId],
    queryFn: () => getAuditEvidencePortal(auditId),
    enabled: !!auditId,
  });

  const { data: generalEvidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ["generalEvidence", auditId],
    queryFn: () => getGeneralEvidenceSubmissions(auditId),
    enabled: !!auditId,
  });

  const { data: evidenceRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["auditEvidenceRequests", auditId],
    queryFn: () => getAuditEvidenceRequests(auditId),
    enabled: !!auditId,
  });

  const addRequestMutation = useMutation({
    mutationFn: (data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null }) =>
      createAuditEvidenceRequest(auditId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditEvidenceRequests", auditId] });
      setShowAddRequestDialog(false);
      setNewRequestForm({ evidenceType: "", requestNote: "", dueDate: "" });
      toast({
        title: "Evidence request added",
        description: "The request will now appear in the portal",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { password: string; expiresInDays?: number }) =>
      createAuditEvidencePortal(auditId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditEvidencePortal", auditId] });
      setShowCreateDialog(false);
      setPassword("");
      toast({
        title: "Portal created",
        description: "The bulk upload portal link is ready to share",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (portalId: string) => revokeAuditEvidencePortal(auditId, portalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditEvidencePortal", auditId] });
      setShowRevokeDialog(false);
      toast({
        title: "Portal revoked",
        description: "The bulk upload portal has been deactivated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { submissionId: string; status: "ACCEPTED" | "REJECTED"; reviewNote?: string }) =>
      reviewGeneralEvidenceSubmission(auditId, data.submissionId, { status: data.status, reviewNote: data.reviewNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generalEvidence", auditId] });
      setShowReviewDialog(false);
      setSelectedSubmission(null);
      setReviewNote("");
      toast({
        title: "Evidence reviewed",
        description: `The submission has been ${reviewStatus.toLowerCase()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to review",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const portal = portalData?.portal;
  const canManagePortal = ["CompanyAdmin", "Auditor"].includes(user?.role || "");
  const canReview = ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "");

  const handleCopyLink = () => {
    if (!portal) return;
    const fullUrl = `${window.location.origin}${portal.portalUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast({ title: "Link copied", description: "Portal link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreatePortal = () => {
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      password,
      expiresInDays: expiresInDays !== "never" ? parseInt(expiresInDays) : undefined,
    });
  };

  const handleReviewSubmission = (submission: GeneralEvidenceSubmission) => {
    setSelectedSubmission(submission);
    setReviewStatus("ACCEPTED");
    setReviewNote("");
    setShowReviewDialog(true);
  };

  const handleConfirmReview = () => {
    if (!selectedSubmission) return;
    if (reviewStatus === "REJECTED" && (!reviewNote || reviewNote.length < 10)) {
      toast({ title: "Reason required", description: "Please provide a reason of at least 10 characters for rejection", variant: "destructive" });
      return;
    }
    reviewMutation.mutate({
      submissionId: selectedSubmission.id,
      status: reviewStatus,
      reviewNote: reviewNote || undefined,
    });
  };

  const pendingSubmissions = generalEvidence?.filter(s => s.status === "PENDING_REVIEW") || [];

  if (portalLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bulk Evidence Upload Portal
          </CardTitle>
          <CardDescription>
            Share a password-protected link with external parties to upload evidence directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portal ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">Active</Badge>
                {portal.expiresAt && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Expires {format(new Date(portal.expiresAt), "PPP")}
                  </span>
                )}
                {portal.lastAccessedAt && (
                  <span className="text-sm text-muted-foreground">
                    Last accessed {format(new Date(portal.lastAccessedAt), "PPP p")}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Link className="h-4 w-4 text-muted-foreground" />
                <code className="flex-1 text-sm truncate">
                  {window.location.origin}{portal.portalUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  data-testid="button-copy-portal-link"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(portal.portalUrl, "_blank")}
                  data-testid="button-open-portal"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {canManagePortal && (
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRequestDialog(true)}
                    data-testid="button-add-evidence-request"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Evidence Request
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRevokeDialog(true)}
                    data-testid="button-revoke-portal"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revoke Portal
                  </Button>
                </div>
              )}

              {evidenceRequests.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Evidence Requests in Portal ({evidenceRequests.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {evidenceRequests.map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div>
                          <span className="font-medium">{req.evidenceType?.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground ml-2">- {req.requestNote?.slice(0, 50)}{req.requestNote?.length > 50 ? "..." : ""}</span>
                        </div>
                        <Badge variant={req.status === "SUBMITTED" ? "default" : req.status === "APPROVED" ? "secondary" : "outline"} className="text-xs">
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 space-y-4">
              <p className="text-muted-foreground">No active upload portal for this audit</p>
              {canManagePortal && (
                <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-portal">
                  <Link className="h-4 w-4 mr-2" />
                  Create Upload Portal
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              Unsolicited Evidence Submissions
              <Badge variant="secondary">{pendingSubmissions.length} pending</Badge>
            </CardTitle>
            <CardDescription>
              General evidence uploaded by external parties that needs review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingSubmissions.map(submission => {
                const statusInfo = generalEvidenceStatusConfig[submission.status];
                return (
                  <div
                    key={submission.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        <span className="text-sm font-medium">{submission.fileName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{submission.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded by {submission.uploaderName} ({submission.uploaderEmail}) on{" "}
                        {format(new Date(submission.createdAt), "PPP")}
                      </p>
                    </div>
                    {canReview && submission.status === "PENDING_REVIEW" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewSubmission(submission)}
                        data-testid={`button-review-submission-${submission.id}`}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Bulk Upload Portal</DialogTitle>
            <DialogDescription>
              Create a password-protected link that external parties can use to upload evidence for this audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                placeholder="Create a password for the portal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-portal-password"
              />
              <p className="text-xs text-muted-foreground">
                Share this password securely with the external party
              </p>
            </div>
            <div className="space-y-2">
              <Label>Expires In</Label>
              <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                <SelectTrigger data-testid="select-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never expires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {createMutation.error && (
            <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreatePortal}
              disabled={password.length < 6 || createMutation.isPending}
              data-testid="button-confirm-create-portal"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Portal</DialogTitle>
            <DialogDescription>
              This will immediately deactivate the portal link. External parties will no longer be able to upload evidence through it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => portal && revokeMutation.mutate(portal.id)}
              disabled={revokeMutation.isPending}
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Revoke Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Evidence Submission</DialogTitle>
            <DialogDescription>
              Accept or reject this unsolicited evidence submission from {selectedSubmission?.uploaderName}.
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <p className="font-medium">{selectedSubmission.fileName}</p>
                <p className="text-sm text-muted-foreground">{selectedSubmission.description}</p>
              </div>
              <div className="space-y-2">
                <Label>Decision</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as "ACCEPTED" | "REJECTED")}>
                  <SelectTrigger data-testid="select-review-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCEPTED">Accept</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reviewStatus === "REJECTED" && (
                <div className="space-y-2">
                  <Label>Reason for Rejection <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Minimum 10 characters required"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    data-testid="input-review-note"
                  />
                </div>
              )}
              {reviewStatus === "ACCEPTED" && (
                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Input
                    placeholder="Optional note..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    data-testid="input-review-note"
                  />
                </div>
              )}
            </div>
          )}
          {reviewMutation.error && (
            <p className="text-sm text-destructive">{(reviewMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmReview}
              disabled={reviewMutation.isPending || (reviewStatus === "REJECTED" && reviewNote.length < 10)}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRequestDialog} onOpenChange={setShowAddRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Evidence Request</DialogTitle>
            <DialogDescription>
              Add a new evidence request to this audit. It will automatically appear in the portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Evidence Type *</Label>
              <Select 
                value={newRequestForm.evidenceType} 
                onValueChange={(v) => setNewRequestForm({...newRequestForm, evidenceType: v})}
              >
                <SelectTrigger data-testid="select-request-evidence-type">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Request Note *</Label>
              <Textarea
                placeholder="Describe what evidence is needed..."
                value={newRequestForm.requestNote}
                onChange={(e) => setNewRequestForm({...newRequestForm, requestNote: e.target.value})}
                data-testid="input-request-note"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={newRequestForm.dueDate}
                onChange={(e) => setNewRequestForm({...newRequestForm, dueDate: e.target.value})}
                data-testid="input-request-due-date"
              />
            </div>
          </div>
          {addRequestMutation.error && (
            <p className="text-sm text-destructive">{(addRequestMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRequestDialog(false)}>Cancel</Button>
            <Button
              onClick={() => addRequestMutation.mutate({
                evidenceType: newRequestForm.evidenceType as EvidenceType,
                requestNote: newRequestForm.requestNote,
                dueDate: newRequestForm.dueDate || null,
              })}
              disabled={!newRequestForm.evidenceType || !newRequestForm.requestNote || addRequestMutation.isPending}
              data-testid="button-submit-request"
            >
              {addRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
