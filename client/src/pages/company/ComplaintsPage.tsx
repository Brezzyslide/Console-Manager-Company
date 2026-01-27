import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { 
  MessageSquareWarning, 
  Plus, 
  ChevronRight, 
  Filter,
  AlertTriangle,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Download,
  FileSpreadsheet
} from "lucide-react";
import { exportToPDF, exportSingleToPDF, exportToExcel, formatDate, formatDateTime, type ExportColumn } from "@/lib/export-utils";
interface WorkSite { id: string; name: string; }
interface Participant { id: string; firstName: string; lastName: string; }

interface Complaint {
  id: string;
  receivedAt: string;
  siteId?: string;
  participantId?: string;
  complainantType: string;
  complainantName?: string;
  complainantContact?: string;
  relationshipToParticipant?: string;
  isAnonymous: boolean;
  category: string;
  description: string;
  immediateRisk: boolean;
  immediateActionsTaken?: string;
  status: string;
  acknowledgedAt?: string;
  investigatorUserId?: string;
  actionsSummary?: string;
  outcomeSummary?: string;
  resolvedAt?: string;
  closedAt?: string;
  closureSatisfaction?: string;
  closureNotes?: string;
  externalNotificationRequired: boolean;
  externalBodies?: string[];
  externalOtherBodyText?: string;
  externalNotifiedAt?: string;
  externalReferenceNumber?: string;
  createdByUserId: string;
  createdAt: string;
}

const COMPLAINANT_TYPES = [
  { value: "PARTICIPANT", label: "Participant" },
  { value: "FAMILY", label: "Family Member" },
  { value: "NOMINEE_GUARDIAN", label: "Nominee/Guardian" },
  { value: "ADVOCATE", label: "Advocate" },
  { value: "STAFF", label: "Staff" },
  { value: "COMMUNITY", label: "Community Member" },
  { value: "ANONYMOUS", label: "Anonymous" },
  { value: "OTHER", label: "Other" },
];

const COMPLAINT_CATEGORIES = [
  { value: "SERVICE_DELIVERY", label: "Service Delivery" },
  { value: "STAFF_CONDUCT", label: "Staff Conduct" },
  { value: "MEDICATION", label: "Medication" },
  { value: "RESTRICTIVE_PRACTICE", label: "Restrictive Practice" },
  { value: "SAFETY_ENVIRONMENT", label: "Safety/Environment" },
  { value: "PRIVACY_CONFIDENTIALITY", label: "Privacy/Confidentiality" },
  { value: "FEES_BILLING", label: "Fees/Billing" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "RIGHTS_AND_DIGNITY", label: "Rights & Dignity" },
  { value: "OTHER", label: "Other" },
];

