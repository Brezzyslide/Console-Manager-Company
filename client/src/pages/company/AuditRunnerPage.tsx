import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Eye, Send, FileUp, Link, Check, Copy, Layers, Settings2, Lock } from "lucide-react";
import { AuditNavTabs } from "@/components/AuditNavTabs";
import { useToast } from "@/hooks/use-toast";
import { 
  getAuditRunner, 
  saveIndicatorResponse, 
  submitAudit,
  createAuditEvidenceRequest,
  getAuditEvidenceRequests,
  getAuditSummary,
  getAuditScopeOptions,
  updateAuditScope,
  getAuditDomains,
  updateAuditScopeDomains,
  type IndicatorRating,
  type AuditTemplateIndicator,
  type AuditIndicatorResponse,
  type EvidenceType,
  type EvidenceRequest,
  type AuditRunnerScopeDomain,
  type AuditDomain,
} from "@/lib/company-api";

const evidenceTypeOptions: { value: EvidenceType; label: string }[] = [
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure" },
  { value: "TRAINING_RECORD", label: "Training Record" },
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "CASE_NOTE", label: "Case Note" },
  { value: "MEDICATION_RECORD", label: "Medication Record" },
  { value: "BSP", label: "Behaviour Support Plan" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "ROSTER", label: "Roster/Schedule" },
  { value: "OTHER", label: "Other" },
];

