import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, FileText, Link as LinkIcon, Upload, CheckCircle, XCircle, Clock, Eye, AlertCircle, Download, ClipboardList } from "lucide-react";
import { 
  getEvidenceRequest, 
  submitEvidence, 
  startEvidenceReview,
  reviewEvidence, 
  getCompanyUsers,
  type EvidenceStatus 
} from "@/lib/company-api";
import { format } from "date-fns";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import DocumentReviewChecklist from "@/components/DocumentReviewChecklist";

const statusConfig: Record<EvidenceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED: { label: "Requested", color: "bg-blue-500", icon: <Clock className="h-4 w-4" /> },
  SUBMITTED: { label: "Submitted", color: "bg-yellow-500", icon: <AlertCircle className="h-4 w-4" /> },
  UNDER_REVIEW: { label: "Under Review", color: "bg-purple-500", icon: <Eye className="h-4 w-4" /> },
  ACCEPTED: { label: "Accepted", color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: <XCircle className="h-4 w-4" /> },
};

const evidenceTypeLabels: Record<string, string> = {
  POLICY: "Policy Document",
  PROCEDURE: "Procedure",
  TRAINING_RECORD: "Training Record",
  INCIDENT_REPORT: "Incident Report",
  CASE_NOTE: "Case Note",
  MEDICATION_RECORD: "Medication Record",
  BSP: "Behaviour Support Plan",
  RISK_ASSESSMENT: "Risk Assessment",
  ROSTER: "Roster/Schedule",
  OTHER: "Other",
};

const documentTypeLabels: Record<string, string> = {
  POLICY: "Policy",
  PROCEDURE: "Procedure",
  TRAINING_RECORD: "Training Record",
  RISK_ASSESSMENT: "Risk Assessment",
  CARE_PLAN: "Care Plan",
  QUALIFICATION: "Qualification",
  WWCC: "WWCC/Police Check",
  SERVICE_AGREEMENT: "Service Agreement",
  INCIDENT_REPORT: "Incident Report",
  COMPLAINT_RECORD: "Complaint Record",
  CONSENT_FORM: "Consent Form",
  OTHER: "Other",
};

