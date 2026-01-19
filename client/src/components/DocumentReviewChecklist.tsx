import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileCheck } from "lucide-react";
import {
  getDocumentChecklistTemplate,
  createDocumentReview,
  getDocumentReviewByEvidenceItem,
  type DocumentChecklistItem,
  type ChecklistResponse,
  type ReviewDecision,
} from "@/lib/company-api";

interface Props {
  evidenceItemId: string;
  evidenceRequestId: string;
  documentType: string;
  auditId?: string;
  onReviewComplete?: () => void;
}

const RESPONSE_OPTIONS: { value: ChecklistResponse; label: string; color: string }[] = [
  { value: "YES", label: "Yes", color: "text-emerald-400" },
  { value: "NO", label: "No", color: "text-red-400" },
  { value: "PARTLY", label: "Partly", color: "text-amber-400" },
  { value: "NA", label: "N/A", color: "text-muted-foreground" },
];

const SECTION_LABELS: Record<string, { label: string; bgColor: string; borderColor: string; headingColor: string }> = {
  HYGIENE: { label: "Document Hygiene", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", headingColor: "text-cyan-400" },
  IMPLEMENTATION: { label: "Implementation", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/30", headingColor: "text-violet-400" },
  CRITICAL: { label: "Critical Items", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", headingColor: "text-red-400" },
};

export default function DocumentReviewChecklist({
  evidenceItemId,
  evidenceRequestId,
  documentType,
  auditId,
  onReviewComplete,
}: Props) {
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>({});
  const [decision, setDecision] = useState<ReviewDecision>("ACCEPT");
  const [comments, setComments] = useState("");

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["documentChecklistTemplate", documentType],
    queryFn: () => getDocumentChecklistTemplate(documentType),
    enabled: !!documentType,
  });

  const { data: existingReview, isLoading: reviewLoading } = useQuery({
    queryKey: ["documentReview", evidenceItemId],
    queryFn: () => getDocumentReviewByEvidenceItem(evidenceItemId),
    enabled: !!evidenceItemId,
  });

  const submitMutation = useMutation({
    mutationFn: createDocumentReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentReview", evidenceItemId] });
      queryClient.invalidateQueries({ queryKey: ["evidenceRequest"] });
      queryClient.invalidateQueries({ queryKey: ["suggestedFindings"] });
      onReviewComplete?.();
    },
  });

  useEffect(() => {
    if (template?.items && Object.keys(responses).length === 0) {
      const initialResponses: Record<string, ChecklistResponse> = {};
      template.items.forEach((item) => {
        initialResponses[item.id] = "YES";
      });
      setResponses(initialResponses);
    }
  }, [template?.items]);

  const handleResponseChange = (itemId: string, value: ChecklistResponse) => {
    setResponses((prev) => ({ ...prev, [itemId]: value }));
  };

  const calculateScore = () => {
    if (!template?.items) return { score: 0, criticalFailures: 0 };

    let yesCount = 0;
    let partlyCount = 0;
    let criticalFailures = 0;
    let applicableCount = 0;

    for (const item of template.items) {
      const response = responses[item.id];
      if (response === "NA") continue;

      applicableCount++;
      if (response === "YES") yesCount++;
      else if (response === "PARTLY") partlyCount++;

      if (item.isCritical && response === "NO") {
        criticalFailures++;
      }
    }

    const score = applicableCount > 0 
      ? Math.round(((yesCount + partlyCount * 0.5) / applicableCount) * 100) 
      : 0;

    return { score, criticalFailures };
  };

  const handleSubmit = () => {
    if (!template?.items) return;

    const responseArray = template.items.map((item) => ({
      itemId: item.id,
      response: responses[item.id],
    }));

    submitMutation.mutate({
      evidenceRequestId,
      evidenceItemId,
      auditId,
      responses: responseArray,
      decision,
      comments: comments || undefined,
    });
  };

  const groupItemsBySection = (items: DocumentChecklistItem[]) => {
    const groups: Record<string, DocumentChecklistItem[]> = {
      HYGIENE: [],
      IMPLEMENTATION: [],
      CRITICAL: [],
    };

    items.forEach((item) => {
      if (groups[item.section]) {
        groups[item.section].push(item);
      }
    });

    return groups;
  };

  if (templateLoading || reviewLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (existingReview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5" />
            Document Review Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {existingReview.decision === "ACCEPT" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {existingReview.decision === "ACCEPT" ? "Accepted" : "Rejected"}
              </span>
            </div>
            <Badge variant="outline">DQS: {existingReview.dqsPercent}%</Badge>
            {existingReview.criticalFailuresCount > 0 && (
              <Badge variant="destructive">
                {existingReview.criticalFailuresCount} Critical Failure{existingReview.criticalFailuresCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {existingReview.comments && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Comments:</span> {existingReview.comments}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            No checklist template available for this document type
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedItems = groupItemsBySection(template.items);
  const { score, criticalFailures } = calculateScore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Document Review Checklist</CardTitle>
        <CardDescription>
          {template.templateName} - Review each item below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(SECTION_LABELS).map(([section, config]) => {
          const items = groupedItems[section];
          if (!items || items.length === 0) return null;

          return (
            <div key={section} className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
              <h4 className={`font-semibold mb-3 ${config.headingColor}`}>{config.label}</h4>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 bg-card/80 rounded-lg p-3 border border-border/50"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {item.isCritical && (
                          <span className="text-red-400 font-bold mr-1">*</span>
                        )}
                        {item.itemText}
                      </p>
                    </div>
                    <RadioGroup
                      value={responses[item.id]}
                      onValueChange={(v) => handleResponseChange(item.id, v as ChecklistResponse)}
                      className="flex gap-3"
                    >
                      {RESPONSE_OPTIONS.map((opt) => (
                        <div key={opt.value} className="flex items-center gap-1">
                          <RadioGroupItem
                            value={opt.value}
                            id={`${item.id}-${opt.value}`}
                            data-testid={`radio-${item.id}-${opt.value}`}
                          />
                          <Label
                            htmlFor={`${item.id}-${opt.value}`}
                            className={`text-xs cursor-pointer ${opt.color}`}
                          >
                            {opt.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Document Quality Score</span>
              <p className="text-2xl font-bold text-foreground">{score}%</p>
            </div>
            {criticalFailures > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {criticalFailures} Critical Failure{criticalFailures > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Decision</Label>
            <RadioGroup
              value={decision}
              onValueChange={(v) => setDecision(v as ReviewDecision)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="ACCEPT" id="decision-accept" data-testid="radio-decision-accept" />
                <Label htmlFor="decision-accept" className="flex items-center gap-1 cursor-pointer text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Accept
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="REJECT" id="decision-reject" data-testid="radio-decision-reject" />
                <Label htmlFor="decision-reject" className="flex items-center gap-1 cursor-pointer text-red-400">
                  <XCircle className="h-4 w-4" />
                  Reject
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments {decision === "REJECT" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={decision === "REJECT" 
                ? "Explain why this document is being rejected (minimum 10 characters)..." 
                : "Add any comments about this document review (optional)"}
              rows={3}
              data-testid="input-review-comments"
            />
            {decision === "REJECT" && (
              <p className={`text-xs ${comments.trim().length >= 10 ? "text-muted-foreground" : "text-destructive"}`}>
                {comments.trim().length}/10 min characters required
              </p>
            )}
          </div>

          {criticalFailures > 0 && decision === "ACCEPT" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: This document has {criticalFailures} critical failure{criticalFailures > 1 ? "s" : ""}.
                Consider rejecting it for remediation.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || (decision === "REJECT" && comments.trim().length < 10)}
            className="w-full"
            data-testid="button-submit-review"
          >
            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Review
          </Button>

          {submitMutation.error && (
            <p className="text-sm text-destructive text-center">
              {(submitMutation.error as Error).message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
