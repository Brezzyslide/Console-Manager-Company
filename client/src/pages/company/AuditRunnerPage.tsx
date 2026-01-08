import { useState, useEffect } from "react";
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
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Eye, Send, FileUp } from "lucide-react";
import { 
  getAuditRunner, 
  saveIndicatorResponse, 
  submitAudit,
  createAuditEvidenceRequest,
  getAuditEvidenceRequests,
  getAuditSummary,
  type IndicatorRating,
  type AuditTemplateIndicator,
  type AuditIndicatorResponse,
  type EvidenceType,
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
  { value: "CONFORMANCE", label: "Conformance", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-600", points: 2 },
  { value: "OBSERVATION", label: "Observation", icon: Eye, color: "bg-blue-500 hover:bg-blue-600", points: 1 },
  { value: "MINOR_NC", label: "Minor NC", icon: AlertTriangle, color: "bg-yellow-500 hover:bg-yellow-600", points: 0 },
  { value: "MAJOR_NC", label: "Major NC", icon: AlertCircle, color: "bg-red-500 hover:bg-red-600", points: -2 },
];

export default function AuditRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<IndicatorRating | null>(null);
  const [comment, setComment] = useState("");
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
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

  const saveMutation = useMutation({
    mutationFn: (data: { rating: IndicatorRating; comment?: string }) => 
      saveIndicatorResponse(id!, runnerData!.indicators[currentIndex].id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
      queryClient.invalidateQueries({ queryKey: ["auditSummary", id] });
      setRating(null);
      setComment("");
      if (currentIndex < (runnerData?.indicators.length || 0) - 1) {
        setCurrentIndex(prev => prev + 1);
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditEvidenceRequests", id] });
      setShowEvidenceDialog(false);
      setEvidenceForm({ evidenceType: "", requestNote: "", dueDate: "" });
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

  const indicators = runnerData?.indicators || [];
  const responses = runnerData?.responses || [];
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
  
  const progressPercent = indicators.length > 0 
    ? (responses.length / indicators.length) * 100 
    : 0;

  const canSubmit = responses.length === indicators.length && indicators.length > 0;

  const handleSave = () => {
    if (!rating) return;
    
    const requiresComment = rating !== "CONFORMANCE";
    if (requiresComment && comment.trim().length < 10) {
      return;
    }
    
    saveMutation.mutate({ 
      rating, 
      comment: comment.trim() || undefined,
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
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Progress: {responses.length} of {indicators.length} indicators completed
            </span>
            <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
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
              <label className="text-sm font-medium">
                Comment {rating && rating !== "CONFORMANCE" && <span className="text-destructive">*</span>}
              </label>
              <Textarea
                placeholder={rating && rating !== "CONFORMANCE" 
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
                onClick={handleSave}
                disabled={!rating || (rating !== "CONFORMANCE" && comment.trim().length < 10) || saveMutation.isPending}
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

      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
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
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleRequestEvidence}
              disabled={!evidenceForm.evidenceType || !evidenceForm.requestNote || evidenceRequestMutation.isPending}
              data-testid="button-submit-evidence-request"
            >
              {evidenceRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Request Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
