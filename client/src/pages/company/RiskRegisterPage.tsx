import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { AlertTriangle, Plus, ChevronRight, Search, ShieldAlert, Download, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportSingleToPDF, exportToExcel, formatDate, formatDateTime, type ExportColumn } from "@/lib/export-utils";

interface Risk {
  id: string;
  riskTitle: string;
  riskDescription: string;
  riskCategory: string;
  scopeType: string;
  siteId?: string;
  participantId?: string;
  likelihood: string;
  consequence: string;
  riskRating: string;
  existingControls: string;
  additionalControlsRequired?: string;
  ownerUserId: string;
  reviewFrequency: string;
  nextReviewDate: string;
  status: string;
  closureNotes?: string;
  closedAt?: string;
  closedByUserId?: string;
  createdByUserId: string;
  createdAt: string;
}

interface WorkSite { id: string; name: string; }
interface Participant { id: string; firstName: string; lastName: string; }
interface CompanyUser { id: string; fullName: string; }

const RISK_CATEGORIES = [
  { value: "SAFETY", label: "Safety" },
  { value: "CLINICAL", label: "Clinical" },
  { value: "MEDICATION", label: "Medication" },
  { value: "BEHAVIOUR", label: "Behaviour" },
  { value: "WORKFORCE", label: "Workforce" },
  { value: "GOVERNANCE", label: "Governance" },
  { value: "INFORMATION_PRIVACY", label: "Information & Privacy" },
  { value: "FINANCIAL", label: "Financial" },
  { value: "ENVIRONMENTAL", label: "Environmental" },
  { value: "OTHER", label: "Other" },
];

const SCOPE_TYPES = [
  { value: "ORGANISATIONAL", label: "Organisation Wide" },
  { value: "SITE", label: "Site Specific" },
  { value: "PARTICIPANT", label: "Participant Specific" },
];

const RISK_LEVELS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const RISK_RATINGS = [
  { value: "LOW", label: "Low", color: "bg-green-100 text-green-700" },
  { value: "MEDIUM", label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "HIGH", label: "High", color: "bg-orange-100 text-orange-700" },
  { value: "EXTREME", label: "Extreme", color: "bg-red-100 text-red-700" },
];

const REVIEW_FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

const RISK_STATUSES = [
  { value: "OPEN", label: "Open", color: "bg-blue-100 text-blue-700" },
  { value: "MONITORING", label: "Monitoring", color: "bg-yellow-100 text-yellow-700" },
  { value: "CLOSED", label: "Closed", color: "bg-gray-100 text-gray-700" },
];

