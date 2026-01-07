import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, AlertCircle, Calendar, User, FileText, FolderOpen } from "lucide-react";
import { 
  getFindings, 
  getFinding, 
  updateFinding, 
  getCompanyUsers, 
  requestEvidence,
  getFindingEvidence,
  type Finding, 
  type FindingStatus,
  type EvidenceType 
} from "@/lib/company-api";
import { format } from "date-fns";
import { useCompanyAuth } from "@/hooks/use-company-auth";

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

const statusColors: Record<FindingStatus, string> = {
  OPEN: "bg-red-500",
  UNDER_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

export default function FindingsRegisterPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  
  const [editForm, setEditForm] = useState({
    ownerCompanyUserId: "",
    dueDate: "",
    status: "" as FindingStatus | "",
  });
  
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: "" as EvidenceType | "",
    requestNote: "",
    dueDate: "",
  });

  const { data: findings, isLoading } = useQuery({
    queryKey: ["findings", statusFilter, severityFilter],
    queryFn: () => getFindings({
      status: statusFilter !== "all" ? statusFilter as FindingStatus : undefined,
      severity: severityFilter !== "all" ? severityFilter : undefined,
    }),
  });

  const { data: users } = useQuery({
    queryKey: ["companyUsers"],
    queryFn: getCompanyUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateFinding(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      setShowEditDialog(false);
      setSelectedFinding(null);
    },
  });

  const evidenceMutation = useMutation({
    mutationFn: ({ findingId, data }: { findingId: string; data: { evidenceType: EvidenceType; requestNote: string; dueDate?: string | null } }) => 
      requestEvidence(findingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidenceRequests"] });
      setShowEvidenceDialog(false);
      setEvidenceForm({ evidenceType: "", requestNote: "", dueDate: "" });
      navigate("/evidence");
    },
  });

  const handleEditFinding = (finding: Finding) => {
    setSelectedFinding(finding);
    setEditForm({
      ownerCompanyUserId: finding.ownerCompanyUserId || "",
      dueDate: finding.dueDate ? format(new Date(finding.dueDate), "yyyy-MM-dd") : "",
      status: finding.status,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedFinding) return;
    
    updateMutation.mutate({
      id: selectedFinding.id,
      updates: {
        ownerCompanyUserId: editForm.ownerCompanyUserId || null,
        dueDate: editForm.dueDate || null,
        status: editForm.status || undefined,
      },
    });
  };

  const getOwnerName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users?.find(u => u.id === userId);
    return user?.fullName || "Unknown";
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Findings Register</h1>
        <p className="text-muted-foreground">Track and manage audit findings</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40" data-testid="select-severity-filter">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="MINOR_NC">Minor NC</SelectItem>
            <SelectItem value="MAJOR_NC">Major NC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : findings?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No findings match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {findings?.map((finding) => (
            <Card 
              key={finding.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleEditFinding(finding)}
              data-testid={`card-finding-${finding.id}`}
            >
              <CardContent className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {finding.severity === "MAJOR_NC" ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                      <Badge variant={finding.severity === "MAJOR_NC" ? "destructive" : "default"}>
                        {finding.severity === "MAJOR_NC" ? "Major" : "Minor"}
                      </Badge>
                      <Badge className={statusColors[finding.status]}>{finding.status}</Badge>
                    </div>
                    <p className="text-sm line-clamp-2">{finding.findingText}</p>
                    <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {getOwnerName(finding.ownerCompanyUserId)}
                      </div>
                      {finding.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(finding.dueDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Finding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{selectedFinding?.findingText}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Owner</Label>
              <Select 
                value={editForm.ownerCompanyUserId} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, ownerCompanyUserId: v }))}
              >
                <SelectTrigger data-testid="select-owner">
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                data-testid="input-due-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={editForm.status} 
                onValueChange={(v) => setEditForm(prev => ({ ...prev, status: v as FindingStatus }))}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {updateMutation.error && (
            <p className="text-sm text-destructive">{(updateMutation.error as Error).message}</p>
          )}
          <DialogFooter className="sm:justify-between">
            <div>
              {selectedFinding?.status !== "CLOSED" && ["CompanyAdmin", "Auditor", "Reviewer"].includes(user?.role || "") && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    setShowEditDialog(false);
                    setShowEvidenceDialog(true);
                  }}
                  data-testid="button-request-evidence"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Request Evidence
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                data-testid="button-save-finding"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Evidence</DialogTitle>
            <DialogDescription>
              Request evidence to address this finding
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{selectedFinding?.findingText}</p>
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
                placeholder="Describe what evidence is needed and why..."
                data-testid="input-request-note"
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
          {evidenceMutation.error && (
            <p className="text-sm text-destructive">{(evidenceMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (!selectedFinding || !evidenceForm.evidenceType || !evidenceForm.requestNote) return;
                evidenceMutation.mutate({
                  findingId: selectedFinding.id,
                  data: {
                    evidenceType: evidenceForm.evidenceType as EvidenceType,
                    requestNote: evidenceForm.requestNote,
                    dueDate: evidenceForm.dueDate || null,
                  },
                });
              }}
              disabled={!evidenceForm.evidenceType || !evidenceForm.requestNote || evidenceMutation.isPending}
              data-testid="button-submit-evidence-request"
            >
              {evidenceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Request Evidence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
