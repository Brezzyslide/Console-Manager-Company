import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Eye, Lock, Clock, XCircle, FileText, Plus, Send, ThumbsUp, RotateCcw } from "lucide-react";
import { AuditNavTabs } from "@/components/AuditNavTabs";
import AuditEvidencePortalManager from "@/components/AuditEvidencePortalManager";
import { getAudit, getAuditRunner, getFindings, closeAudit, getAuditEvidenceRequests, addIndicatorResponseInReview, submitAuditForReview, approveAudit, requestAuditChanges, reopenAudit, saveLeadAuditorReviewComment, type EvidenceStatus, type IndicatorRating } from "@/lib/company-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useCompanyAuth } from "@/hooks/use-company-auth";

const evidenceStatusConfig: Record<EvidenceStatus, { label: string; color: string; icon: any }> = {
  REQUESTED: { label: "Requested", color: "bg-blue-500", icon: Clock },
  SUBMITTED: { label: "Submitted", color: "bg-yellow-500", icon: AlertCircle },
  UNDER_REVIEW: { label: "Under Review", color: "bg-purple-500", icon: Eye },
  ACCEPTED: { label: "Accepted", color: "bg-green-500", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "bg-red-500", icon: XCircle },
};

const ratingIcons: Record<string, any> = {
  CONFORMITY_BEST_PRACTICE: CheckCircle2,
  CONFORMITY: CheckCircle2,
  MINOR_NC: AlertTriangle,
  MAJOR_NC: AlertCircle,
};

