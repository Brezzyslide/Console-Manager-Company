import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}

interface Authorization {
  id: string;
  participantId: string;
  practiceType: string;
  authorizationStatus: string;
  approvalDate?: string;
  expiryDate?: string;
  behaviorSupportPlanRef?: string;
  conditionsOfUse?: string;
  reviewFrequencyDays?: number;
  notes?: string;
  createdAt: string;
}

interface UsageLog {
  id: string;
  participantId: string;
  authorizationId?: string;
  practiceType: string;
  isAuthorized: boolean;
  usageDate: string;
  durationMinutes?: number;
  reason: string;
  deescalationAttempts?: string;
  outcome?: string;
  witnessName?: string;
  notes?: string;
  createdAt: string;
}

interface DashboardData {
  totalAuthorizations: number;
  activeAuthorizations: number;
  pendingAuthorizations: number;
  expiringSoonCount: number;
  expiredCount: number;
  recentUsageCount: number;
  unauthorizedUsageCount: number;
  byPracticeType: Record<string, { authorized: number; recentUsage: number }>;
}

const PRACTICE_TYPES = [
  { value: "PHYSICAL_RESTRAINT", label: "Physical Restraint" },
  { value: "MECHANICAL_RESTRAINT", label: "Mechanical Restraint" },
  { value: "CHEMICAL_RESTRAINT", label: "Chemical Restraint" },
  { value: "SECLUSION", label: "Seclusion" },
  { value: "ENVIRONMENTAL_RESTRAINT", label: "Environmental Restraint" },
];

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  EXPIRED: "bg-red-100 text-red-800",
  REVOKED: "bg-gray-100 text-gray-800",
};

