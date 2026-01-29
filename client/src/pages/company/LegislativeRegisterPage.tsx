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
import { Scale, Plus, ChevronRight, Search, BookOpen, Download, FileSpreadsheet } from "lucide-react";
import { exportToPDF, exportSingleToPDF, exportToExcel, formatDate, formatDateTime, type ExportColumn } from "@/lib/export-utils";

interface LegislativeItem {
  id: string;
  legislationName: string;
  jurisdiction: string;
  authority: string;
  description: string;
  applicableTo: string;
  lastReviewedDate?: string;
  reviewNotes?: string;
  linkedPolicies?: string[];
  status: string;
  createdAt: string;
}

const JURISDICTIONS = [
  { value: "FEDERAL", label: "Federal" },
  { value: "STATE", label: "State" },
];

const APPLICABILITY = [
  { value: "ALL_PROVIDERS", label: "All Providers" },
  { value: "SIL_ONLY", label: "SIL Only" },
  { value: "BEHAVIOUR_SUPPORT", label: "Behaviour Support" },
  { value: "MEDICATION", label: "Medication" },
  { value: "WORKFORCE", label: "Workforce" },
];

const STATUSES = [
  { value: "CURRENT", label: "Current", color: "bg-green-100 text-green-700" },
  { value: "UNDER_REVIEW", label: "Under Review", color: "bg-yellow-100 text-yellow-700" },
  { value: "SUPERSEDED", label: "Superseded", color: "bg-gray-100 text-gray-700" },
];

