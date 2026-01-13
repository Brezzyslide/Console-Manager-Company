import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Lightbulb,
  XCircle,
  CheckCircle,
  X,
  Loader2,
} from "lucide-react";
import {
  confirmSuggestedFinding,
  dismissSuggestedFinding,
  type SuggestedFinding,
  type SuggestedFindingType,
} from "@/lib/company-api";
import { toast } from "sonner";

interface Props {
  suggestion: SuggestedFinding;
  onActionComplete?: () => void;
}

const SUGGESTION_CONFIG: Record<
  Exclude<SuggestedFindingType, "NONE">,
  { icon: typeof AlertTriangle; color: string; bgColor: string; borderColor: string; label: string }
> = {
  OBSERVATION: {
    icon: Lightbulb,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "Observation",
  },
  MINOR_NC: {
    icon: AlertTriangle,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Minor Non-Conformance",
  },
  MAJOR_NC: {
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Major Non-Conformance",
  },
};

export default function SuggestedFindingBanner({ suggestion, onActionComplete }: Props) {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmType, setConfirmType] = useState<SuggestedFindingType | null>(null);
  const [description, setDescription] = useState("");
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const [dismissReason, setDismissReason] = useState("");

  const config = suggestion.suggestedType !== "NONE" 
    ? SUGGESTION_CONFIG[suggestion.suggestedType] 
    : null;

  const confirmMutation = useMutation({
    mutationFn: (data: { findingType: "OBSERVATION" | "MINOR_NC" | "MAJOR_NC"; description: string }) =>
      confirmSuggestedFinding(suggestion.id, data),
    onSuccess: (result) => {
      toast.success(
        result.finding 
          ? "Finding created successfully" 
          : "Observation noted"
      );
      queryClient.invalidateQueries({ queryKey: ["suggestedFindings"] });
      queryClient.invalidateQueries({ queryKey: ["documentReview"] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      setShowConfirmDialog(false);
      setDescription("");
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to confirm finding");
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (reason?: string) => dismissSuggestedFinding(suggestion.id, reason),
    onSuccess: () => {
      toast.success("Suggestion dismissed");
      queryClient.invalidateQueries({ queryKey: ["suggestedFindings"] });
      setShowDismissDialog(false);
      setDismissReason("");
      onActionComplete?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to dismiss suggestion");
    },
  });

  const handleConfirmClick = (type: SuggestedFindingType) => {
    if (type === "NONE") return;
    setConfirmType(type);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    if (!confirmType || confirmType === "NONE") return;
    if (description.trim().length < 10) {
      toast.error("Please provide at least 10 characters of description");
      return;
    }
    confirmMutation.mutate({
      findingType: confirmType,
      description: description.trim(),
    });
  };

  if (!config || suggestion.status !== "PENDING") {
    return null;
  }

  const Icon = config.icon;

  return (
    <>
      <Card className={`${config.bgColor} ${config.borderColor} border-2`} data-testid="suggested-finding-banner">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <Icon className={`h-6 w-6 mt-0.5 ${config.color}`} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${config.color}`}>
                    Suggested: {config.label}
                  </span>
                  {suggestion.severityFlag && (
                    <Badge
                      variant="outline"
                      className={
                        suggestion.severityFlag === "HIGH"
                          ? "border-red-500 text-red-700"
                          : suggestion.severityFlag === "MEDIUM"
                          ? "border-amber-500 text-amber-700"
                          : "border-blue-500 text-blue-700"
                      }
                    >
                      {suggestion.severityFlag} severity
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestion.rationaleText}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 ml-9 md:ml-0">
              <Button
                size="sm"
                variant="outline"
                className="border-blue-400 text-blue-700 hover:bg-blue-100"
                onClick={() => handleConfirmClick("OBSERVATION")}
                data-testid="btn-create-observation"
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                Observation
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => handleConfirmClick("MINOR_NC")}
                data-testid="btn-create-minor-nc"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Minor NC
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-400 text-red-700 hover:bg-red-100"
                onClick={() => handleConfirmClick("MAJOR_NC")}
                data-testid="btn-create-major-nc"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Major NC
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShowDismissDialog(true)}
                data-testid="btn-dismiss-suggestion"
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmType === "OBSERVATION"
                ? "Create Observation"
                : confirmType === "MINOR_NC"
                ? "Create Minor Non-Conformance"
                : "Create Major Non-Conformance"}
            </DialogTitle>
            <DialogDescription>
              {confirmType === "OBSERVATION"
                ? "Observations are noted for improvement opportunities but do not affect the audit score."
                : "This will create a formal finding that requires follow-up action."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="finding-description">
                {confirmType === "OBSERVATION" ? "Observation Details" : "Finding Description"}
              </Label>
              <Textarea
                id="finding-description"
                placeholder="Describe the finding in detail (minimum 10 characters)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="input-finding-description"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/10 minimum characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={confirmMutation.isPending || description.trim().length < 10}
              data-testid="btn-confirm-finding"
            >
              {confirmMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Suggestion</DialogTitle>
            <DialogDescription>
              You can optionally provide a reason for dismissing this suggestion.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dismiss-reason">Reason (optional)</Label>
              <Textarea
                id="dismiss-reason"
                placeholder="Why is this suggestion not applicable..."
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                rows={3}
                data-testid="input-dismiss-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDismissDialog(false);
                setDismissReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => dismissMutation.mutate(dismissReason || undefined)}
              disabled={dismissMutation.isPending}
              data-testid="btn-confirm-dismiss"
            >
              {dismissMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
