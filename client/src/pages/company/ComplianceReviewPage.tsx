import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Loader2,
  Send,
  ChevronRight,
  Clock,
  FileText,
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WorkSite {
  id: string;
  name: string;
  status: string;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  status: string;
}

interface ComplianceTemplate {
  id: string;
  name: string;
  description?: string;
  scopeType: "SITE" | "PARTICIPANT";
  frequency: "DAILY" | "WEEKLY";
}

interface ComplianceTemplateItem {
  id: string;
  title: string;
  guidanceText?: string;
  responseType: "YES_NO_NA" | "NUMBER" | "TEXT" | "PHOTO_REQUIRED";
  isCritical: boolean;
  sortOrder: number;
}

interface ComplianceRun {
  id: string;
  status: "OPEN" | "SUBMITTED" | "LOCKED";
  periodStart: string;
  periodEnd: string;
}

interface ComplianceResponse {
  id: string;
  templateItemId: string;
  responseValue?: string;
  notes?: string;
}

interface ComplianceAction {
  id: string;
  title: string;
  description?: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  dueAt?: string;
  createdAt: string;
}

export default function ComplianceReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [frequency, setFrequency] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [scopeType, setScopeType] = useState<"SITE" | "PARTICIPANT">("SITE");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [localResponses, setLocalResponses] = useState<Record<string, { value?: string; notes?: string }>>({});
  const [submitResult, setSubmitResult] = useState<{ statusColor: string; actionsCreated: number } | null>(null);

  const scopeEntityId = scopeType === "SITE" ? selectedSiteId : selectedParticipantId;

  const { data: workSites = [] } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
  });

  const { data: templates = [] } = useQuery<ComplianceTemplate[]>({
    queryKey: ["/api/company/compliance-templates", { scopeType, frequency }],
    queryFn: async () => {
      const res = await fetch(`/api/company/compliance-templates?scopeType=${scopeType}&frequency=${frequency}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const { data: runData, isLoading: runLoading, refetch: refetchRun } = useQuery({
    queryKey: ["/api/company/compliance-runs", currentRunId],
    queryFn: async () => {
      if (!currentRunId) return null;
      const res = await fetch(`/api/company/compliance-runs/${currentRunId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch run");
      return res.json();
    },
    enabled: !!currentRunId,
  });

  const { data: existingRuns = [] } = useQuery<ComplianceRun[]>({
    queryKey: ["/api/company/compliance-runs", { scopeType, scopeEntityId, frequency }],
    queryFn: async () => {
      if (!scopeEntityId) return [];
      const params = new URLSearchParams();
      if (scopeType === "SITE") params.set("siteId", scopeEntityId);
      else params.set("participantId", scopeEntityId);
      const res = await fetch(`/api/company/compliance-runs?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json();
    },
    enabled: !!scopeEntityId,
  });

  const { data: actions = [], refetch: refetchActions } = useQuery<ComplianceAction[]>({
    queryKey: ["/api/company/compliance-actions", { scopeType, scopeEntityId }],
    queryFn: async () => {
      if (!scopeEntityId) return [];
      const params = new URLSearchParams();
      if (scopeType === "SITE") params.set("siteId", scopeEntityId);
      else params.set("participantId", scopeEntityId);
      const res = await fetch(`/api/company/compliance-actions?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch actions");
      return res.json();
    },
    enabled: !!scopeEntityId,
  });

  const createRunMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const body: any = { templateId };
      if (scopeType === "SITE") body.siteId = selectedSiteId;
      else body.participantId = selectedParticipantId;
      
      if (frequency === "DAILY") {
        body.date = selectedDate;
      } else {
        const start = startOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
        const end = endOfWeek(new Date(selectedDate), { weekStartsOn: 1 });
        body.periodStart = format(start, "yyyy-MM-dd");
        body.periodEnd = format(end, "yyyy-MM-dd");
      }
      
      const res = await fetch("/api/company/compliance-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      
      if (res.status === 409) {
        const data = await res.json();
        return { existing: true, runId: data.existingRunId };
      }
      if (!res.ok) throw new Error("Failed to create run");
      const data = await res.json();
      return { existing: false, runId: data.id };
    },
    onSuccess: (result) => {
      setCurrentRunId(result.runId);
      setSubmitResult(null);
      if (result.existing) {
        toast({ title: "Resuming existing run" });
      } else {
        toast({ title: "Started new compliance run" });
      }
    },
    onError: () => {
      toast({ title: "Failed to start run", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ templateItemId, responseValue, notes }: { templateItemId: string; responseValue?: string; notes?: string }) => {
      const res = await fetch(`/api/company/compliance-runs/${currentRunId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templateItemId, responseValue, notes }),
      });
      if (!res.ok) throw new Error("Failed to save response");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/company/compliance-runs/${currentRunId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: (result) => {
      setSubmitResult({ statusColor: result.statusColor, actionsCreated: result.actionsCreated });
      toast({ title: "Compliance run submitted" });
      refetchRun();
      refetchActions();
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to submit", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (runData?.responses) {
      const responseMap: Record<string, { value?: string; notes?: string }> = {};
      runData.responses.forEach((r: ComplianceResponse) => {
        responseMap[r.templateItemId] = { value: r.responseValue, notes: r.notes };
      });
      setLocalResponses(responseMap);
    }
  }, [runData]);

  const debouncedSave = useCallback(
    debounce((itemId: string, value?: string, notes?: string) => {
      if (currentRunId) {
        respondMutation.mutate({ templateItemId: itemId, responseValue: value, notes });
      }
    }, 500),
    [currentRunId]
  );

  const handleResponseChange = (itemId: string, value?: string, notes?: string) => {
    setLocalResponses((prev) => ({
      ...prev,
      [itemId]: { value: value ?? prev[itemId]?.value, notes: notes ?? prev[itemId]?.notes },
    }));
    debouncedSave(itemId, value ?? localResponses[itemId]?.value, notes ?? localResponses[itemId]?.notes);
  };

  const activeSites = workSites.filter((s) => s.status === "active");
  const activeParticipants = participants.filter((p) => p.status === "active");

  const selectedTemplate = templates[0];

  const handleStartRun = () => {
    if (!selectedTemplate) {
      toast({ title: "No template available for this selection", variant: "destructive" });
      return;
    }
    createRunMutation.mutate(selectedTemplate.id);
  };

  const run = runData?.run as ComplianceRun | undefined;
  const items = (runData?.items || []) as ComplianceTemplateItem[];

  const openActions = actions.filter((a) => a.status !== "CLOSED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-mixed flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          Compliance Review
        </h1>
        <p className="text-muted-foreground mt-2">Complete daily and weekly compliance checks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Check Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={frequency === "DAILY" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setFrequency("DAILY"); setCurrentRunId(null); setSubmitResult(null); }}
                      className={frequency === "DAILY" ? "gradient-primary text-white" : ""}
                      data-testid="button-frequency-daily"
                    >
                      Daily
                    </Button>
                    <Button
                      variant={frequency === "WEEKLY" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setFrequency("WEEKLY"); setCurrentRunId(null); setSubmitResult(null); }}
                      className={frequency === "WEEKLY" ? "gradient-primary text-white" : ""}
                      data-testid="button-frequency-weekly"
                    >
                      Weekly
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Scope</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={scopeType === "SITE" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setScopeType("SITE"); setCurrentRunId(null); setSubmitResult(null); }}
                      className={scopeType === "SITE" ? "gradient-secondary text-white" : ""}
                      data-testid="button-scope-site"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Site
                    </Button>
                    <Button
                      variant={scopeType === "PARTICIPANT" ? "default" : "outline"}
                      size="sm"
                      onClick={() => { setScopeType("PARTICIPANT"); setCurrentRunId(null); setSubmitResult(null); }}
                      className={scopeType === "PARTICIPANT" ? "gradient-secondary text-white" : ""}
                      data-testid="button-scope-participant"
                    >
                      <User className="h-4 w-4 mr-1" />
                      Participant
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {scopeType === "SITE" ? (
                  <div className="space-y-2">
                    <Label>Select Site</Label>
                    <Select value={selectedSiteId} onValueChange={(v) => { setSelectedSiteId(v); setCurrentRunId(null); setSubmitResult(null); }}>
                      <SelectTrigger data-testid="select-site">
                        <SelectValue placeholder="Choose a site..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeSites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Select Participant</Label>
                    <Select value={selectedParticipantId} onValueChange={(v) => { setSelectedParticipantId(v); setCurrentRunId(null); setSubmitResult(null); }}>
                      <SelectTrigger data-testid="select-participant">
                        <SelectValue placeholder="Choose a participant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeParticipants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.displayName || `${p.firstName} ${p.lastName}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setCurrentRunId(null); setSubmitResult(null); }}
                    data-testid="input-date"
                  />
                </div>
              </div>

              {scopeEntityId && selectedTemplate && !currentRunId && (
                <Button
                  onClick={handleStartRun}
                  disabled={createRunMutation.isPending}
                  className="w-full gradient-primary text-white"
                  data-testid="button-start-run"
                >
                  {createRunMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  Start {frequency.toLowerCase()} check for {selectedTemplate.name}
                </Button>
              )}

              {scopeEntityId && !selectedTemplate && (
                <div className="text-center py-4 text-muted-foreground">
                  No template configured for {scopeType.toLowerCase()} {frequency.toLowerCase()} checks
                </div>
              )}
            </CardContent>
          </Card>

          {currentRunId && runLoading && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          )}

          {currentRunId && run && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {runData?.template?.name}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(run.periodStart), "MMM d, yyyy")}
                    {run.periodEnd !== run.periodStart && ` - ${format(new Date(run.periodEnd), "MMM d, yyyy")}`}
                  </CardDescription>
                </div>
                <Badge variant={run.status === "OPEN" ? "outline" : "secondary"}>
                  {run.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {submitResult && (
                  <div className={`p-4 rounded-lg border ${
                    submitResult.statusColor === "green" ? "bg-green-500/10 border-green-500/30" :
                    submitResult.statusColor === "amber" ? "bg-yellow-500/10 border-yellow-500/30" :
                    "bg-red-500/10 border-red-500/30"
                  }`}>
                    <div className="flex items-center gap-2">
                      {submitResult.statusColor === "green" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : submitResult.statusColor === "amber" ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-semibold">
                        {submitResult.statusColor === "green" ? "All checks passed" :
                         submitResult.statusColor === "amber" ? "Minor issues found" :
                         "Critical issues found"}
                      </span>
                    </div>
                    {submitResult.actionsCreated > 0 && (
                      <p className="text-sm mt-1 text-muted-foreground">
                        {submitResult.actionsCreated} action{submitResult.actionsCreated > 1 ? "s" : ""} created
                      </p>
                    )}
                  </div>
                )}

                {items.map((item) => (
                  <div key={item.id} className={`p-4 rounded-lg border ${item.isCritical ? "border-red-500/30 bg-red-500/5" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.title}</span>
                          {item.isCritical && (
                            <Badge variant="destructive" className="text-xs">Critical</Badge>
                          )}
                        </div>
                        {item.guidanceText && (
                          <p className="text-sm text-muted-foreground mt-1">{item.guidanceText}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {item.responseType === "YES_NO_NA" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={localResponses[item.id]?.value === "YES" ? "default" : "outline"}
                              onClick={() => handleResponseChange(item.id, "YES")}
                              disabled={run.status !== "OPEN"}
                              className={localResponses[item.id]?.value === "YES" ? "bg-green-600 hover:bg-green-700" : ""}
                              data-testid={`button-yes-${item.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={localResponses[item.id]?.value === "NO" ? "default" : "outline"}
                              onClick={() => handleResponseChange(item.id, "NO")}
                              disabled={run.status !== "OPEN"}
                              className={localResponses[item.id]?.value === "NO" ? "bg-red-600 hover:bg-red-700" : ""}
                              data-testid={`button-no-${item.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={localResponses[item.id]?.value === "NA" ? "default" : "outline"}
                              onClick={() => handleResponseChange(item.id, "NA")}
                              disabled={run.status !== "OPEN"}
                              className={localResponses[item.id]?.value === "NA" ? "bg-gray-600 hover:bg-gray-700" : ""}
                              data-testid={`button-na-${item.id}`}
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {item.responseType === "NUMBER" && (
                          <Input
                            type="number"
                            value={localResponses[item.id]?.value || ""}
                            onChange={(e) => handleResponseChange(item.id, e.target.value)}
                            disabled={run.status !== "OPEN"}
                            className="w-24"
                            data-testid={`input-number-${item.id}`}
                          />
                        )}

                        {item.responseType === "TEXT" && (
                          <Textarea
                            value={localResponses[item.id]?.value || ""}
                            onChange={(e) => handleResponseChange(item.id, e.target.value)}
                            disabled={run.status !== "OPEN"}
                            className="w-48"
                            rows={2}
                            data-testid={`input-text-${item.id}`}
                          />
                        )}

                        {item.responseType === "PHOTO_REQUIRED" && (
                          <Button variant="outline" size="sm" disabled={run.status !== "OPEN"}>
                            Upload Photo
                          </Button>
                        )}
                      </div>
                    </div>

                    {run.status === "OPEN" && (
                      <div className="mt-2">
                        <Input
                          placeholder="Optional notes..."
                          value={localResponses[item.id]?.notes || ""}
                          onChange={(e) => handleResponseChange(item.id, undefined, e.target.value)}
                          className="text-sm"
                          data-testid={`input-notes-${item.id}`}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {run.status === "OPEN" && (
                  <Button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="w-full gradient-success text-white"
                    data-testid="button-submit-run"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Compliance Check
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Open Actions
              </CardTitle>
              <CardDescription>
                Follow-up items requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!scopeEntityId ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a site or participant to view actions
                </p>
              ) : openActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open actions
                </p>
              ) : (
                <div className="space-y-3">
                  {openActions.map((action) => (
                    <div
                      key={action.id}
                      className={`p-3 rounded-lg border ${
                        action.severity === "HIGH" ? "border-red-500/30 bg-red-500/5" :
                        action.severity === "MEDIUM" ? "border-yellow-500/30 bg-yellow-500/5" :
                        "border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{action.title}</p>
                          {action.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {action.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant={action.severity === "HIGH" ? "destructive" : "outline"}
                          className="text-xs flex-shrink-0"
                        >
                          {action.severity}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {action.status}
                        </Badge>
                        {action.dueAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Due {format(new Date(action.dueAt), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