export default function RiskRegisterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const canEdit = user?.role === "CompanyAdmin" || user?.role === "Auditor" || user?.role === "Reviewer";
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Risk | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [exportFromDate, setExportFromDate] = useState<string>("");
  const [exportToDate, setExportToDate] = useState<string>("");
  const [filterRating, setFilterRating] = useState("all");

  const [formData, setFormData] = useState({
    riskTitle: "",
    riskDescription: "",
    riskCategory: "",
    scopeType: "ORGANISATIONAL",
    siteId: "",
    participantId: "",
    likelihood: "",
    consequence: "",
    riskRating: "",
    existingControls: "",
    additionalControlsRequired: "",
    ownerUserId: "",
    reviewFrequency: "QUARTERLY",
    nextReviewDate: "",
  });

  const { data: risks = [], isLoading } = useQuery<Risk[]>({
    queryKey: ["/api/company/registers/risks"],
    refetchInterval: 30000,
  });

  const { data: workSites = [] } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
  });

  const { data: companyUsers = [] } = useQuery<CompanyUser[]>({
    queryKey: ["/api/company/users"],
  });

  const filteredRisks = risks.filter((risk) => {
    if (filterCategory !== "all" && risk.riskCategory !== filterCategory) return false;
    if (filterStatus !== "all" && risk.status !== filterStatus) return false;
    if (filterRating !== "all" && risk.riskRating !== filterRating) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      risk.riskTitle.toLowerCase().includes(query) ||
      risk.riskDescription.toLowerCase().includes(query) ||
      risk.existingControls.toLowerCase().includes(query)
    );
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/risks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create risk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/risks"] });
      toast({ title: "Risk created successfully" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/risks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update risk");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/risks"] });
      toast({ title: "Risk updated successfully" });
      setShowDetail(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      riskTitle: "",
      riskDescription: "",
      riskCategory: "",
      scopeType: "ORGANISATIONAL",
      siteId: "",
      participantId: "",
      likelihood: "",
      consequence: "",
      riskRating: "",
      existingControls: "",
      additionalControlsRequired: "",
      ownerUserId: "",
      reviewFrequency: "QUARTERLY",
      nextReviewDate: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.riskTitle || !formData.riskDescription || !formData.riskCategory || 
        !formData.likelihood || !formData.consequence || !formData.riskRating ||
        !formData.existingControls || !formData.ownerUserId || !formData.nextReviewDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...formData,
      siteId: formData.siteId || null,
      participantId: formData.participantId || null,
      additionalControlsRequired: formData.additionalControlsRequired || null,
      nextReviewDate: new Date(formData.nextReviewDate).toISOString(),
    });
  };

  const getRatingBadge = (rating: string) => {
    const r = RISK_RATINGS.find(x => x.value === rating);
    return r ? (
      <Badge className={r.color}>{r.label}</Badge>
    ) : (
      <Badge variant="secondary">{rating}</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = RISK_STATUSES.find(x => x.value === status);
    return s ? (
      <Badge className={s.color}>{s.label}</Badge>
    ) : (
      <Badge variant="secondary">{status}</Badge>
    );
  };

  const riskColumns: ExportColumn[] = [
    { header: "Risk Title", key: "riskTitle" },
    { header: "Category", key: "riskCategory", format: (v) => RISK_CATEGORIES.find(c => c.value === v)?.label || v },
    { header: "Rating", key: "riskRating", format: (v) => RISK_RATINGS.find(r => r.value === v)?.label || v },
    { header: "Status", key: "status", format: (v) => RISK_STATUSES.find(s => s.value === v)?.label || v },
    { header: "Likelihood", key: "likelihood", format: (v) => RISK_LEVELS.find(l => l.value === v)?.label || v },
    { header: "Consequence", key: "consequence", format: (v) => RISK_LEVELS.find(l => l.value === v)?.label || v },
    { header: "Existing Controls", key: "existingControls" },
    { header: "Next Review", key: "nextReviewDate", format: (v) => formatDate(v) },
  ];

  const getDateFilteredData = () => {
    let data = filteredRisks;
    if (exportFromDate) {
      const from = new Date(exportFromDate);
      from.setHours(0, 0, 0, 0);
      data = data.filter(d => new Date(d.createdAt) >= from);
    }
    if (exportToDate) {
      const to = new Date(exportToDate);
      to.setHours(23, 59, 59, 999);
      data = data.filter(d => new Date(d.createdAt) <= to);
    }
    return data;
  };

  const handleExportExcel = () => {
    const exportData = getDateFilteredData().map(r => ({ ...r, ownerName: getOwnerName(r.ownerUserId) }));
    exportToExcel(riskColumns, exportData, "risk_register", "Risks");
  };

  const handleExportPDF = () => {
    const exportData = getDateFilteredData().map(r => ({ ...r, ownerName: getOwnerName(r.ownerUserId) }));
    const dateRange = exportFromDate || exportToDate 
      ? ` (${exportFromDate || "start"} to ${exportToDate || "now"})`
      : "";
    exportToPDF("Risk Register", riskColumns, exportData, "risk_register", {
      orientation: "landscape",
      subtitle: `${exportData.length} risk${exportData.length !== 1 ? "s" : ""} recorded${dateRange}`,
    });
  };

  const handleExportSinglePDF = (risk: Risk) => {
    const sections = [
      { label: "Risk Title", value: risk.riskTitle },
      { label: "Category", value: RISK_CATEGORIES.find(c => c.value === risk.riskCategory)?.label || risk.riskCategory },
      { label: "Description", value: risk.riskDescription },
      { label: "Scope", value: SCOPE_TYPES.find(s => s.value === risk.scopeType)?.label || risk.scopeType },
      { label: "Likelihood", value: RISK_LEVELS.find(l => l.value === risk.likelihood)?.label || risk.likelihood },
      { label: "Consequence", value: RISK_LEVELS.find(l => l.value === risk.consequence)?.label || risk.consequence },
      { label: "Risk Rating", value: RISK_RATINGS.find(r => r.value === risk.riskRating)?.label || risk.riskRating },
      { label: "Existing Controls", value: risk.existingControls },
      { label: "Additional Controls Required", value: risk.additionalControlsRequired || "-" },
      { label: "Owner", value: getOwnerName(risk.ownerUserId) },
      { label: "Review Frequency", value: REVIEW_FREQUENCIES.find(f => f.value === risk.reviewFrequency)?.label || risk.reviewFrequency },
      { label: "Next Review Date", value: formatDate(risk.nextReviewDate) },
      { label: "Status", value: RISK_STATUSES.find(s => s.value === risk.status)?.label || risk.status },
    ];
    exportSingleToPDF("Risk Record", sections, `risk_${risk.id}`, {
      subtitle: risk.riskTitle,
    });
  };

  const getOwnerName = (userId: string) => {
    const u = companyUsers.find(x => x.id === userId);
    return u?.fullName || "Unknown";
  };

  return (
    <>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-[var(--radius)]">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Risk Register</h1>
              <p className="text-muted-foreground text-sm">Identify, assess and manage organisational risks</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-risk">
              <Plus className="h-4 w-4 mr-2" />
              New Risk
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search risks..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {RISK_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-36" data-testid="filter-rating"><SelectValue placeholder="Rating" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              {RISK_RATINGS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {RISK_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">From:</Label>
              <Input type="date" value={exportFromDate} onChange={(e) => setExportFromDate(e.target.value)} className="w-32 h-8 text-sm" data-testid="input-export-from-date" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">To:</Label>
              <Input type="date" value={exportToDate} onChange={(e) => setExportToDate(e.target.value)} className="w-32 h-8 text-sm" data-testid="input-export-to-date" />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredRisks.length === 0} data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredRisks.length === 0} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading risks...</div>
        ) : filteredRisks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No risks recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Add a new risk to start tracking.</p>
              {canEdit && (
                <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-add-first-risk">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Risk
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRisks.map((risk) => (
              <Card key={risk.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(risk)} data-testid={`row-risk-${risk.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 rounded-[var(--radius)]">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{risk.riskTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          {RISK_CATEGORIES.find(c => c.value === risk.riskCategory)?.label} • Owner: {getOwnerName(risk.ownerUserId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRatingBadge(risk.riskRating)}
                      {getStatusBadge(risk.status)}
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
            <DialogTitle>New Risk</DialogTitle>
            <DialogDescription>Create a new risk entry in the register.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Risk Title *</Label>
              <Input value={formData.riskTitle} onChange={(e) => setFormData({...formData, riskTitle: e.target.value})} data-testid="input-risk-title" />
            </div>
            <div>
              <Label>Risk Description *</Label>
              <Textarea value={formData.riskDescription} onChange={(e) => setFormData({...formData, riskDescription: e.target.value})} data-testid="input-risk-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select value={formData.riskCategory} onValueChange={(v) => setFormData({...formData, riskCategory: v})}>
                  <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {RISK_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scope *</Label>
                <Select value={formData.scopeType} onValueChange={(v) => setFormData({...formData, scopeType: v})}>
                  <SelectTrigger data-testid="select-scope"><SelectValue placeholder="Select scope" /></SelectTrigger>
                  <SelectContent>
                    {SCOPE_TYPES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {formData.scopeType === "SITE" && (
              <div>
                <Label>Work Site</Label>
                <Select value={formData.siteId} onValueChange={(v) => setFormData({...formData, siteId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                  <SelectContent>
                    {workSites.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.scopeType === "PARTICIPANT" && (
              <div>
                <Label>Participant</Label>
                <Select value={formData.participantId} onValueChange={(v) => setFormData({...formData, participantId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select participant" /></SelectTrigger>
                  <SelectContent>
                    {participants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Likelihood *</Label>
                <Select value={formData.likelihood} onValueChange={(v) => setFormData({...formData, likelihood: v})}>
                  <SelectTrigger data-testid="select-likelihood"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Consequence *</Label>
                <Select value={formData.consequence} onValueChange={(v) => setFormData({...formData, consequence: v})}>
                  <SelectTrigger data-testid="select-consequence"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RISK_LEVELS.map((l) => (<SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk Rating *</Label>
                <Select value={formData.riskRating} onValueChange={(v) => setFormData({...formData, riskRating: v})}>
                  <SelectTrigger data-testid="select-rating"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RISK_RATINGS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Existing Controls *</Label>
              <Textarea value={formData.existingControls} onChange={(e) => setFormData({...formData, existingControls: e.target.value})} data-testid="input-existing-controls" />
            </div>
            <div>
              <Label>Additional Controls Required</Label>
              <Textarea value={formData.additionalControlsRequired} onChange={(e) => setFormData({...formData, additionalControlsRequired: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Risk Owner *</Label>
                <Select value={formData.ownerUserId} onValueChange={(v) => setFormData({...formData, ownerUserId: v})}>
                  <SelectTrigger data-testid="select-owner"><SelectValue placeholder="Select owner" /></SelectTrigger>
                  <SelectContent>
                    {companyUsers.map((u) => (<SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Review Frequency *</Label>
                <Select value={formData.reviewFrequency} onValueChange={(v) => setFormData({...formData, reviewFrequency: v})}>
                  <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_FREQUENCIES.map((f) => (<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Next Review Date *</Label>
              <Input type="date" value={formData.nextReviewDate} onChange={(e) => setFormData({...formData, nextReviewDate: e.target.value})} data-testid="input-review-date" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-risk">
              {createMutation.isPending ? "Creating..." : "Create Risk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{showDetail.riskTitle}</DialogTitle>
                <DialogDescription>Risk details and management options</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  {getRatingBadge(showDetail.riskRating)}
                  {getStatusBadge(showDetail.status)}
                  <Badge variant="outline">{RISK_CATEGORIES.find(c => c.value === showDetail.riskCategory)?.label}</Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Description</Label>
                  <p className="text-foreground">{showDetail.riskDescription}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Likelihood</Label>
                    <p className="text-foreground">{RISK_LEVELS.find(l => l.value === showDetail.likelihood)?.label}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Consequence</Label>
                    <p className="text-foreground">{RISK_LEVELS.find(l => l.value === showDetail.consequence)?.label}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Existing Controls</Label>
                  <p className="text-foreground">{showDetail.existingControls}</p>
                </div>
                {showDetail.additionalControlsRequired && (
                  <div>
                    <Label className="text-muted-foreground text-sm">Additional Controls Required</Label>
                    <p className="text-foreground">{showDetail.additionalControlsRequired}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Owner</Label>
                    <p className="text-foreground">{getOwnerName(showDetail.ownerUserId)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Next Review</Label>
                    <p className="text-foreground">{new Date(showDetail.nextReviewDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => showDetail && handleExportSinglePDF(showDetail)} data-testid="button-export-single-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                {canEdit && showDetail.status !== "CLOSED" && (
                  <>
                    <Button variant="outline" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "MONITORING" } })}>
                      Set to Monitoring
                    </Button>
                    <Button variant="destructive" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "CLOSED", closureNotes: "Closed via UI" } })}>
                      Close Risk
                    </Button>
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