export default function LegislativeRegisterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const canEdit = user?.role === "CompanyAdmin" || user?.role === "Auditor";
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<LegislativeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJurisdiction, setFilterJurisdiction] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [exportFromDate, setExportFromDate] = useState<string>("");
  const [exportToDate, setExportToDate] = useState<string>("");

  const [formData, setFormData] = useState({
    legislationName: "",
    jurisdiction: "FEDERAL",
    authority: "",
    description: "",
    applicableTo: "ALL_PROVIDERS",
  });

  const { data: items = [], isLoading } = useQuery<LegislativeItem[]>({
    queryKey: ["/api/company/registers/legislative"],
    refetchInterval: 30000,
  });

  const filteredItems = items.filter((item) => {
    if (filterJurisdiction !== "all" && item.jurisdiction !== filterJurisdiction) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.legislationName.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.authority.toLowerCase().includes(query)
    );
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/legislative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/legislative"] });
      toast({ title: "Legislation added successfully" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/legislative/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/legislative"] });
      toast({ title: "Legislation updated successfully" });
      setShowDetail(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ legislationName: "", jurisdiction: "FEDERAL", authority: "", description: "", applicableTo: "ALL_PROVIDERS" });
  };

  const handleSubmit = () => {
    if (!formData.legislationName || !formData.authority || !formData.description) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const s = STATUSES.find(x => x.value === status);
    return s ? <Badge className={s.color}>{s.label}</Badge> : <Badge variant="secondary">{status}</Badge>;
  };

  const legislativeColumns: ExportColumn[] = [
    { header: "Legislation Name", key: "legislationName" },
    { header: "Jurisdiction", key: "jurisdiction", format: (v) => JURISDICTIONS.find(j => j.value === v)?.label || v },
    { header: "Authority", key: "authority" },
    { header: "Applicable To", key: "applicableTo", format: (v) => APPLICABILITY.find(a => a.value === v)?.label || v },
    { header: "Status", key: "status", format: (v) => STATUSES.find(s => s.value === v)?.label || v },
    { header: "Last Reviewed", key: "lastReviewedDate", format: (v) => v ? formatDate(v) : "-" },
    { header: "Description", key: "description" },
  ];

  const getDateFilteredData = () => {
    let data = filteredItems;
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
    exportToExcel(legislativeColumns, getDateFilteredData(), "legislative_register", "Legislation");
  };

  const handleExportPDF = () => {
    const exportData = getDateFilteredData();
    const dateRange = exportFromDate || exportToDate 
      ? ` (${exportFromDate || "start"} to ${exportToDate || "now"})`
      : "";
    exportToPDF("Legislative Register", legislativeColumns, exportData, "legislative_register", {
      orientation: "landscape",
      subtitle: `${exportData.length} legislation item${exportData.length !== 1 ? "s" : ""} recorded${dateRange}`,
    });
  };

  const handleExportSinglePDF = (item: LegislativeItem) => {
    const sections = [
      { label: "Legislation Name", value: item.legislationName },
      { label: "Jurisdiction", value: JURISDICTIONS.find(j => j.value === item.jurisdiction)?.label || item.jurisdiction },
      { label: "Authority", value: item.authority },
      { label: "Applicable To", value: APPLICABILITY.find(a => a.value === item.applicableTo)?.label || item.applicableTo },
      { label: "Status", value: STATUSES.find(s => s.value === item.status)?.label || item.status },
      { label: "Description", value: item.description },
      { label: "Last Reviewed", value: item.lastReviewedDate ? formatDate(item.lastReviewedDate) : "-" },
      { label: "Review Notes", value: item.reviewNotes || "-" },
      { label: "Linked Policies", value: item.linkedPolicies?.join(", ") || "-" },
    ];
    exportSingleToPDF("Legislative Record", sections, `legislation_${item.id}`, {
      subtitle: item.legislationName,
    });
  };

  return (
    <>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-[var(--radius)]">
              <Scale className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Legislative Register</h1>
              <p className="text-muted-foreground text-sm">Track applicable legislation and compliance requirements</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-legislation">
              <Plus className="h-4 w-4 mr-2" />
              Add Legislation
            </Button>
          )}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search legislation..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search" />
          </div>
          <Select value={filterJurisdiction} onValueChange={setFilterJurisdiction}>
            <SelectTrigger className="w-36" data-testid="filter-jurisdiction"><SelectValue placeholder="Jurisdiction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jurisdictions</SelectItem>
              {JURISDICTIONS.map((j) => (<SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
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
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredItems.length === 0} data-testid="button-export-pdf">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredItems.length === 0} data-testid="button-export-excel">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading legislation...</div>
        ) : filteredItems.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No legislation recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">NDIS legislation will be auto-populated on first load.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(item)} data-testid={`row-legislation-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-100 rounded-[var(--radius)]">
                        <Scale className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.legislationName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.authority} • {JURISDICTIONS.find(j => j.value === item.jurisdiction)?.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{APPLICABILITY.find(a => a.value === item.applicableTo)?.label}</Badge>
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
            <DialogTitle>Add Legislation</DialogTitle>
            <DialogDescription>Add a new piece of legislation to the register.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Legislation Name *</Label><Input value={formData.legislationName} onChange={(e) => setFormData({...formData, legislationName: e.target.value})} data-testid="input-name" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jurisdiction *</Label>
                <Select value={formData.jurisdiction} onValueChange={(v) => setFormData({...formData, jurisdiction: v})}>
                  <SelectTrigger data-testid="select-jurisdiction"><SelectValue /></SelectTrigger>
                  <SelectContent>{JURISDICTIONS.map((j) => (<SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label>Authority *</Label><Input value={formData.authority} onChange={(e) => setFormData({...formData, authority: e.target.value})} placeholder="e.g., NDIS Commission" data-testid="input-authority" /></div>
            </div>
            <div><Label>Description *</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} data-testid="input-description" /></div>
            <div>
              <Label>Applicable To *</Label>
              <Select value={formData.applicableTo} onValueChange={(v) => setFormData({...formData, applicableTo: v})}>
                <SelectTrigger data-testid="select-applicability"><SelectValue /></SelectTrigger>
                <SelectContent>{APPLICABILITY.map((a) => (<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit">{createMutation.isPending ? "Adding..." : "Add Legislation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {showDetail && (
            <>
              <DialogHeader>
                <DialogTitle>{showDetail.legislationName}</DialogTitle>
                <DialogDescription>Legislative details and review status</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  {getStatusBadge(showDetail.status)}
                  <Badge variant="outline">{JURISDICTIONS.find(j => j.value === showDetail.jurisdiction)?.label}</Badge>
                  <Badge variant="outline">{APPLICABILITY.find(a => a.value === showDetail.applicableTo)?.label}</Badge>
                </div>
                <div><Label className="text-muted-foreground text-sm">Authority</Label><p className="text-foreground">{showDetail.authority}</p></div>
                <div><Label className="text-muted-foreground text-sm">Description</Label><p className="text-foreground">{showDetail.description}</p></div>
                {showDetail.lastReviewedDate && (
                  <div><Label className="text-muted-foreground text-sm">Last Reviewed</Label><p className="text-foreground">{new Date(showDetail.lastReviewedDate).toLocaleDateString()}</p></div>
                )}
                {showDetail.reviewNotes && (
                  <div><Label className="text-muted-foreground text-sm">Review Notes</Label><p className="text-foreground">{showDetail.reviewNotes}</p></div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => showDetail && handleExportSinglePDF(showDetail)} data-testid="button-export-single-pdf">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                {canEdit && showDetail.status !== "SUPERSEDED" && (
                  <>
                    <Button variant="outline" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { lastReviewedDate: new Date().toISOString(), status: "CURRENT" } })}>
                      Mark as Reviewed
                    </Button>
                    <Button variant="secondary" onClick={() => updateMutation.mutate({ id: showDetail.id, data: { status: "SUPERSEDED" } })}>
                      Mark Superseded
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
