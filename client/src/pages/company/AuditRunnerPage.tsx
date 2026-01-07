import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Eye, Send } from "lucide-react";
import { 
  getAuditRunner, 
  saveIndicatorResponse, 
  submitAudit,
  type IndicatorRating,
  type AuditTemplateIndicator,
  type AuditIndicatorResponse,
} from "@/lib/company-api";

const ratingOptions: { value: IndicatorRating; label: string; icon: any; color: string }[] = [
  { value: "CONFORMANCE", label: "Conformance", icon: CheckCircle2, color: "bg-green-500 hover:bg-green-600" },
  { value: "OBSERVATION", label: "Observation", icon: Eye, color: "bg-blue-500 hover:bg-blue-600" },
  { value: "MINOR_NC", label: "Minor NC", icon: AlertTriangle, color: "bg-yellow-500 hover:bg-yellow-600" },
  { value: "MAJOR_NC", label: "Major NC", icon: AlertCircle, color: "bg-red-500 hover:bg-red-600" },
];

export default function AuditRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rating, setRating] = useState<IndicatorRating | null>(null);
  const [comment, setComment] = useState("");

  const { data: runnerData, isLoading } = useQuery({
    queryKey: ["auditRunner", id],
    queryFn: () => getAuditRunner(id!),
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { rating: IndicatorRating; comment?: string }) => 
      saveIndicatorResponse(id!, runnerData!.indicators[currentIndex].id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditRunner", id] });
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
    if (requiresComment && !comment.trim()) {
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
              <Badge variant="outline">{currentIndicator.riskLevel} Risk</Badge>
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
                      className={rating === opt.value ? opt.color : ""}
                      onClick={() => setRating(opt.value)}
                      data-testid={`button-rating-${opt.value}`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {opt.label}
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
                  ? "Comment required for this rating..." 
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
                disabled={!rating || (rating !== "CONFORMANCE" && !comment.trim()) || saveMutation.isPending}
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
    </div>
  );
}
