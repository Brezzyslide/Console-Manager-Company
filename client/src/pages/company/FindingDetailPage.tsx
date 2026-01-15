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
  Calendar, 
  FileText,
  MessageSquare,
  Send,
  X,
  ExternalLink,
  Loader2,
  History,
  ShieldCheck,
  Link2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  getFindingDetail, 
  addFindingComment, 
  closeFinding,
  updateFinding,
  type FindingDetail,
  type FindingActivity
} from "@/lib/company-api";
import { useCompanyAuth } from "@/hooks/use-company-auth";

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
    mutationFn: (data: { closureNote: string; evidenceItemIds?: string[] }) => closeFinding(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findingDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      setShowCloseDialog(false);
      setClosureNote("");
      setSelectedEvidenceIds([]);
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

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleClose = () => {
    if (closureNote.trim().length < 10) {
      toast({ title: "Closure note too short", description: "Please provide at least 10 characters", variant: "destructive" });
      return;
    }
    closeMutation.mutate({ closureNote: closureNote.trim(), evidenceItemIds: selectedEvidenceIds.length > 0 ? selectedEvidenceIds : undefined });
  };

  const allEvidenceItems = finding?.evidenceRequests?.flatMap(req => req.items) || [];
  const canClose = ["CompanyAdmin", "Reviewer"].includes(user?.role || "");

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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Evidence Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finding.evidenceRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No evidence requests yet</p>
              ) : (
                <div className="space-y-3">
                  {finding.evidenceRequests.map(request => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{request.evidenceType}</Badge>
                        <Badge className={
                          request.status === "ACCEPTED" ? "bg-green-500" :
                          request.status === "SUBMITTED" ? "bg-blue-500" :
                          request.status === "REJECTED" ? "bg-red-500" :
                          "bg-yellow-500"
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm mt-2 text-muted-foreground">{request.requestNote}</p>
                      {request.items.length > 0 && (
                        <div className="mt-2 text-xs">
                          {request.items.length} item(s) submitted
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
    </div>
  );
}
