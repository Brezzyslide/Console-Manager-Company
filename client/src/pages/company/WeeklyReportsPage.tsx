import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Loader2,
  Sparkles,
  Calendar,
  User,
  Edit2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  status: string;
}

interface WeeklyReport {
  id: string;
  participantId: string;
  periodStart: string;
  periodEnd: string;
  reportText: string;
  reportStatus: "DRAFT" | "FINAL";
  generationSource: "AI" | "MANUAL";
  createdAt: string;
  updatedAt?: string;
}

export default function WeeklyReportsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingReport, setEditingReport] = useState<WeeklyReport | null>(null);
  const [editedText, setEditedText] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  
  const periodStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const periodEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/compliance/participants"],
  });
  
  const activeParticipants = participants.filter(p => p.status === "active");
  
  const { data: reports = [], isLoading: reportsLoading } = useQuery<WeeklyReport[]>({
    queryKey: ["/api/compliance/weekly-reports", { 
      participantId: selectedParticipant || undefined,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    }],
    enabled: true,
  });
  
  const generateMutation = useMutation({
    mutationFn: async (data: { participantId: string; periodStart: string; periodEnd: string }) => {
      const res = await fetch("/api/compliance/weekly-reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate report");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/weekly-reports"] });
      setShowGenerateDialog(false);
      toast({ title: "Report generated", description: "AI-generated weekly compliance report created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, reportText, reportStatus }: { id: string; reportText?: string; reportStatus?: string }) => {
      const res = await fetch(`/api/compliance/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reportText, reportStatus }),
      });
      if (!res.ok) throw new Error("Failed to update report");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/weekly-reports"] });
      setEditingReport(null);
      toast({ title: "Report updated", description: "Changes saved successfully" });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not save changes", variant: "destructive" });
    },
  });
  
  const handleGenerate = () => {
    if (!selectedParticipant) {
      toast({ title: "Select a participant", description: "Please select a participant first", variant: "destructive" });
      return;
    }
    generateMutation.mutate({
      participantId: selectedParticipant,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });
  };
  
  const handleSaveEdit = () => {
    if (!editingReport) return;
    updateMutation.mutate({ id: editingReport.id, reportText: editedText });
  };
  
  const handleFinalizeReport = (report: WeeklyReport) => {
    updateMutation.mutate({ id: report.id, reportStatus: "FINAL" });
  };
  
  const startEditing = (report: WeeklyReport) => {
    setEditingReport(report);
    setEditedText(report.reportText);
  };
  
  const getParticipantName = (participantId: string) => {
    const p = participants.find(p => p.id === participantId);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown";
  };
  
  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Weekly Compliance Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-generated participant compliance summaries with full traceability
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Generate Report</CardTitle>
          <CardDescription>
            Select a participant and week to generate an AI-powered compliance summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <Label className="text-sm mb-1 block">Participant</Label>
              <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                <SelectTrigger data-testid="select-participant">
                  <SelectValue placeholder="Select participant" />
                </SelectTrigger>
                <SelectContent>
                  {activeParticipants.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[200px]">
              <Label className="text-sm mb-1 block">Week</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  data-testid="btn-prev-week"
                >
                  <RefreshCw className="h-4 w-4 rotate-180" />
                </Button>
                <div className="px-3 py-2 border rounded-md text-sm bg-muted/30 min-w-[180px] text-center">
                  {format(periodStart, "MMM d")} - {format(periodEnd, "MMM d, yyyy")}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  data-testid="btn-next-week"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Button
              onClick={() => setShowGenerateDialog(true)}
              disabled={!selectedParticipant || generateMutation.isPending}
              className="gap-2"
              data-testid="btn-generate-report"
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate AI Report
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reports</CardTitle>
          <CardDescription>
            {reports.length} report(s) for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No reports for this period</p>
              <p className="text-sm mt-2">Select a participant and generate a new report</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map(report => (
                <div key={report.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getParticipantName(report.participantId)}</span>
                        <Badge variant={report.reportStatus === "FINAL" ? "default" : "outline"}>
                          {report.reportStatus}
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <Sparkles className="h-3 w-3" />
                          {report.generationSource}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(report.periodStart), "MMM d")} - {format(new Date(report.periodEnd), "MMM d, yyyy")}
                        </span>
                        <span>Created: {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    </div>
                    
                    {report.reportStatus === "DRAFT" && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(report)}
                          className="gap-1"
                          data-testid={`btn-edit-${report.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFinalizeReport(report)}
                          className="gap-1"
                          data-testid={`btn-finalize-${report.id}`}
                        >
                          <Check className="h-3 w-3" />
                          Finalize
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 p-4 bg-muted/30 rounded-md whitespace-pre-wrap text-sm">
                    {report.reportText}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate AI Report
            </DialogTitle>
            <DialogDescription>
              This will analyze compliance data from {format(periodStart, "MMM d")} to {format(periodEnd, "MMM d, yyyy")} 
              and generate a professional summary using AI.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              The AI will only summarize data from completed compliance checks. 
              It will not invent or assume any information not present in the data.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
              <p className="font-medium text-blue-800">Traceability Note</p>
              <p className="text-blue-700 mt-1">
                This generation will be logged with input hash, model name, and prompt version 
                for full auditability.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="gap-2">
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingReport} onOpenChange={(open) => !open && setEditingReport(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
            <DialogDescription>
              Make changes to the AI-generated report. The original will be preserved in audit logs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              data-testid="textarea-edit-report"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReport(null)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