export default function RestrictivePracticesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedParticipant, setSelectedParticipant] = useState<string>("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showUsageDialog, setShowUsageDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  
  const [authForm, setAuthForm] = useState({
    participantId: "",
    practiceType: "",
    authorizationStatus: "PENDING",
    expiryDate: "",
    behaviorSupportPlanRef: "",
    conditionsOfUse: "",
    reviewFrequencyDays: "90",
    notes: "",
  });
  
  const [usageForm, setUsageForm] = useState({
    participantId: "",
    practiceType: "",
    isAuthorized: "true",
    usageDate: new Date().toISOString().slice(0, 16),
    durationMinutes: "",
    reason: "",
    deescalationAttempts: "",
    outcome: "",
    witnessName: "",
    notes: "",
  });
  
  const [reportForm, setReportForm] = useState({
    participantId: "",
    reportType: "PRACTICE_FOCUSED" as "PRACTICE_FOCUSED" | "PARTICIPANT_FOCUSED",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
  });
  
  const { data: participants = [] } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
  });
  
  const { data: dashboard, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/company/restrictive-practices/dashboard"],
  });
  
  const { data: authorizations = [], isLoading: authLoading } = useQuery<Authorization[]>({
    queryKey: ["/api/company/restrictive-practices/authorizations", { participantId: selectedParticipant || undefined }],
  });
  
  const { data: usageLogs = [], isLoading: logsLoading } = useQuery<UsageLog[]>({
    queryKey: ["/api/company/restrictive-practices/usage-logs", { participantId: selectedParticipant || undefined }],
  });
  
  const activeParticipants = participants.filter(p => p.status?.toLowerCase() === "active");
  
  const createAuthMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/restrictive-practices/authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create authorization");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/restrictive-practices"] });
      setShowAuthDialog(false);
      toast({ title: "Authorization created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const createUsageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/restrictive-practices/usage-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to log usage");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/restrictive-practices"] });
      setShowUsageDialog(false);
      toast({ title: "Usage logged successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const generateReportMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/restrictive-practices/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate report");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedReport(data);
      toast({ title: "Report generated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const handleCreateAuth = () => {
    createAuthMutation.mutate({
      ...authForm,
      expiryDate: authForm.expiryDate ? new Date(authForm.expiryDate).toISOString() : undefined,
      reviewFrequencyDays: authForm.reviewFrequencyDays ? parseInt(authForm.reviewFrequencyDays) : undefined,
    });
  };
  
  const handleLogUsage = () => {
    createUsageMutation.mutate({
      ...usageForm,
      isAuthorized: usageForm.isAuthorized === "true",
      usageDate: new Date(usageForm.usageDate).toISOString(),
      durationMinutes: usageForm.durationMinutes ? parseInt(usageForm.durationMinutes) : undefined,
    });
  };
  
  const handleGenerateReport = () => {
    generateReportMutation.mutate(reportForm);
  };
  
  const getParticipantName = (id: string) => {
    const p = participants.find(p => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : "Unknown";
  };
  
  const getPracticeLabel = (type: string) => {
    return PRACTICE_TYPES.find(p => p.value === type)?.label || type;
  };

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="restrictive-practices-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Restrictive Practices Register
          </h1>
          <p className="text-muted-foreground">Manage authorizations, log usage, and generate compliance reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReportDialog(true)} data-testid="button-generate-report">
            <Sparkles className="h-4 w-4 mr-2" />
            AI Report
          </Button>
          <Button variant="outline" onClick={() => {
            setUsageForm({ ...usageForm, participantId: selectedParticipant || "" });
            setShowUsageDialog(true);
          }} data-testid="button-log-usage">
            <Plus className="h-4 w-4 mr-2" />
            Log Usage
          </Button>
          <Button onClick={() => {
            setAuthForm({ ...authForm, participantId: selectedParticipant || "" });
            setShowAuthDialog(true);
          }} data-testid="button-add-authorization">
            <Plus className="h-4 w-4 mr-2" />
            Add Authorization
          </Button>
        </div>
      </div>
      
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{dashboard.activeAuthorizations}</div>
              <div className="text-sm text-muted-foreground">Active Authorizations</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{dashboard.pendingAuthorizations}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-600">{dashboard.expiringSoonCount}</div>
              <div className="text-sm text-muted-foreground">Expiring Soon</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{dashboard.expiredCount}</div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{dashboard.recentUsageCount}</div>
              <div className="text-sm text-muted-foreground">Usage (30 days)</div>
            </CardContent>
          </Card>
          <Card className={dashboard.unauthorizedUsageCount > 0 ? "border-red-300 bg-red-50" : ""}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{dashboard.unauthorizedUsageCount}</div>
              <div className="text-sm text-muted-foreground">Unauthorized</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{dashboard.totalAuthorizations}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <Label>Filter by Participant:</Label>
        <Select value={selectedParticipant || "all"} onValueChange={(v) => setSelectedParticipant(v === "all" ? "" : v)}>
          <SelectTrigger className="w-64" data-testid="select-participant-filter">
            <SelectValue placeholder="All Participants" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Participants</SelectItem>
            {activeParticipants.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="authorizations" className="w-full">
        <TabsList>
          <TabsTrigger value="authorizations">Authorizations</TabsTrigger>
          <TabsTrigger value="usage">Usage Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="authorizations">
          <Card>
            <CardHeader>
              <CardTitle>Restrictive Practice Authorizations</CardTitle>
              <CardDescription>Approved practices with expiry tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {authLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : authorizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No authorizations found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participant</TableHead>
                      <TableHead>Practice Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>BSP Reference</TableHead>
                      <TableHead>Conditions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorizations.map(auth => (
                      <TableRow key={auth.id} data-testid={`row-authorization-${auth.id}`}>
                        <TableCell className="font-medium">{getParticipantName(auth.participantId)}</TableCell>
                        <TableCell>{getPracticeLabel(auth.practiceType)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[auth.authorizationStatus]}>
                            {auth.authorizationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {auth.expiryDate ? format(new Date(auth.expiryDate), "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>{auth.behaviorSupportPlanRef || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{auth.conditionsOfUse || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>Usage Logs</CardTitle>
              <CardDescription>Record of all restrictive practice usage</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : usageLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No usage logs found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead>Practice Type</TableHead>
                      <TableHead>Authorized</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map(log => (
                      <TableRow key={log.id} className={!log.isAuthorized ? "bg-red-50" : ""} data-testid={`row-usage-${log.id}`}>
                        <TableCell>{format(new Date(log.usageDate), "dd MMM yyyy HH:mm")}</TableCell>
                        <TableCell className="font-medium">{getParticipantName(log.participantId)}</TableCell>
                        <TableCell>{getPracticeLabel(log.practiceType)}</TableCell>
                        <TableCell>
                          {log.isAuthorized ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.durationMinutes ? `${log.durationMinutes} min` : "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.reason}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.outcome || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Restrictive Practice Authorization</DialogTitle>
            <DialogDescription>Create a new authorization record for a participant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Participant</Label>
              <Select value={authForm.participantId} onValueChange={v => setAuthForm({...authForm, participantId: v})}>
                <SelectTrigger data-testid="select-auth-participant">
                  <SelectValue placeholder="Select participant" />
                </SelectTrigger>
                <SelectContent>
                  {activeParticipants.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Practice Type</Label>
              <Select value={authForm.practiceType} onValueChange={v => setAuthForm({...authForm, practiceType: v})}>
                <SelectTrigger data-testid="select-auth-practice-type">
                  <SelectValue placeholder="Select practice type" />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_TYPES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={authForm.authorizationStatus} onValueChange={v => setAuthForm({...authForm, authorizationStatus: v})}>
                <SelectTrigger data-testid="select-auth-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input type="date" value={authForm.expiryDate} onChange={e => setAuthForm({...authForm, expiryDate: e.target.value})} data-testid="input-auth-expiry" />
            </div>
            <div>
              <Label>Behavior Support Plan Reference</Label>
              <Input value={authForm.behaviorSupportPlanRef} onChange={e => setAuthForm({...authForm, behaviorSupportPlanRef: e.target.value})} placeholder="e.g., BSP-2024-001" data-testid="input-auth-bsp" />
            </div>
            <div>
              <Label>Conditions of Use</Label>
              <Textarea value={authForm.conditionsOfUse} onChange={e => setAuthForm({...authForm, conditionsOfUse: e.target.value})} placeholder="Specify conditions..." data-testid="input-auth-conditions" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={authForm.notes} onChange={e => setAuthForm({...authForm, notes: e.target.value})} data-testid="input-auth-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuthDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateAuth} disabled={!authForm.participantId || !authForm.practiceType || createAuthMutation.isPending} data-testid="button-submit-authorization">
              {createAuthMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Authorization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showUsageDialog} onOpenChange={setShowUsageDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Restrictive Practice Usage</DialogTitle>
            <DialogDescription>Record an instance of restrictive practice usage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Participant</Label>
              <Select value={usageForm.participantId} onValueChange={v => setUsageForm({...usageForm, participantId: v})}>
                <SelectTrigger data-testid="select-usage-participant">
                  <SelectValue placeholder="Select participant" />
                </SelectTrigger>
                <SelectContent>
                  {activeParticipants.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Practice Type</Label>
              <Select value={usageForm.practiceType} onValueChange={v => setUsageForm({...usageForm, practiceType: v})}>
                <SelectTrigger data-testid="select-usage-practice-type">
                  <SelectValue placeholder="Select practice type" />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_TYPES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Was this authorized?</Label>
              <Select value={usageForm.isAuthorized} onValueChange={v => setUsageForm({...usageForm, isAuthorized: v})}>
                <SelectTrigger data-testid="select-usage-authorized">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes - Authorized</SelectItem>
                  <SelectItem value="false">No - Unauthorized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={usageForm.usageDate} onChange={e => setUsageForm({...usageForm, usageDate: e.target.value})} data-testid="input-usage-date" />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={usageForm.durationMinutes} onChange={e => setUsageForm({...usageForm, durationMinutes: e.target.value})} placeholder="e.g., 15" data-testid="input-usage-duration" />
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea value={usageForm.reason} onChange={e => setUsageForm({...usageForm, reason: e.target.value})} placeholder="Why was the practice used?" data-testid="input-usage-reason" />
            </div>
            <div>
              <Label>De-escalation Attempts</Label>
              <Textarea value={usageForm.deescalationAttempts} onChange={e => setUsageForm({...usageForm, deescalationAttempts: e.target.value})} placeholder="What was tried before using the practice?" data-testid="input-usage-deescalation" />
            </div>
            <div>
              <Label>Outcome</Label>
              <Textarea value={usageForm.outcome} onChange={e => setUsageForm({...usageForm, outcome: e.target.value})} placeholder="What was the result?" data-testid="input-usage-outcome" />
            </div>
            <div>
              <Label>Witness Name</Label>
              <Input value={usageForm.witnessName} onChange={e => setUsageForm({...usageForm, witnessName: e.target.value})} data-testid="input-usage-witness" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUsageDialog(false)}>Cancel</Button>
            <Button onClick={handleLogUsage} disabled={!usageForm.participantId || !usageForm.practiceType || !usageForm.reason || createUsageMutation.isPending} data-testid="button-submit-usage">
              {createUsageMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Usage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showReportDialog} onOpenChange={(open) => { setShowReportDialog(open); if (!open) setGeneratedReport(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate AI Restrictive Practices Report
            </DialogTitle>
            <DialogDescription>Select a participant and report type to generate a compliance report</DialogDescription>
          </DialogHeader>
          
          {!generatedReport ? (
            <div className="space-y-4">
              <div>
                <Label>Participant</Label>
                <Select value={reportForm.participantId} onValueChange={v => setReportForm({...reportForm, participantId: v})}>
                  <SelectTrigger data-testid="select-report-participant">
                    <SelectValue placeholder="Select participant" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeParticipants.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Report Type</Label>
                <Select value={reportForm.reportType} onValueChange={v => setReportForm({...reportForm, reportType: v as any})}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRACTICE_FOCUSED">Practice-Focused Report</SelectItem>
                    <SelectItem value="PARTICIPANT_FOCUSED">Participant-Focused Report</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {reportForm.reportType === "PRACTICE_FOCUSED" 
                    ? "Focuses on the restrictive practices themselves - usage patterns, compliance, and recommendations by practice type."
                    : "Person-centered report focusing on the participant's experience, support needs, and reducing restrictive practice use."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={reportForm.startDate} onChange={e => setReportForm({...reportForm, startDate: e.target.value})} data-testid="input-report-start" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={reportForm.endDate} onChange={e => setReportForm({...reportForm, endDate: e.target.value})} data-testid="input-report-end" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateReport} disabled={!reportForm.participantId || generateReportMutation.isPending} data-testid="button-generate-report-submit">
                  {generateReportMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{generatedReport.participantName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {generatedReport.reportType === "PRACTICE_FOCUSED" ? "Practice-Focused Report" : "Participant-Focused Report"}
                    {" | "}
                    {format(new Date(generatedReport.period.startDate), "dd MMM yyyy")} - {format(new Date(generatedReport.period.endDate), "dd MMM yyyy")}
                  </p>
                </div>
                <Badge variant="outline">AI Generated</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">{generatedReport.usageSummary.totalInstances}</div>
                  <div className="text-sm text-muted-foreground">Total Instances</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{generatedReport.usageSummary.authorizedInstances}</div>
                  <div className="text-sm text-muted-foreground">Authorized</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{generatedReport.usageSummary.unauthorizedInstances}</div>
                  <div className="text-sm text-muted-foreground">Unauthorized</div>
                </div>
              </div>
              
              <div className="prose prose-sm max-w-none p-4 bg-white border rounded-lg whitespace-pre-wrap" data-testid="text-report-content">
                {generatedReport.content}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setGeneratedReport(null)}>Generate Another</Button>
                <Button onClick={() => setShowReportDialog(false)}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
