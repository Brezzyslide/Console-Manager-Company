import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, AlertCircle, Eye, Lock } from "lucide-react";
import { getAudit, getAuditRunner, getFindings, closeAudit } from "@/lib/company-api";
import { format } from "date-fns";

const ratingIcons: Record<string, any> = {
  CONFORMANCE: CheckCircle2,
  OBSERVATION: Eye,
  MINOR_NC: AlertTriangle,
  MAJOR_NC: AlertCircle,
};

const ratingColors: Record<string, string> = {
  CONFORMANCE: "text-green-500",
  OBSERVATION: "text-blue-500",
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
  
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState("");

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

  const closeMutation = useMutation({
    mutationFn: () => closeAudit(id!, closeReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
      setShowCloseDialog(false);
    },
  });

  const isLoading = auditLoading || runnerLoading;

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
    const counts = { CONFORMANCE: 0, OBSERVATION: 0, MINOR_NC: 0, MAJOR_NC: 0 };
    responses.forEach(r => {
      counts[r.rating]++;
    });
    return counts;
  };

  const ratingCounts = getRatingCounts();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-6">
        <div className="flex items-center gap-4">
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
          {format(new Date(audit?.scopeTimeFrom || ""), "MMM d, yyyy")} - {format(new Date(audit?.scopeTimeTo || ""), "MMM d, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-500">{ratingCounts.CONFORMANCE}</div>
            <div className="text-sm text-muted-foreground">Conformance</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{ratingCounts.OBSERVATION}</div>
            <div className="text-sm text-muted-foreground">Observations</div>
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Audit Responses</CardTitle>
          <CardDescription>All indicator assessments for this audit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {indicators.map((indicator, i) => {
              const response = responses.find(r => r.templateIndicatorId === indicator.id);
              const Icon = response ? ratingIcons[response.rating] : null;
              const colorClass = response ? ratingColors[response.rating] : "";
              
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
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {audit?.status === "IN_REVIEW" && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to Close Audit</h3>
                <p className="text-sm text-muted-foreground">
                  {requiresCloseReason 
                    ? `${openMajorFindings.length} open major finding(s) - a reason is required to close`
                    : "All findings can be addressed after closing"}
                </p>
              </div>
              <Button 
                onClick={() => setShowCloseDialog(true)}
                data-testid="button-close-audit"
              >
                Close Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {audit?.status === "CLOSED" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Audit Closed</span>
            </div>
            {audit.closeReason && (
              <p className="text-sm text-muted-foreground mt-2">Reason: {audit.closeReason}</p>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