const ratingColors: Record<string, string> = {
  CONFORMITY_BEST_PRACTICE: "text-emerald-500",
  CONFORMITY: "text-green-500",
  MINOR_NC: "text-yellow-500",
  MAJOR_NC: "text-red-500",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

export default function AuditReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [showAddIndicatorDialog, setShowAddIndicatorDialog] = useState(false);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string | null>(null);
  const [newRating, setNewRating] = useState<IndicatorRating | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showSubmitForReviewDialog, setShowSubmitForReviewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRequestChangesDialog, setShowRequestChangesDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [leadAuditorComments, setLeadAuditorComments] = useState<Record<string, string>>({});
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => getAudit(id!),
    enabled: !!id,
  });

  const { data: runnerData, isLoading: runnerLoading } = useQuery({
    queryKey: ["auditRunner", id],
    queryFn: () => getAuditRunner(id!),
    enabled: !!id,
  });

  const { data: findings } = useQuery({
    queryKey: ["findings", id],
    queryFn: () => getFindings({ auditId: id }),
    enabled: !!id,
  });

  const { data: evidenceRequests } = useQuery({
    queryKey: ["auditEvidenceRequests", id],
    queryFn: () => getAuditEvidenceRequests(id!),
    enabled: !!id,
  });

  const closeMutation = useMutation({
    mutationFn: () => closeAudit(id!, closeReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowCloseDialog(false);
    },
  });

  const addResponseMutation = useMutation({
    mutationFn: (data: { indicatorId: string; rating: IndicatorRating; comment?: string }) => 
      addIndicatorResponseInReview(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
      queryClient.invalidateQueries({ queryKey: ["findings", id] });
      setShowAddIndicatorDialog(false);
      setSelectedIndicatorId(null);
      setNewRating(null);
      setNewComment("");
    },
  });

  const submitForReviewMutation = useMutation({
    mutationFn: () => submitAuditForReview(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowSubmitForReviewDialog(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveAudit(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowApproveDialog(false);
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: () => requestAuditChanges(id!, reviewNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowRequestChangesDialog(false);
      setReviewNotes("");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenAudit(id!, reopenReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowReopenDialog(false);
      setReopenReason("");
    },
  });

  const saveLeadAuditorCommentMutation = useMutation({
    mutationFn: ({ responseId, comment }: { responseId: string; comment: string }) => 
      saveLeadAuditorReviewComment(id!, responseId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
      setSavingCommentId(null);
    },
    onError: () => {
      setSavingCommentId(null);
    },
  });

  const handleSaveLeadAuditorComment = (responseId: string) => {
    const comment = leadAuditorComments[responseId];
    if (comment && comment.trim()) {
      setSavingCommentId(responseId);
      saveLeadAuditorCommentMutation.mutate({ responseId, comment: comment.trim() });
    }
  };

  const isLoading = auditLoading || runnerLoading;
  const isLeadAuditor = user?.role === "CompanyAdmin";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const indicators = runnerData?.indicators || [];
  const responses = runnerData?.responses || [];
  
  const openMajorFindings = findings?.filter(f => f.severity === "MAJOR_NC" && f.status === "OPEN") || [];
  const requiresCloseReason = openMajorFindings.length > 0;

  const getRatingCounts = () => {
    const counts = { CONFORMITY_BEST_PRACTICE: 0, CONFORMITY: 0, MINOR_NC: 0, MAJOR_NC: 0 };
    responses.forEach(r => {
      if (counts.hasOwnProperty(r.rating)) {
        counts[r.rating as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const ratingCounts = getRatingCounts();
  
  const unratedIndicators = indicators.filter(
    indicator => !responses.find(r => r.templateIndicatorId === indicator.id)
  );
  
  const selectedIndicator = selectedIndicatorId 
    ? indicators.find(i => i.id === selectedIndicatorId) 
    : null;

  const canAddResponse = newRating && (newRating === "CONFORMITY" || newRating === "CONFORMITY_BEST_PRACTICE" || newComment.length >= 10);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-4">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-2xl font-bold">{audit?.title}</h1>
          <Badge className={statusColors[audit?.status || "DRAFT"]}>{audit?.status}</Badge>
          {audit?.scopeLocked && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Scope Locked
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          {audit?.scopeTimeFrom && audit?.scopeTimeTo ? (
            `${format(new Date(audit.scopeTimeFrom), "MMM d, yyyy")} - ${format(new Date(audit.scopeTimeTo), "MMM d, yyyy")}`
          ) : (
            "Scope period not set"
          )}
        </p>
      </div>

      <AuditNavTabs auditId={id!} currentTab="review" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">{ratingCounts.CONFORMITY_BEST_PRACTICE}</div>
            <div className="text-sm text-muted-foreground">Best Practice</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-500">{ratingCounts.CONFORMITY}</div>
            <div className="text-sm text-muted-foreground">Conformity</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{ratingCounts.MINOR_NC}</div>
            <div className="text-sm text-muted-foreground">Minor NC</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-500">{ratingCounts.MAJOR_NC}</div>
            <div className="text-sm text-muted-foreground">Major NC</div>
          </CardContent>
        </Card>
      </div>

      {findings && findings.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Findings ({findings.length})</CardTitle>
            <CardDescription>Non-conformances identified during the audit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {findings.map(finding => (
                <div 
                  key={finding.id} 
                  className="p-3 border rounded-lg flex justify-between items-start cursor-pointer hover:bg-accent"
                  onClick={() => navigate("/findings")}
                  data-testid={`finding-${finding.id}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={finding.severity === "MAJOR_NC" ? "destructive" : "default"}>
                        {finding.severity === "MAJOR_NC" ? "Major" : "Minor"}
                      </Badge>
                      <Badge variant="outline">{finding.status}</Badge>
                    </div>
                    <p className="text-sm mt-2 line-clamp-2">{finding.findingText}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {evidenceRequests && evidenceRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Evidence Requests ({evidenceRequests.length})
            </CardTitle>
            <CardDescription>Documents requested during this audit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evidenceRequests.map(request => {
                const statusInfo = evidenceStatusConfig[request.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <div 
                    key={request.id} 
                    className="p-3 border rounded-lg flex justify-between items-start cursor-pointer hover:bg-accent"
                    onClick={() => navigate(`/evidence/${request.id}`)}
                    data-testid={`evidence-request-${request.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        <Badge variant="outline">{request.evidenceType}</Badge>
                      </div>
                      <p className="text-sm line-clamp-2">{request.requestNote}</p>
                    </div>
                    {request.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due: {format(new Date(request.dueDate), "MMM d")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Evidence Upload Portal */}
      {id && audit?.status !== "DRAFT" && (
        <div className="mb-6">
          <AuditEvidencePortalManager auditId={id} />
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Responses</CardTitle>
              <CardDescription>All indicator assessments for this audit</CardDescription>
            </div>
            {audit?.status === "IN_REVIEW" && unratedIndicators.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddIndicatorDialog(true)}
                data-testid="button-add-indicator-response"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Response ({unratedIndicators.length} unrated)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {indicators.map((indicator, i) => {
              const response = responses.find(r => r.templateIndicatorId === indicator.id);
              const Icon = response ? ratingIcons[response.rating] : null;
              const colorClass = response ? ratingColors[response.rating] : "";
              const isNonConformance = response && (response.rating === "MINOR_NC" || response.rating === "MAJOR_NC");
              const canEditReviewComment = isLeadAuditor && audit?.status === "IN_REVIEW" && isNonConformance;
              
              return (
                <div key={indicator.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-muted-foreground">Indicator {i + 1}</span>
                    {response && (
                      <div className={`flex items-center gap-1 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{response.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className="font-medium">{indicator.indicatorText}</p>
                  {response?.comment && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{response.comment}"</p>
                  )}
                  
                  {isNonConformance && response && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Lead Auditor Review Comment</span>
                      </div>
                      
                      {canEditReviewComment ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Add review comments for this non-conformance..."
                            value={leadAuditorComments[response.id] ?? response.leadAuditorReviewComment ?? ""}
                            onChange={(e) => setLeadAuditorComments(prev => ({
                              ...prev,
                              [response.id]: e.target.value
                            }))}
                            className="min-h-[80px]"
                            data-testid={`textarea-lead-auditor-comment-${response.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveLeadAuditorComment(response.id)}
                            disabled={savingCommentId === response.id || !(leadAuditorComments[response.id]?.trim())}
                            data-testid={`button-save-review-comment-${response.id}`}
                          >
                            {savingCommentId === response.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Comment"
                            )}
                          </Button>
                        </div>
                      ) : response.leadAuditorReviewComment ? (
                        <p className="text-sm text-muted-foreground italic bg-primary/5 p-2 rounded">
                          "{response.leadAuditorReviewComment}"
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No review comment added</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit for Review - Auditors when audit is IN_PROGRESS */}
      {audit?.status === "IN_PROGRESS" && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Ready to Submit for Review
                </h3>
                <p className="text-sm text-muted-foreground">
                  Submit this audit for lead auditor review and approval before closing.
                </p>
                {audit.reviewNotes && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-sm font-medium text-yellow-700">Changes Requested</p>
                    <p className="text-sm text-muted-foreground mt-1">{audit.reviewNotes}</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setShowSubmitForReviewDialog(true)}
                data-testid="button-submit-for-review"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Auditor Approval Panel - When audit is IN_REVIEW */}
      {audit?.status === "IN_REVIEW" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Pending Lead Auditor Approval
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isLeadAuditor 
                    ? "Review the audit findings and evidence, then approve or request changes."
                    : "This audit is waiting for lead auditor review and approval."}
                </p>
                {audit.submittedForReviewAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted for review: {format(new Date(audit.submittedForReviewAt), "PPpp")}
                  </p>
                )}
              </div>
              
              {isLeadAuditor && (
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowApproveDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-approve-audit"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Approve & Close
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowRequestChangesDialog(true)}
                    data-testid="button-request-changes"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {audit?.status === "CLOSED" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Audit Closed</span>
                </div>
                {audit.closeReason && (
                  <p className="text-sm text-muted-foreground mt-2">Reason: {audit.closeReason}</p>
                )}
                {audit.approvedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved: {format(new Date(audit.approvedAt), "PPpp")}
                  </p>
                )}
              </div>
              {isLeadAuditor && (
                <Button 
                  variant="outline"
                  onClick={() => setShowReopenDialog(true)}
                  data-testid="button-reopen-audit"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reopen Audit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddIndicatorDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddIndicatorDialog(false);
          setSelectedIndicatorId(null);
          setNewRating(null);
          setNewComment("");
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Indicator Response</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Indicator</Label>
              <Select value={selectedIndicatorId || ""} onValueChange={setSelectedIndicatorId}>
                <SelectTrigger data-testid="select-indicator">
                  <SelectValue placeholder="Choose an unrated indicator..." />
                </SelectTrigger>
                <SelectContent>
                  {unratedIndicators.map((indicator, i) => (
                    <SelectItem key={indicator.id} value={indicator.id} data-testid={`select-indicator-${indicator.id}`}>
                      <span className="line-clamp-1">{indicator.indicatorText}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedIndicator && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedIndicator.indicatorText}</p>
                {selectedIndicator.guidanceText && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedIndicator.guidanceText}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={newRating || ""} onValueChange={(v) => setNewRating(v as IndicatorRating)}>
                <SelectTrigger data-testid="select-rating">
                  <SelectValue placeholder="Select a rating..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFORMITY_BEST_PRACTICE">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Conformity with Best Practice (3 pts)
                    </div>
                  </SelectItem>
                  <SelectItem value="CONFORMITY">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Conformity (2 pts)
                    </div>
                  </SelectItem>
                  <SelectItem value="MINOR_NC">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Minor Non-Conformance (1 pt)
                    </div>
                  </SelectItem>
                  <SelectItem value="MAJOR_NC">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Major Non-Conformance (0 pts)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>
                Comment
                {newRating && (newRating === "MINOR_NC" || newRating === "MAJOR_NC") && (
                  <span className="text-destructive ml-1">* (required, min 10 chars)</span>
                )}
              </Label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your assessment comments..."
                data-testid="input-indicator-comment"
              />
            </div>
          </div>
          
          {addResponseMutation.error && (
            <p className="text-sm text-destructive">{(addResponseMutation.error as Error).message}</p>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIndicatorDialog(false)}>Cancel</Button>
            <Button
              disabled={!selectedIndicatorId || !canAddResponse || addResponseMutation.isPending}
              onClick={() => {
                if (selectedIndicatorId && newRating) {
                  addResponseMutation.mutate({
                    indicatorId: selectedIndicatorId,
                    rating: newRating,
                    comment: newComment || undefined,
                  });
                }
              }}
              data-testid="button-save-indicator-response"
            >
              {addResponseMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Review Dialog */}
      <Dialog open={showSubmitForReviewDialog} onOpenChange={setShowSubmitForReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Audit for Review</DialogTitle>
            <DialogDescription>
              This will submit the audit to the lead auditor for review and approval.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Once submitted, the lead auditor will review all findings, evidence, and your assessments 
              before approving the audit for closure.
            </p>
          </div>
          {submitForReviewMutation.error && (
            <p className="text-sm text-destructive">{(submitForReviewMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitForReviewDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => submitForReviewMutation.mutate()}
              disabled={submitForReviewMutation.isPending}
              data-testid="button-confirm-submit-review"
            >
              {submitForReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Audit Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve & Close Audit</DialogTitle>
            <DialogDescription>
              Confirm that you have reviewed the audit and approve it for closure.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              By approving, you confirm that you have reviewed all indicator assessments, 
              findings, and evidence. The audit will be marked as closed.
            </p>
            {requiresCloseReason && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Note: There are {openMajorFindings.length} open major finding(s).
                </p>
              </div>
            )}
          </div>
          {approveMutation.error && (
            <p className="text-sm text-destructive">{(approveMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Approve & Close Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={showRequestChangesDialog} onOpenChange={setShowRequestChangesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes</DialogTitle>
            <DialogDescription>
              Provide feedback on what needs to be addressed before the audit can be approved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Review Notes <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Describe what changes are needed..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                data-testid="input-review-notes"
              />
            </div>
          </div>
          {requestChangesMutation.error && (
            <p className="text-sm text-destructive">{(requestChangesMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestChangesDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => requestChangesMutation.mutate()}
              disabled={!reviewNotes.trim() || requestChangesMutation.isPending}
              data-testid="button-confirm-request-changes"
            >
              {requestChangesMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Audit</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {requiresCloseReason ? (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm">
                    There are {openMajorFindings.length} open major finding(s). 
                    Please provide a reason for closing with open major findings.
                  </p>
                </div>
                <Textarea
                  placeholder="Reason for closing with open findings..."
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  data-testid="input-close-reason"
                />
              </div>
            ) : (
              <p>Are you sure you want to close this audit? This action cannot be undone.</p>
            )}
          </div>
          {closeMutation.error && (
            <p className="text-sm text-destructive">{(closeMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => closeMutation.mutate()}
              disabled={(requiresCloseReason && !closeReason.trim()) || closeMutation.isPending}
              data-testid="button-confirm-close"
            >
              {closeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Audit Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Audit</DialogTitle>
            <DialogDescription>
              Provide a reason for reopening this closed audit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Reason for Reopening <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Why does this audit need to be reopened?"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={4}
                data-testid="input-reopen-reason"
              />
            </div>
          </div>
          {reopenMutation.error && (
            <p className="text-sm text-destructive">{(reopenMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => reopenMutation.mutate()}
              disabled={!reopenReason.trim() || reopenMutation.isPending}
              data-testid="button-confirm-reopen"
            >
              {reopenMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reopen Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
