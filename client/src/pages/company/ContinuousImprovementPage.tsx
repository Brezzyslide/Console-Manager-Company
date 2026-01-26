import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { TrendingUp, Plus, ChevronRight, Search, Lightbulb } from "lucide-react";

interface Improvement {
  id: string;
  improvementTitle: string;
  source: string;
  relatedRegisterType?: string;
  relatedRecordId?: string;
  description: string;
  improvementActions: string;
  responsibleUserId: string;
  targetCompletionDate: string;
  status: string;
  outcomeSummary?: string;
  completedAt?: string;
  completedByUserId?: string;
  createdByUserId: string;
  createdAt: string;
}

interface CompanyUser { id: string; fullName: string; }

const IMPROVEMENT_SOURCES = [
  { value: "INCIDENT", label: "Incident" },
  { value: "COMPLAINT", label: "Complaint" },
  { value: "AUDIT", label: "Audit" },
  { value: "SELF_ASSESSMENT", label: "Self Assessment" },
  { value: "STAFF_FEEDBACK", label: "Staff Feedback" },
  { value: "PARTICIPANT_FEEDBACK", label: "Participant Feedback" },
  { value: "FAMILY_FEEDBACK", label: "Family Feedback" },
  { value: "OTHER", label: "Other" },
];

const IMPROVEMENT_STATUSES = [
  { value: "OPEN", label: "Open", color: "bg-blue-100 text-blue-700" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { value: "COMPLETED", label: "Completed", color: "bg-green-100 text-green-700" },
];

export default function ContinuousImprovementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const canEdit = user?.role === "CompanyAdmin" || user?.role === "Auditor" || user?.role === "Reviewer";
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Improvement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    improvementTitle: "",
    source: "",
    description: "",
    improvementActions: "",
    responsibleUserId: "",
    targetCompletionDate: "",
  });

  const { data: improvements = [], isLoading } = useQuery<Improvement[]>({
    queryKey: ["/api/company/registers/improvements"],
    refetchInterval: 30000,
  });

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/company/users"],
  });

  const filteredImprovements = improvements.filter((item) => {
    if (filterSource !== "all" && item.source !== filterSource) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.improvementTitle.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.improvementActions.toLowerCase().includes(query)
    );
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create improvement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/improvements"] });
      toast({ title: "Improvement created successfully" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/improvements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/improvements"] });
      toast({ title: "Improvement updated successfully" });
      setShowDetail(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ improvementTitle: "", source: "", description: "", improvementActions: "", responsibleUserId: "", targetCompletionDate: "" });
  };

  const handleSubmit = () => {
    if (!formData.improvementTitle || !formData.source || !formData.description || !formData.improvementActions || !formData.responsibleUserId || !formData.targetCompletionDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...formData,
      targetCompletionDate: new Date(formData.targetCompletionDate).toISOString(),
    });
  };

  const getStatusBadge = (status: string) => {
    const s = IMPROVEMENT_STATUSES.find(x => x.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
  };

  const getOwnerName = (userId: string) => companyUsers.find(x => x.id === userId)?.fullName || "Unknown";

  return (
    <>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-[var(--radius)]">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Continuous Improvement Register</h1>
              <p className="text-muted-foreground text-sm">Track improvement initiatives and outcomes</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-improvement">
              <Plus className="h-4 w-4 mr-2" />
              New Improvement
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search improvements..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search" />
          </div>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-40" data-testid="filter-source"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {IMPROVEMENT_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {IMPROVEMENT_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading improvements...</div>
        ) : filteredImprovements.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No improvements recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Add a new improvement initiative to start tracking.</p>
              {canEdit && (
                <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-add-first"><Plus className="h-4 w-4 mr-2" />Add First Improvement</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredImprovements.map((item) => (
              <Card key={item.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(item)} data-testid={`row-improvement-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-emerald-100 rounded-[var(--radius)]">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.improvementTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {IMPROVEMENT_SOURCES.find(s => s.value === item.source)?.label} • Due: {new Date(item.targetCompletionDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(item.status)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Improvement</DialogTitle>
            <DialogDescription>Create a new continuous improvement initiative.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Title *</Label><Input value={formData.improvementTitle} onChange={(e) => setFormData({...formData, improvementTitle: e.target.value})} data-testid="input-title" /></div>
            <div>
              <Label>Source *</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({...formData, source: v})}>
                <SelectTrigger data-testid="select-source"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{IMPROVEMENT_SOURCES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Description *</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} data-testid="input-description" /></div>
            <div><Label>Improvement Actions *</Label><Textarea value={formData.improvementActions} onChange={(e) => setFormData({...formData, improvementActions: e.target.value})} data-testid="input-actions" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsible Person *</Label>
                <Select value={formData.responsibleUserId} onValueChange={(v) => setFormData({...formData, responsibleUserId: v})}>
                  <SelectTrigger data-testid="select-owner"><SelectValue placeholder="Select person" /></SelectTrigger>
                  <SelectContent>{companyUsers.map((u) => (<SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Completion Date *</Label><Input type="date" value={formData.targetCompletionDate} onChange={(e) => setFormData({...formData, targetCompletionDate: e.target.value})} data-testid="input-date" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">{createMutation.isPending ? "Creating..." : "Create Improvement"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{showDetail.improvementTitle}</DialogTitle>
                <DialogDescription>Improvement details and actions</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">{getStatusBadge(showDetail.status)}<Badge variant="outline">{IMPROVEMENT_SOURCES.find(s => s.value === showDetail.source)?.label}</Badge></div>
                <div><Label className="text-muted-foreground text-sm">Description</Label><p className="text-foreground">{showDetail.description}</p></div>
                <div><Label className="text-muted-foreground text-sm">Improvement Actions</Label><p className="text-foreground">{showDetail.improvementActions}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-sm">Responsible</Label><p className="text-foreground">{getOwnerName(showDetail.responsibleUserId)}</p></div>
                  <div><Label className="text-muted-foreground text-sm">Target Date</Label><p className="text-foreground">{new Date(showDetail.targetCompletionDate).toLocaleDateString()}</p></div>
                </div>
                {showDetail.outcomeSummary && (<div><Label className="text-muted-foreground text-sm">Outcome Summary</Label><p className="text-foreground">{showDetail.outcomeSummary}</p></div>)}
              </div>
              {canEdit && showDetail.status !== "COMPLETED" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "IN_PROGRESS" } })}>Set In Progress</Button>
                  <Button onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "COMPLETED", outcomeSummary: "Completed via UI" } })}>Mark Complete</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