export default function EvidenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedReviewItemId, setSelectedReviewItemId] = useState<string | null>(null);
  
  const [submitForm, setSubmitForm] = useState({
    storageKind: "LINK" as "UPLOAD" | "LINK",
    fileName: "",
    externalUrl: "",
    note: "",
  });
  
  const [reviewForm, setReviewForm] = useState({
    decision: "ACCEPTED" as "ACCEPTED" | "REJECTED",
    reviewNote: "",
  });

  const { data: evidenceRequest, isLoading } = useQuery({
    queryKey: ["evidenceRequest", id],
    queryFn: () => getEvidenceRequest(id!),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
  });

  const submitMutation = useMutation({
    mutationFn: (data: Parameters<typeof submitEvidence>[1]) => submitEvidence(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
      setShowSubmitDialog(false);
      setSubmitForm({ storageKind: "LINK", fileName: "", externalUrl: "", note: "" });
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: () => startEvidenceReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: Parameters<typeof reviewEvidence>[1]) => reviewEvidence(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequest", id] });
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      setShowReviewDialog(false);
    },
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unknown";
    const foundUser = users?.find(u => u.id === userId);
    return foundUser?.fullName || "Unknown";
  };

  const canSubmit = evidenceRequest?.status === "REQUESTED" || evidenceRequest?.status === "REJECTED";
  const canStartReview = evidenceRequest?.status === "SUBMITTED" && 
    ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "");
  const canMakeDecision = evidenceRequest?.status === "UNDER_REVIEW" && 
    ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "");

  const handleSubmit = () => {
    if (submitForm.storageKind === "LINK") {
      submitMutation.mutate({
        storageKind: "LINK",
        fileName: submitForm.fileName,
        externalUrl: submitForm.externalUrl,
        note: submitForm.note || undefined,
      });
    }
  };

  const handleReview = () => {
    reviewMutation.mutate({
      decision: reviewForm.decision,
      reviewNote: reviewForm.reviewNote || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!evidenceRequest) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-muted-foreground">Evidence request not found</p>
      </div>
    );
  }

  const statusInfo = statusConfig[evidenceRequest.status];

  return (
    <div className="container mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate("/evidence")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Evidence Locker
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusInfo.color}>
                      <span className="mr-1">{statusInfo.icon}</span>
                      {statusInfo.label}
                    </Badge>
                    <Badge variant="outline">
                      {evidenceTypeLabels[evidenceRequest.evidenceType] || evidenceRequest.evidenceType}
                    </Badge>
                  </div>
                  <CardTitle data-testid="text-request-note">{evidenceRequest.requestNote}</CardTitle>
                  <CardDescription className="mt-2">
                    Created {format(new Date(evidenceRequest.createdAt), "dd MMM yyyy 'at' HH:mm")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requested by:</span>
                  <p className="font-medium">{getUserName(evidenceRequest.requestedByCompanyUserId)}</p>
                </div>
                {evidenceRequest.dueDate && (
                  <div>
                    <span className="text-muted-foreground">Due date:</span>
                    <p className="font-medium">{format(new Date(evidenceRequest.dueDate), "dd MMM yyyy")}</p>
                  </div>
                )}
                {evidenceRequest.reviewedAt && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Reviewed by:</span>
                      <p className="font-medium">{getUserName(evidenceRequest.reviewedByCompanyUserId)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reviewed at:</span>
                      <p className="font-medium">{format(new Date(evidenceRequest.reviewedAt), "dd MMM yyyy 'at' HH:mm")}</p>
                    </div>
                  </>
                )}
              </div>
              {evidenceRequest.reviewNote && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Review note:</span>
                  <p className="text-sm mt-1">{evidenceRequest.reviewNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Submitted Evidence</CardTitle>
                {canSubmit && (
                  <Button onClick={() => setShowSubmitDialog(true)} data-testid="button-submit-evidence">
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Evidence
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {evidenceRequest.items?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No evidence submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evidenceRequest.items?.map(item => (
                    <div 
                      key={item.id} 
                      className="border rounded-md overflow-hidden"
                      data-testid={`evidence-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between p-3 bg-muted/30">
                        <div className="flex items-center gap-3">
                          {item.storageKind === "LINK" ? (
                            <LinkIcon className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Upload className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.fileName}</p>
                              {item.documentType && (
                                <Badge variant="outline" className="text-xs">
                                  {documentTypeLabels[item.documentType] || item.documentType}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {item.uploadedByCompanyUserId 
                                ? `Uploaded by ${getUserName(item.uploadedByCompanyUserId)}`
                                : item.externalUploaderName 
                                  ? `Submitted by ${item.externalUploaderName} (${item.externalUploaderEmail})`
                                  : "External upload"
                              } on {format(new Date(item.createdAt), "dd MMM yyyy")}
                            </p>
                            {item.note && (
                              <p className="text-sm text-muted-foreground mt-1">Note: {item.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canMakeDecision && item.documentType && (
                            <Button 
                              variant={selectedReviewItemId === item.id ? "secondary" : "outline"} 
                              size="sm"
                              onClick={() => setSelectedReviewItemId(selectedReviewItemId === item.id ? null : item.id)}
                              data-testid={`button-review-checklist-${item.id}`}
                            >
                              <ClipboardList className="h-4 w-4 mr-1" />
                              {selectedReviewItemId === item.id ? "Hide Checklist" : "Review Checklist"}
                            </Button>
                          )}
                          {item.storageKind === "LINK" && item.externalUrl && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.externalUrl} target="_blank" rel="noopener noreferrer">
                                <LinkIcon className="h-4 w-4 mr-1" />
                                Open Link
                              </a>
                            </Button>
                          )}
                          {item.storageKind === "UPLOAD" && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                              data-testid={`button-download-${item.id}`}
                            >
                              <a href={`/api/company/evidence/items/${item.id}/download`}>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      {selectedReviewItemId === item.id && item.documentType && (
                        <div className="p-4 border-t">
                          <DocumentReviewChecklist
                            evidenceItemId={item.id}
                            evidenceRequestId={evidenceRequest.id}
                            documentType={item.documentType}
                            auditId={evidenceRequest.auditId || undefined}
                            onReviewComplete={() => {
                              queryClient.invalidateQueries({ queryKey: ["evidenceRequest", id] });
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {canStartReview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Start Review</CardTitle>
                <CardDescription>Begin reviewing the submitted evidence</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => startReviewMutation.mutate()} 
                  className="w-full"
                  disabled={startReviewMutation.isPending}
                  data-testid="button-start-review"
                >
                  {startReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Start Review
                </Button>
                {startReviewMutation.error && (
                  <p className="text-sm text-destructive mt-2">{(startReviewMutation.error as Error).message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {canMakeDecision && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Make Decision</CardTitle>
                <CardDescription>Accept or reject the submitted evidence</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setShowReviewDialog(true)} 
                  className="w-full"
                  data-testid="button-review-evidence"
                >
                  Accept or Reject Evidence
                </Button>
              </CardContent>
            </Card>
          )}

          {evidenceRequest.finding && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Finding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Severity:</span>
                    <Badge variant={evidenceRequest.finding.severity === "MAJOR_NC" ? "destructive" : "secondary"} className="ml-2">
                      {evidenceRequest.finding.severity === "MAJOR_NC" ? "Major NC" : "Minor NC"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Finding:</span>
                    <p className="mt-1">{evidenceRequest.finding.findingText}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => navigate(`/findings`)}
                    data-testid="button-view-finding"
                  >
                    View in Findings Register
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Evidence</DialogTitle>
            <DialogDescription>
              Provide a link to the evidence document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">Document Name *</Label>
              <Input
                id="fileName"
                value={submitForm.fileName}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, fileName: e.target.value }))}
                placeholder="e.g., Medication Policy v2.1"
                data-testid="input-file-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="externalUrl">Document URL *</Label>
              <Input
                id="externalUrl"
                value={submitForm.externalUrl}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, externalUrl: e.target.value }))}
                placeholder="https://..."
                data-testid="input-external-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                value={submitForm.note}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Additional context about this evidence..."
                data-testid="input-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!submitForm.fileName || !submitForm.externalUrl || submitMutation.isPending}
              data-testid="button-confirm-submit"
            >
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Evidence</DialogTitle>
            <DialogDescription>
              Accept or reject the submitted evidence. Accepting will close the related finding.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Decision</Label>
              <RadioGroup 
                value={reviewForm.decision} 
                onValueChange={(v) => setReviewForm(prev => ({ ...prev, decision: v as "ACCEPTED" | "REJECTED" }))}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ACCEPTED" id="accept" data-testid="radio-accept" />
                  <Label htmlFor="accept" className="flex items-center gap-2 cursor-pointer">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Accept - Evidence is satisfactory
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="REJECTED" id="reject" data-testid="radio-reject" />
                  <Label htmlFor="reject" className="flex items-center gap-2 cursor-pointer">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Reject - Request re-submission
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Review Note</Label>
              <Textarea
                id="reviewNote"
                value={reviewForm.reviewNote}
                onChange={(e) => setReviewForm(prev => ({ ...prev, reviewNote: e.target.value }))}
                placeholder="Provide feedback on the evidence..."
                data-testid="input-review-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              variant={reviewForm.decision === "REJECTED" ? "destructive" : "default"}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewForm.decision === "ACCEPTED" ? "Accept Evidence" : "Reject Evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