const COMPLAINT_STATUSES = [
  { value: "IN_PROGRESS", label: "In Progress", icon: Clock, color: "bg-blue-100 text-blue-700" },
  { value: "RESOLVED", label: "Resolved", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  { value: "CLOSED", label: "Closed", icon: XCircle, color: "bg-gray-100 text-gray-700" },
];

const EXTERNAL_BODIES = [
  { value: "POLICE", label: "Police" },
  { value: "NDIS_COMMISSION", label: "NDIS Commission" },
  { value: "SENIOR_PRACTITIONER", label: "Senior Practitioner" },
  { value: "OPA_GUARDIANSHIP", label: "OPA/Guardianship" },
  { value: "DHHS_CHILD_PROTECTION", label: "DHHS/Child Protection" },
  { value: "WORKSAFE", label: "WorkSafe" },
  { value: "OMBUDSMAN", label: "Ombudsman" },
  { value: "PUBLIC_HEALTH", label: "Public Health" },
  { value: "OTHER", label: "Other" },
];

const CLOSURE_SATISFACTIONS = [
  { value: "SATISFIED", label: "Satisfied" },
  { value: "DISSATISFIED", label: "Dissatisfied" },
];

export default function ComplaintsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useCompanyAuth();
  const isAdmin = user?.role === "CompanyAdmin" || user?.role === "Auditor";
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<Complaint | null>(null);
  const [showResolve, setShowResolve] = useState<Complaint | null>(null);
  const [showClose, setShowClose] = useState<Complaint | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const [formData, setFormData] = useState({
    receivedAt: new Date().toISOString().slice(0, 16),
    siteId: "",
    participantId: "",
    complainantType: "PARTICIPANT",
    complainantName: "",
    complainantContact: "",
    relationshipToParticipant: "",
    isAnonymous: false,
    category: "SERVICE_DELIVERY",
    description: "",
    immediateRisk: false,
    immediateActionsTaken: "",
    externalNotificationRequired: false,
    externalBodies: [] as string[],
    externalOtherBodyText: "",
    externalNotifiedAt: "",
    externalReferenceNumber: "",
  });

  const [resolveData, setResolveData] = useState({ outcomeSummary: "" });
  const [closeData, setCloseData] = useState({ closureSatisfaction: "SATISFIED", closureNotes: "" });

  const { data: workSites = [] } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
  });

  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
  });

  const { data: complaints = [], isLoading } = useQuery<Complaint[]>({
    queryKey: ["/api/company/registers/complaints", filterStatus, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterCategory !== "all") params.append("category", filterCategory);
      const res = await fetch(`/api/company/registers/complaints?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch complaints");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filteredComplaints = complaints.filter((complaint) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      complaint.description?.toLowerCase().includes(query) ||
      complaint.complainantName?.toLowerCase().includes(query) ||
      complaint.category?.toLowerCase().includes(query) ||
      complaint.outcomeSummary?.toLowerCase().includes(query) ||
      complaint.closureNotes?.toLowerCase().includes(query)
    );
  });

  const createComplaintMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create complaint");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/complaints"] });
      toast({ title: "Success", description: "Complaint recorded successfully" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record complaint", variant: "destructive" });
    },
  });

  const resolveComplaintMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/complaints/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to resolve complaint");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/complaints"] });
      toast({ title: "Success", description: "Complaint marked as resolved" });
      setShowResolve(null);
      setShowDetail(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to resolve complaint", variant: "destructive" });
    },
  });

  const closeComplaintMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/company/registers/complaints/${id}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to close complaint");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/complaints"] });
      toast({ title: "Success", description: "Complaint closed" });
      setShowClose(null);
      setShowDetail(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to close complaint", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      receivedAt: new Date().toISOString().slice(0, 16),
      siteId: "",
      participantId: "",
      complainantType: "PARTICIPANT",
      complainantName: "",
      complainantContact: "",
      relationshipToParticipant: "",
      isAnonymous: false,
      category: "SERVICE_DELIVERY",
      description: "",
      immediateRisk: false,
      immediateActionsTaken: "",
      externalNotificationRequired: false,
      externalBodies: [],
      externalOtherBodyText: "",
      externalNotifiedAt: "",
      externalReferenceNumber: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.description) {
      toast({ title: "Error", description: "Description is required", variant: "destructive" });
      return;
    }

    createComplaintMutation.mutate({
      receivedAt: new Date(formData.receivedAt).toISOString(),
      siteId: formData.siteId || null,
      participantId: formData.participantId || null,
      complainantType: formData.complainantType,
      complainantName: formData.complainantName || null,
      complainantContact: formData.complainantContact || null,
      relationshipToParticipant: formData.relationshipToParticipant || null,
      isAnonymous: formData.isAnonymous,
      category: formData.category,
      description: formData.description,
      immediateRisk: formData.immediateRisk,
      immediateActionsTaken: formData.immediateActionsTaken || null,
      externalNotificationRequired: formData.externalNotificationRequired,
      externalBodies: formData.externalBodies.length > 0 ? formData.externalBodies : null,
      externalOtherBodyText: formData.externalOtherBodyText || null,
      externalNotifiedAt: formData.externalNotifiedAt ? new Date(formData.externalNotifiedAt).toISOString() : null,
      externalReferenceNumber: formData.externalReferenceNumber || null,
    });
  };

  const getSiteName = (siteId?: string) => siteId ? workSites.find((s) => s.id === siteId)?.name || "Unknown" : "-";
  const getParticipantName = (pId?: string) => {
    if (!pId) return "-";
    const p = participants.find((p) => p.id === pId);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const s = COMPLAINT_STATUSES.find((st) => st.value === status);
    if (!s) return <Badge variant="secondary">{status}</Badge>;
    const Icon = s.icon;
    return <Badge className={s.color}><Icon className="h-3 w-3 mr-1" />{s.label}</Badge>;
  };

  const complaintColumns: ExportColumn[] = [
    { header: "Received", key: "receivedAt", format: (v) => formatDateTime(v) },
    { header: "Category", key: "category", format: (v) => COMPLAINT_CATEGORIES.find(c => c.value === v)?.label || v },
    { header: "Status", key: "status", format: (v) => COMPLAINT_STATUSES.find(s => s.value === v)?.label || v },
    { header: "Complainant Type", key: "complainantType", format: (v) => COMPLAINANT_TYPES.find(t => t.value === v)?.label || v },
    { header: "Description", key: "description" },
    { header: "Immediate Risk", key: "immediateRisk", format: (v) => v ? "Yes" : "No" },
    { header: "Outcome Summary", key: "outcomeSummary" },
    { header: "Resolved At", key: "resolvedAt", format: (v) => v ? formatDateTime(v) : "-" },
  ];

  const handleExportExcel = () => {
    exportToExcel(complaintColumns, filteredComplaints, "complaints_register", "Complaints");
  };

  const handleExportPDF = () => {
    exportToPDF("Complaints Register", complaintColumns, filteredComplaints, "complaints_register", {
      orientation: "landscape",
      subtitle: `${filteredComplaints.length} complaint${filteredComplaints.length !== 1 ? "s" : ""} recorded`,
    });
  };

  const handleExportSinglePDF = (complaint: Complaint) => {
    const sections = [
      { label: "Received At", value: formatDateTime(complaint.receivedAt) },
      { label: "Category", value: COMPLAINT_CATEGORIES.find(c => c.value === complaint.category)?.label || complaint.category },
      { label: "Status", value: COMPLAINT_STATUSES.find(s => s.value === complaint.status)?.label || complaint.status },
      { label: "Complainant Type", value: COMPLAINANT_TYPES.find(t => t.value === complaint.complainantType)?.label || complaint.complainantType },
      { label: "Complainant Name", value: complaint.complainantName || "-" },
      { label: "Anonymous", value: complaint.isAnonymous ? "Yes" : "No" },
      { label: "Description", value: complaint.description },
      { label: "Immediate Risk", value: complaint.immediateRisk ? "Yes" : "No" },
      { label: "Immediate Actions Taken", value: complaint.immediateActionsTaken || "-" },
      { label: "Actions Summary", value: complaint.actionsSummary || "-" },
      { label: "Outcome Summary", value: complaint.outcomeSummary || "-" },
      { label: "Resolved At", value: complaint.resolvedAt ? formatDateTime(complaint.resolvedAt) : "-" },
      { label: "Closed At", value: complaint.closedAt ? formatDateTime(complaint.closedAt) : "-" },
      { label: "Closure Satisfaction", value: complaint.closureSatisfaction ? CLOSURE_SATISFACTIONS.find(s => s.value === complaint.closureSatisfaction)?.label || complaint.closureSatisfaction : "-" },
      { label: "Closure Notes", value: complaint.closureNotes || "-" },
    ];
    exportSingleToPDF("Complaint Record", sections, `complaint_${complaint.id}`, {
      subtitle: `${COMPLAINT_CATEGORIES.find(c => c.value === complaint.category)?.label} - ${formatDateTime(complaint.receivedAt)}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-[var(--radius)]">
                <MessageSquareWarning className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Complaints Register</h1>
                <p className="text-muted-foreground text-sm">Record and manage complaints</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-complaint">
              <Plus className="h-4 w-4 mr-2" />
              New Complaint
            </Button>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search complaints..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {COMPLAINT_STATUSES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48" data-testid="filter-category"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {COMPLAINT_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredComplaints.length === 0} data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredComplaints.length === 0} data-testid="button-export-excel">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading complaints...</div>
          ) : filteredComplaints.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquareWarning className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No complaints recorded</h3>
                <p className="text-muted-foreground text-sm mb-4">Add a new complaint to start tracking.</p>
                <Button onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-first-complaint">
                  <Plus className="h-4 w-4 mr-2" />
                  Record First Complaint
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map((complaint) => (
                <Card key={complaint.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(complaint)} data-testid={`card-complaint-${complaint.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-[var(--radius)]">
                          <MessageSquareWarning className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{COMPLAINT_CATEGORIES.find(c => c.value === complaint.category)?.label}</p>
                            {complaint.immediateRisk && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Risk</Badge>}
                            {complaint.externalNotificationRequired && <Badge variant="outline" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />External</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(complaint.receivedAt).toLocaleDateString()} • {COMPLAINANT_TYPES.find(t => t.value === complaint.complainantType)?.label}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(complaint.status)}
                        {complaint.closureSatisfaction && (
                          <Badge variant={complaint.closureSatisfaction === "SATISFIED" ? "default" : "destructive"}>
                            {complaint.closureSatisfaction === "SATISFIED" ? "Satisfied" : "Dissatisfied"}
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="lg:w-80">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Complaints Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Recording Complaints</h4>
                <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Capture facts, avoid opinions</li>
                  <li>Record immediate risks and actions</li>
                  <li>Note if external notification needed</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Status Workflow</h4>
                <ul className="text-muted-foreground space-y-1 list-disc pl-4">
                  <li><strong>In Progress</strong>: Being investigated</li>
                  <li><strong>Resolved</strong>: Outcome determined</li>
                  <li><strong>Closed</strong>: Satisfaction recorded</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  External Notifications
                </h4>
                <p className="text-muted-foreground">Select external body and record reference number when required.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Record New Complaint</DialogTitle>
            <DialogDescription>Complete the details below to record a complaint.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Received Date/Time *</Label>
                  <Input type="datetime-local" value={formData.receivedAt} onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })} data-testid="input-received-at" />
                </div>
                <div className="space-y-2">
                  <Label>Work Site</Label>
                  <Select value={formData.siteId || "none"} onValueChange={(v) => setFormData({ ...formData, siteId: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="select-site"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {workSites.map((site) => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Participant</Label>
                  <Select value={formData.participantId || "none"} onValueChange={(v) => setFormData({ ...formData, participantId: v === "none" ? "" : v })}>
                    <SelectTrigger data-testid="select-participant"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {participants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Complainant Type *</Label>
                  <Select value={formData.complainantType} onValueChange={(v) => setFormData({ ...formData, complainantType: v, isAnonymous: v === "ANONYMOUS" })}>
                    <SelectTrigger data-testid="select-complainant-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLAINANT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.complainantType !== "ANONYMOUS" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Complainant Name</Label>
                    <Input value={formData.complainantName} onChange={(e) => setFormData({ ...formData, complainantName: e.target.value })} data-testid="input-complainant-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Details</Label>
                    <Input value={formData.complainantContact} onChange={(e) => setFormData({ ...formData, complainantContact: e.target.value })} data-testid="input-complainant-contact" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPLAINT_CATEGORIES.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} placeholder="Describe the complaint in detail..." data-testid="textarea-description" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-[var(--radius)] bg-red-50 border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <Label className="text-red-700">Immediate Risk?</Label>
                </div>
                <Switch checked={formData.immediateRisk} onCheckedChange={(v) => setFormData({ ...formData, immediateRisk: v })} data-testid="switch-immediate-risk" />
              </div>
              {formData.immediateRisk && (
                <div className="space-y-2">
                  <Label>Immediate Actions Taken *</Label>
                  <Textarea value={formData.immediateActionsTaken} onChange={(e) => setFormData({ ...formData, immediateActionsTaken: e.target.value })} rows={2} data-testid="textarea-immediate-actions" />
                </div>
              )}
              <div className="flex items-center justify-between p-3 border rounded-[var(--radius)]">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <Label>External Notification Required?</Label>
                </div>
                <Switch checked={formData.externalNotificationRequired} onCheckedChange={(v) => setFormData({ ...formData, externalNotificationRequired: v })} data-testid="switch-external-required" />
              </div>
              {formData.externalNotificationRequired && (
                <div className="space-y-4 pl-4 border-l-2 border-primary">
                  <div className="space-y-2">
                    <Label>External Bodies</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXTERNAL_BODIES.map((body) => (
                        <div key={body.value} className="flex items-center space-x-2">
                          <Checkbox 
                            checked={formData.externalBodies.includes(body.value)} 
                            onCheckedChange={(checked) => {
                              if (checked) setFormData({ ...formData, externalBodies: [...formData.externalBodies, body.value] });
                              else setFormData({ ...formData, externalBodies: formData.externalBodies.filter(b => b !== body.value) });
                            }}
                            data-testid={`checkbox-body-${body.value}`}
                          />
                          <Label className="text-sm">{body.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {formData.externalBodies.includes("OTHER") && (
                    <div className="space-y-2">
                      <Label>Other Body Name</Label>
                      <Input value={formData.externalOtherBodyText} onChange={(e) => setFormData({ ...formData, externalOtherBodyText: e.target.value })} data-testid="input-other-body" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notified Date</Label>
                      <Input type="datetime-local" value={formData.externalNotifiedAt} onChange={(e) => setFormData({ ...formData, externalNotifiedAt: e.target.value })} data-testid="input-notified-at" />
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input value={formData.externalReferenceNumber} onChange={(e) => setFormData({ ...formData, externalReferenceNumber: e.target.value })} data-testid="input-reference" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} data-testid="button-cancel-form">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createComplaintMutation.isPending} data-testid="button-save-complaint">
              {createComplaintMutation.isPending ? "Saving..." : "Save Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={(open) => !open && setShowDetail(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Complaint Details {showDetail && getStatusBadge(showDetail.status)}</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Received:</span> <span className="font-medium">{new Date(showDetail.receivedAt).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{COMPLAINT_CATEGORIES.find(c => c.value === showDetail.category)?.label}</span></div>
                  <div><span className="text-muted-foreground">Site:</span> <span className="font-medium">{getSiteName(showDetail.siteId)}</span></div>
                  <div><span className="text-muted-foreground">Participant:</span> <span className="font-medium">{getParticipantName(showDetail.participantId)}</span></div>
                  <div><span className="text-muted-foreground">Complainant:</span> <span className="font-medium">{COMPLAINANT_TYPES.find(t => t.value === showDetail.complainantType)?.label}</span></div>
                  {showDetail.complainantName && <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{showDetail.complainantName}</span></div>}
                </div>
                <div className="text-sm"><span className="text-muted-foreground">Description:</span><p className="mt-1 text-foreground whitespace-pre-wrap">{showDetail.description}</p></div>
                {showDetail.immediateRisk && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius)]">
                    <div className="flex items-center gap-2 text-red-700 font-medium"><AlertTriangle className="h-4 w-4" />Immediate Risk</div>
                    {showDetail.immediateActionsTaken && <p className="text-sm text-red-600 mt-1">{showDetail.immediateActionsTaken}</p>}
                  </div>
                )}
                {showDetail.externalNotificationRequired && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-[var(--radius)]">
                    <div className="flex items-center gap-2 text-blue-700 font-medium"><ExternalLink className="h-4 w-4" />External Notification Required</div>
                    {showDetail.externalBodies && showDetail.externalBodies.length > 0 && (
                      <p className="text-sm text-blue-600 mt-1">Bodies: {showDetail.externalBodies.map(b => EXTERNAL_BODIES.find(eb => eb.value === b)?.label || b).join(", ")}</p>
                    )}
                    {showDetail.externalReferenceNumber && <p className="text-sm text-blue-600">Ref: {showDetail.externalReferenceNumber}</p>}
                  </div>
                )}
                {showDetail.outcomeSummary && <div className="text-sm"><span className="text-muted-foreground">Outcome Summary:</span><p className="mt-1 text-foreground">{showDetail.outcomeSummary}</p></div>}
                {showDetail.closureNotes && <div className="text-sm"><span className="text-muted-foreground">Closure Notes:</span><p className="mt-1 text-foreground">{showDetail.closureNotes}</p></div>}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => showDetail && handleExportSinglePDF(showDetail)} data-testid="button-export-single-pdf">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" onClick={() => setShowDetail(null)} data-testid="button-close-detail">Close</Button>
            {isAdmin && showDetail?.status === "IN_PROGRESS" && (
              <Button onClick={() => { setShowResolve(showDetail); setResolveData({ outcomeSummary: "" }); }} data-testid="button-resolve">Mark Resolved</Button>
            )}
            {isAdmin && showDetail?.status === "RESOLVED" && (
              <Button onClick={() => { setShowClose(showDetail); setCloseData({ closureSatisfaction: "SATISFIED", closureNotes: "" }); }} data-testid="button-close-complaint">Close Complaint</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showResolve} onOpenChange={(open) => !open && setShowResolve(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Complaint</DialogTitle>
            <DialogDescription>Provide the outcome summary to mark this complaint as resolved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Outcome Summary *</Label>
              <Textarea value={resolveData.outcomeSummary} onChange={(e) => setResolveData({ outcomeSummary: e.target.value })} rows={4} placeholder="Describe the investigation outcome..." data-testid="textarea-outcome" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(null)}>Cancel</Button>
            <Button onClick={() => showResolve && resolveComplaintMutation.mutate({ id: showResolve.id, data: resolveData })} disabled={!resolveData.outcomeSummary || resolveComplaintMutation.isPending} data-testid="button-confirm-resolve">
              {resolveComplaintMutation.isPending ? "Saving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showClose} onOpenChange={(open) => !open && setShowClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Complaint</DialogTitle>
            <DialogDescription>Record the complainant's satisfaction and close this complaint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Closure Satisfaction *</Label>
              <RadioGroup value={closeData.closureSatisfaction} onValueChange={(v) => setCloseData({ ...closeData, closureSatisfaction: v })}>
                {CLOSURE_SATISFACTIONS.map((s) => (
                  <div key={s.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={s.value} id={`sat-${s.value}`} data-testid={`radio-satisfaction-${s.value}`} />
                    <Label htmlFor={`sat-${s.value}`}>{s.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Closure Notes</Label>
              <Textarea value={closeData.closureNotes} onChange={(e) => setCloseData({ ...closeData, closureNotes: e.target.value })} rows={3} placeholder="Optional notes on closure..." data-testid="textarea-closure-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(null)}>Cancel</Button>
            <Button onClick={() => showClose && closeComplaintMutation.mutate({ id: showClose.id, data: closeData })} disabled={closeComplaintMutation.isPending} data-testid="button-confirm-close">
              {closeComplaintMutation.isPending ? "Saving..." : "Close Complaint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