const ratingOptions: { value: IndicatorRating; label: string; icon: any; color: string; points: number }[] = [
  { value: "CONFORMITY_BEST_PRACTICE", label: "Conformity with Best Practice", icon: CheckCircle2, color: "bg-emerald-500 hover:bg-emerald-600", points: 3 },
  { value: "CONFORMITY", label: "Conformity", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-600", points: 2 },
  { value: "MINOR_NC", label: "Minor Non-Conformance", icon: AlertTriangle, color: "bg-yellow-500 hover:bg-yellow-600", points: 1 },
  { value: "MAJOR_NC", label: "Major Non-Conformance", icon: AlertCircle, color: "bg-red-500 hover:bg-red-600", points: 0 },
];

export default function AuditRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<IndicatorRating | null>(null);
  const [comment, setComment] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [showEditScopeDialog, setShowEditScopeDialog] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<EvidenceRequest | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedLineItemIds, setSelectedLineItemIds] = useState<string[]>([]);
  const [selectedDomainIds, setSelectedDomainIds] = useState<string[]>([]);
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: "" as EvidenceType | "",
    requestNote: "",
    dueDate: "",
  });

  const { data: runnerData, isLoading } = useQuery({
    queryKey: ["auditRunner", id],
    queryFn: () => getAuditRunner(id!),
    enabled: !!id,
  });

  const { data: summaryData } = useQuery({
    queryKey: ["auditSummary", id],
    queryFn: () => getAuditSummary(id!),
    enabled: !!id,
  });

  const { data: scopeOptionsData } = useQuery({
    queryKey: ["auditScopeOptions", id],
    queryFn: () => getAuditScopeOptions(id!),
    enabled: !!id && showEditScopeDialog,
  });

  const { data: allDomains } = useQuery({
    queryKey: ["auditDomains"],
    queryFn: () => getAuditDomains(),
    enabled: showEditScopeDialog,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { indicatorId: string; rating: IndicatorRating; comment?: string; shouldAdvance?: boolean }) => 
      saveIndicatorResponse(id!, data.indicatorId, { rating: data.rating, comment: data.comment }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
      queryClient.invalidateQueries({ queryKey: ["auditSummary", id] });
      if (variables.shouldAdvance) {
        setCurrentIndex(prev => {
          const maxIndex = filteredIndicators.length - 1;
          return prev < maxIndex ? prev + 1 : prev;
        });
      }
      setRating(null);
      setComment("");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitAudit(id!),
    onSuccess: () => {
      navigate(`/audits/${id}/review`);
    },
  });

  const evidenceRequestMutation = useMutation({
    mutationFn: (data: { evidenceType: EvidenceType; requestNote: string; templateIndicatorId?: string; dueDate?: string | null }) => 
      createAuditEvidenceRequest(id!, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["auditEvidenceRequests", id] });
      setCreatedRequest(data);
    },
  });

  const updateScopeMutation = useMutation({
    mutationFn: async () => {
      await updateAuditScope(id!, selectedLineItemIds);
      await updateAuditScopeDomains(id!, selectedDomainIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
      queryClient.invalidateQueries({ queryKey: ["auditScopeOptions", id] });
      setShowEditScopeDialog(false);
      toast({
        title: "Scope updated",
        description: "The audit scope has been updated successfully",
      });
    },
  });

  const handleRequestEvidence = () => {
    if (!evidenceForm.evidenceType || !evidenceForm.requestNote) return;
    evidenceRequestMutation.mutate({
      evidenceType: evidenceForm.evidenceType as EvidenceType,
      requestNote: evidenceForm.requestNote,
      templateIndicatorId: currentIndicator?.id,
      dueDate: evidenceForm.dueDate || null,
    });
  };

  const handleCopyLink = () => {
    if (!createdRequest?.publicToken) return;
    const uploadUrl = `${window.location.origin}/upload/${createdRequest.publicToken}`;
    navigator.clipboard.writeText(uploadUrl);
    setLinkCopied(true);
    toast({
      title: "Link copied",
      description: "The shareable upload link has been copied to your clipboard",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleCloseEvidenceDialog = () => {
    setShowEvidenceDialog(false);
    setCreatedRequest(null);
    setLinkCopied(false);
    setEvidenceForm({ evidenceType: "", requestNote: "", dueDate: "" });
    evidenceRequestMutation.reset();
  };

  const handleOpenEditScope = () => {
    const currentLineItemIds = runnerData?.scopeItems?.map(si => si.lineItemId) || [];
    const currentDomainIds = scopeDomains.filter(d => d.isIncluded).map(d => d.id);
    setSelectedLineItemIds(currentLineItemIds);
    setSelectedDomainIds(currentDomainIds);
    setShowEditScopeDialog(true);
  };

  const toggleLineItem = (lineItemId: string) => {
    setSelectedLineItemIds(prev => 
      prev.includes(lineItemId) 
        ? prev.filter(id => id !== lineItemId)
        : [...prev, lineItemId]
    );
  };

  const toggleDomain = (domainId: string) => {
    setSelectedDomainIds(prev => 
      prev.includes(domainId)
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    );
  };

  const allIndicators = runnerData?.indicators || [];
  const responses = runnerData?.responses || [];
  const scopeDomains = runnerData?.scopeDomains || [];
  
  const filteredIndicators = useMemo(() => {
    if (domainFilter === "all") {
      return allIndicators;
    }
    return allIndicators.filter(ind => {
      if (!ind.auditDomainCode) return true;
      return ind.auditDomainCode === domainFilter;
    });
  }, [allIndicators, domainFilter]);
  
  const indicators = filteredIndicators;
  const currentIndicator = indicators[currentIndex];
  const existingResponse = responses.find(r => r.templateIndicatorId === currentIndicator?.id);

  // Initialize form with existing response when current indicator changes
  useEffect(() => {
    if (existingResponse) {
      setRating(existingResponse.rating);
      setComment(existingResponse.comment || "");
    }
  }, [currentIndicator?.id, existingResponse]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const progressPercent = allIndicators.length > 0 
    ? (responses.length / allIndicators.length) * 100 
    : 0;

  const canSubmit = responses.length === allIndicators.length && allIndicators.length > 0;

  const handleSave = () => {
    if (!rating) return;
    
    const requiresComment = rating === "MINOR_NC" || rating === "MAJOR_NC";
    if (requiresComment && comment.trim().length < 10) {
      return;
    }
    
    if (!currentIndicator) return;
    saveMutation.mutate({ 
      indicatorId: currentIndicator.id,
      rating, 
      comment: comment.trim() || undefined,
      shouldAdvance: false,
    });
  };
  
  const handleSaveAndNext = () => {
    if (!rating) return;
    const requiresComment = rating === "MINOR_NC" || rating === "MAJOR_NC";
    if (requiresComment && comment.trim().length < 10) return;
    if (!currentIndicator) return;
    
    saveMutation.mutate({ 
      indicatorId: currentIndicator.id,
      rating, 
      comment: comment.trim() || undefined,
      shouldAdvance: true,
    });
  };

  const goToIndicator = (index: number) => {
    setCurrentIndex(index);
    const response = responses.find(r => r.templateIndicatorId === indicators[index]?.id);
    if (response) {
      setRating(response.rating);
      setComment(response.comment || "");
    } else {
      setRating(null);
      setComment("");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{runnerData?.audit.title}</h1>
        <p className="text-muted-foreground">
          Template: {runnerData?.template?.name}
        </p>
        
        {scopeDomains.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>Domains:</span>
            </div>
            {scopeDomains.map(domain => (
              <Badge 
                key={domain.id} 
                variant="secondary"
                className="text-xs"
                data-testid={`badge-domain-${domain.code}`}
              >
                {domain.name}
              </Badge>
            ))}
          </div>
        )}
        
        {scopeDomains.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <Label className="text-sm">Filter by domain:</Label>
            <Select value={domainFilter} onValueChange={(value) => {
              setDomainFilter(value);
              setCurrentIndex(0);
            }}>
              <SelectTrigger className="w-[200px]" data-testid="select-domain-filter">
                <SelectValue placeholder="All domains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All domains</SelectItem>
                {scopeDomains.map(domain => (
                  <SelectItem key={domain.id} value={domain.code}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <div className="mt-4">
          {runnerData?.audit.scopeLocked ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Scope is locked (external audit)</span>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenEditScope}
              data-testid="button-edit-scope"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Edit Scope
            </Button>
          )}
        </div>
      </div>

      <AuditNavTabs auditId={id!} currentTab="runner" />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Progress: {responses.length} of {allIndicators.length} indicators completed
            </span>
            <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {domainFilter !== "all" && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {indicators.length} of {allIndicators.length} indicators (filtered by domain)
            </p>
          )}
          
          {summaryData && summaryData.completedCount > 0 && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600" data-testid="text-conformance-count">
                  {summaryData.conformanceCount}
                </div>
                <div className="text-xs text-muted-foreground">Conformance</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600" data-testid="text-observation-count">
                  {summaryData.observationCount}
                </div>
                <div className="text-xs text-muted-foreground">Observation</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" data-testid="text-minor-nc-count">
                  {summaryData.minorNcCount}
                </div>
                <div className="text-xs text-muted-foreground">Minor NC</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600" data-testid="text-major-nc-count">
                  {summaryData.majorNcCount}
                </div>
                <div className="text-xs text-muted-foreground">Major NC</div>
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="text-score-percent">
                  {summaryData.scorePercent}%
                </div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 mb-6 flex-wrap">
        {indicators.map((ind, i) => {
          const hasResponse = responses.some(r => r.templateIndicatorId === ind.id);
          return (
            <Button
              key={ind.id}
              variant={i === currentIndex ? "default" : hasResponse ? "secondary" : "outline"}
              size="sm"
              onClick={() => goToIndicator(i)}
              data-testid={`button-indicator-${i}`}
            >
              {i + 1}
              {hasResponse && <CheckCircle2 className="h-3 w-3 ml-1" />}
            </Button>
          );
        })}
      </div>

      {currentIndicator && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Indicator {currentIndex + 1} of {indicators.length}</CardTitle>
                {currentIndicator.isCriticalControl && (
                  <Badge variant="destructive" className="mt-2">Critical Control</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowEvidenceDialog(true)}
                  data-testid="button-request-evidence"
                >
                  <FileUp className="h-4 w-4 mr-1" />
                  Request Evidence
                </Button>
                <Badge variant="outline">{currentIndicator.riskLevel} Risk</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{currentIndicator.indicatorText}</p>
              {currentIndicator.guidanceText && (
                <p className="text-sm text-muted-foreground mt-2">{currentIndicator.guidanceText}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {ratingOptions.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      variant={rating === opt.value ? "default" : "outline"}
                      className={`${rating === opt.value ? opt.color : ""} flex-col h-auto py-3`}
                      onClick={() => setRating(opt.value)}
                      data-testid={`button-rating-${opt.value}`}
                    >
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2" />
                        {opt.label}
                      </div>
                      <span className="text-xs opacity-75 mt-1">
                        {opt.points >= 0 ? `+${opt.points}` : opt.points} pts
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Comment {rating && (rating === "MINOR_NC" || rating === "MAJOR_NC") && <span className="text-destructive">*</span>}
                </label>
                {rating && (rating === "MINOR_NC" || rating === "MAJOR_NC") && (
                  <span className={`text-xs ${comment.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"}`}>
                    {comment.trim().length}/10 min
                  </span>
                )}
              </div>
              <Textarea
                placeholder={rating && (rating === "MINOR_NC" || rating === "MAJOR_NC") 
                  ? "Comment required (minimum 10 characters)..." 
                  : "Optional comment..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-comment"
              />
            </div>

            {saveMutation.error && (
              <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
            )}

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => goToIndicator(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button 
                onClick={handleSaveAndNext}
                disabled={!rating || ((rating === "MINOR_NC" || rating === "MAJOR_NC") && comment.trim().length < 10) || saveMutation.isPending}
                data-testid="button-save-response"
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save & Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canSubmit && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">All indicators completed!</h3>
                <p className="text-sm text-muted-foreground">Ready to submit for review</p>
              </div>
              <Button 
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                data-testid="button-submit-audit"
              >
                {submitMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
            </div>
            {submitMutation.error && (
              <p className="text-sm text-destructive mt-2">{(submitMutation.error as Error).message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showEvidenceDialog} onOpenChange={handleCloseEvidenceDialog}>
        <DialogContent>
          {createdRequest ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Evidence Request Created
                </DialogTitle>
                <DialogDescription>
                  Share this link with external parties to allow them to upload evidence
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                    Request created successfully! Copy the link below to share with external parties.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/upload/${createdRequest.publicToken}`}
                      className="text-sm"
                      data-testid="input-shareable-link"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant={linkCopied ? "default" : "outline"}
                      className={linkCopied ? "bg-green-600 hover:bg-green-700" : ""}
                      data-testid="button-copy-link"
                    >
                      {linkCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseEvidenceDialog} data-testid="button-done">
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request Evidence</DialogTitle>
                <DialogDescription>
                  Request supporting evidence for this indicator
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <span className="text-muted-foreground">For indicator: </span>
                  {currentIndicator?.indicatorText?.slice(0, 80)}
                  {(currentIndicator?.indicatorText?.length || 0) > 80 && "..."}
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
                    value={evidenceForm.requestNote}
                    onChange={(e) => setEvidenceForm(prev => ({ ...prev, requestNote: e.target.value }))}
                    placeholder="Describe what document is needed..."
                    data-testid="input-evidence-request-note"
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
              {evidenceRequestMutation.error && (
                <p className="text-sm text-destructive">{(evidenceRequestMutation.error as Error).message}</p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseEvidenceDialog}>Cancel</Button>
                <Button 
                  onClick={handleRequestEvidence}
                  disabled={!evidenceForm.evidenceType || !evidenceForm.requestNote || evidenceRequestMutation.isPending}
                  data-testid="button-submit-evidence-request"
                >
                  {evidenceRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Request Evidence
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditScopeDialog} onOpenChange={setShowEditScopeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit Audit Scope</DialogTitle>
            <DialogDescription>
              Modify the service types and domains included in this audit
            </DialogDescription>
          </DialogHeader>
          
          {(!scopeOptionsData || !allDomains) ? (
            <div className="py-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading scope options...</span>
            </div>
          ) : (
          <div className="space-y-6 py-4">
            <div>
              <h4 className="font-medium mb-3">Audit Domains</h4>
              <div className="space-y-2">
                {allDomains?.map(domain => (
                  <div key={domain.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{domain.name}</span>
                      <p className="text-sm text-muted-foreground">{domain.code}</p>
                    </div>
                    <Switch
                      checked={selectedDomainIds.includes(domain.id)}
                      onCheckedChange={() => toggleDomain(domain.id)}
                      data-testid={`switch-domain-${domain.code}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Service Types ({selectedLineItemIds.length} selected)</h4>
              <ScrollArea className="h-[300px] border rounded-lg p-3">
                {scopeOptionsData?.lineItemsByCategory.map(category => (
                  <div key={category.categoryId} className="mb-4">
                    <h5 className="text-sm font-medium text-muted-foreground mb-2">{category.categoryLabel}</h5>
                    <div className="space-y-1">
                      {category.items.map(item => (
                        <div 
                          key={item.lineItemId} 
                          className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                        >
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={selectedLineItemIds.includes(item.lineItemId)}
                            onCheckedChange={() => toggleLineItem(item.lineItemId)}
                            data-testid={`switch-lineitem-${item.lineItemId}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          )}

          {updateScopeMutation.error && (
            <p className="text-sm text-destructive">{(updateScopeMutation.error as Error).message}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditScopeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateScopeMutation.mutate()}
              disabled={updateScopeMutation.isPending || selectedLineItemIds.length === 0}
              data-testid="button-save-scope"
            >
              {updateScopeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
