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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { FileEdit, Plus, ChevronRight, Search, FileText, Download, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportSingleToPDF, exportToExcel, formatDate, formatDateTime, type ExportColumn } from "@/lib/export-utils";

interface Policy {
  id: string;
  policyName: string;
  policyCategory: string;
  version: string;
  changeSummary: string;
  reasonForUpdate: string;
  approvalRequired: boolean;
  approvedByUserId?: string;
  approvalDate?: string;
  effectiveDate?: string;
  reviewDueDate: string;
  staffNotified: boolean;
  implementationNotes?: string;
  status: string;
  createdByUserId: string;
  createdAt: string;
}

interface CompanyUser { id: string; fullName: string; }

const POLICY_CATEGORIES = [
  { value: "GOVERNANCE", label: "Governance" },
  { value: "SAFEGUARDS", label: "Safeguards" },
  { value: "INCIDENT_MANAGEMENT", label: "Incident Management" },
  { value: "MEDICATION", label: "Medication" },
  { value: "RESTRICTIVE_PRACTICE", label: "Restrictive Practice" },
  { value: "PRIVACY", label: "Privacy" },
  { value: "WORKFORCE", label: "Workforce" },
  { value: "EMERGENCY", label: "Emergency" },
  { value: "OTHER", label: "Other" },
];

const POLICY_UPDATE_REASONS = [
  { value: "LEGISLATIVE_CHANGE", label: "Legislative Change" },
  { value: "INCIDENT", label: "Incident" },
  { value: "AUDIT_FINDING", label: "Audit Finding" },
  { value: "SCHEDULED_REVIEW", label: "Scheduled Review" },
  { value: "OTHER", label: "Other" },
];

const POLICY_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-700" },
  { value: "APPROVED", label: "Approved", color: "bg-blue-100 text-blue-700" },
  { value: "IMPLEMENTED", label: "Implemented", color: "bg-green-100 text-green-700" },
  { value: "ARCHIVED", label: "Archived", color: "bg-yellow-100 text-yellow-700" },
];

export default function PolicyUpdatePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const canEdit = user?.role === "CompanyAdmin" || user?.role === "Auditor" || user?.role === "Reviewer";
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Policy | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    policyName: "",
    policyCategory: "",
    version: "",
    changeSummary: "",
    reasonForUpdate: "",
    approvalRequired: true,
    reviewDueDate: "",
    effectiveDate: "",
    implementationNotes: "",
  });

  const { data: policies = [], isLoading } = useQuery<Policy[]>({
    queryKey: ["/api/company/registers/policies"],
    refetchInterval: 30000,
  });

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/company/users"],
  });

  const filteredPolicies = policies.filter((item) => {
    if (filterCategory !== "all" && item.policyCategory !== filterCategory) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.policyName.toLowerCase().includes(query) ||
      item.changeSummary.toLowerCase().includes(query) ||
      item.version.toLowerCase().includes(query)
    );
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create policy");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/policies"] });
      toast({ title: "Policy created successfully" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/policies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/policies"] });
      toast({ title: "Policy updated successfully" });
      setShowDetail(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ policyName: "", policyCategory: "", version: "", changeSummary: "", reasonForUpdate: "", approvalRequired: true, reviewDueDate: "", effectiveDate: "", implementationNotes: "" });
  };

  const handleSubmit = () => {
    if (!formData.policyName || !formData.policyCategory || !formData.version || !formData.changeSummary || !formData.reasonForUpdate || !formData.reviewDueDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...formData,
      reviewDueDate: new Date(formData.reviewDueDate).toISOString(),
      effectiveDate: formData.effectiveDate ? new Date(formData.effectiveDate).toISOString() : null,
      implementationNotes: formData.implementationNotes || null,
    });
  };

  const getStatusBadge = (status: string) => {
    const s = POLICY_STATUSES.find(x => x.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
  };

  const getApproverName = (userId?: string) => userId ? (companyUsers.find(x => x.id === userId)?.fullName || "Unknown") : "Pending";

  const policyColumns: ExportColumn[] = [
    { header: "Policy Name", key: "policyName" },
    { header: "Category", key: "policyCategory", format: (v) => POLICY_CATEGORIES.find(c => c.value === v)?.label || v },
    { header: "Version", key: "version" },
    { header: "Status", key: "status", format: (v) => POLICY_STATUSES.find(s => s.value === v)?.label || v },
    { header: "Reason for Update", key: "reasonForUpdate", format: (v) => POLICY_UPDATE_REASONS.find(r => r.value === v)?.label || v },
    { header: "Review Due", key: "reviewDueDate", format: (v) => formatDate(v) },
    { header: "Change Summary", key: "changeSummary" },
  ];

  const handleExportExcel = () => {
    exportToExcel(policyColumns, filteredPolicies, "policy_update_register", "Policies");
  };

  const handleExportPDF = () => {
    exportToPDF("Policy Update Register", policyColumns, filteredPolicies, "policy_update_register", {
      orientation: "landscape",
      subtitle: `${filteredPolicies.length} polic${filteredPolicies.length !== 1 ? "ies" : "y"} recorded`,
    });
  };

  const handleExportSinglePDF = (policy: Policy) => {
    const sections = [
      { label: "Policy Name", value: policy.policyName },
      { label: "Category", value: POLICY_CATEGORIES.find(c => c.value === policy.policyCategory)?.label || policy.policyCategory },
      { label: "Version", value: policy.version },
      { label: "Status", value: POLICY_STATUSES.find(s => s.value === policy.status)?.label || policy.status },
      { label: "Change Summary", value: policy.changeSummary },
      { label: "Reason for Update", value: POLICY_UPDATE_REASONS.find(r => r.value === policy.reasonForUpdate)?.label || policy.reasonForUpdate },
      { label: "Approval Required", value: policy.approvalRequired ? "Yes" : "No" },
      { label: "Approved By", value: getApproverName(policy.approvedByUserId) },
      { label: "Approval Date", value: policy.approvalDate ? formatDate(policy.approvalDate) : "-" },
      { label: "Effective Date", value: policy.effectiveDate ? formatDate(policy.effectiveDate) : "-" },
      { label: "Review Due Date", value: formatDate(policy.reviewDueDate) },
      { label: "Staff Notified", value: policy.staffNotified ? "Yes" : "No" },
      { label: "Implementation Notes", value: policy.implementationNotes || "-" },
    ];
    exportSingleToPDF("Policy Update Record", sections, `policy_${policy.id}`, {
      subtitle: `${policy.policyName} v${policy.version}`,
    });
  };

  return (
    <>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-[var(--radius)]">
              <FileEdit className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Policy Update Register</h1>
              <p className="text-muted-foreground text-sm">Track policy versions and updates</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-policy">
              <Plus className="h-4 w-4 mr-2" />
              New Policy Update
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search policies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {POLICY_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {POLICY_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredPolicies.length === 0} data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredPolicies.length === 0} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading policies...</div>
        ) : filteredPolicies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No policy updates recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Add a new policy update to start tracking.</p>
              {canEdit && (
                <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-add-first"><Plus className="h-4 w-4 mr-2" />Add First Policy</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPolicies.map((item) => (
              <Card key={item.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(item)} data-testid={`row-policy-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-[var(--radius)]">
                        <FileEdit className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.policyName} <span className="text-muted-foreground font-normal">v{item.version}</span></p>
                        <p className="text-sm text-muted-foreground">
                          {POLICY_CATEGORIES.find(c => c.value === item.policyCategory)?.label} • Review: {new Date(item.reviewDueDate).toLocaleDateString()}
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
            <DialogTitle>New Policy Update</DialogTitle>
            <DialogDescription>Record a policy update or new version.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Policy Name *</Label><Input value={formData.policyName} onChange={(e) => setFormData({...formData, policyName: e.target.value})} data-testid="input-name" /></div>
              <div><Label>Version *</Label><Input value={formData.version} onChange={(e) => setFormData({...formData, version: e.target.value})} placeholder="e.g., 1.2" data-testid="input-version" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.policyCategory} onValueChange={(v) => setFormData({...formData, policyCategory: v})}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{POLICY_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason for Update *</Label>
                <Select value={formData.reasonForUpdate} onValueChange={(v) => setFormData({...formData, reasonForUpdate: v})}>
                  <SelectTrigger data-testid="select-reason"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>{POLICY_UPDATE_REASONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Change Summary *</Label><Textarea value={formData.changeSummary} onChange={(e) => setFormData({...formData, changeSummary: e.target.value})} data-testid="input-summary" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Review Due Date *</Label><Input type="date" value={formData.reviewDueDate} onChange={(e) => setFormData({...formData, reviewDueDate: e.target.value})} data-testid="input-review-date" /></div>
              <div><Label>Effective Date</Label><Input type="date" value={formData.effectiveDate} onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.approvalRequired} onCheckedChange={(v) => setFormData({...formData, approvalRequired: v})} />
              <Label>Approval Required</Label>
            </div>
            <div><Label>Implementation Notes</Label><Textarea value={formData.implementationNotes} onChange={(e) => setFormData({...formData, implementationNotes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">{createMutation.isPending ? "Creating..." : "Create Policy"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{showDetail.policyName} v{showDetail.version}</DialogTitle>
                <DialogDescription>Policy details and workflow</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">{getStatusBadge(showDetail.status)}<Badge variant="outline">{POLICY_CATEGORIES.find(c => c.value === showDetail.policyCategory)?.label}</Badge></div>
                <div><Label className="text-muted-foreground text-sm">Reason for Update</Label><p className="text-foreground">{POLICY_UPDATE_REASONS.find(r => r.value === showDetail.reasonForUpdate)?.label}</p></div>
                <div><Label className="text-muted-foreground text-sm">Change Summary</Label><p className="text-foreground">{showDetail.changeSummary}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-sm">Review Due</Label><p className="text-foreground">{new Date(showDetail.reviewDueDate).toLocaleDateString()}</p></div>
                  <div><Label className="text-muted-foreground text-sm">Effective Date</Label><p className="text-foreground">{showDetail.effectiveDate ? new Date(showDetail.effectiveDate).toLocaleDateString() : "Not set"}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-sm">Approval Required</Label><p className="text-foreground">{showDetail.approvalRequired ? "Yes" : "No"}</p></div>
                  <div><Label className="text-muted-foreground text-sm">Approved By</Label><p className="text-foreground">{getApproverName(showDetail.approvedByUserId)}</p></div>
                </div>
                {showDetail.implementationNotes && (<div><Label className="text-muted-foreground text-sm">Implementation Notes</Label><p className="text-foreground">{showDetail.implementationNotes}</p></div>)}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => showDetail && handleExportSinglePDF(showDetail)} data-testid="button-export-single-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                {canEdit && showDetail.status !== "ARCHIVED" && (
                  <>
                    {showDetail.status === "DRAFT" && <Button variant="outline" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "APPROVED" } })}>Approve</Button>}
                    {showDetail.status === "APPROVED" && <Button variant="outline" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "IMPLEMENTED", staffNotified: true } })}>Mark Implemented</Button>}
                    <Button variant="secondary" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "ARCHIVED" } })}>Archive</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
