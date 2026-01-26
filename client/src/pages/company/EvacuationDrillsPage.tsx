import { useState, useEffect, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Flame, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ChevronRight, 
  Eye, 
  Edit,
  AlertTriangle,
  FileText,
  Users,
  Search
} from "lucide-react";
interface WorkSite {
  id: string;
  name: string;
  address: string;
}

interface EvacuationDrill {
  id: string;
  dateOfDrill: string;
  siteId: string;
  drillType: string;
  assemblyPoint?: string;
  wardenFirstName: string;
  wardenLastName: string;
  totalPeoplePresent: number;
  staffInitialsPresent: string;
  clientInitialsPresent: string;
  participantActivelyInvolved: boolean;
  ifNotInvolvedReason?: string;
  ifNotInvolvedOtherText?: string;
  involvementRating: string;
  improvementNotes: string;
  completedByUserId: string;
  createdAt: string;
}

const DRILL_STEPS = [
  { id: 1, title: "Warden allocated", description: "Manager allocates warden; staff follow warden instructions" },
  { id: 2, title: "Choose assembly point", description: "Warden selects the assembly point for evacuation" },
  { id: 3, title: "Take evacuation pack", description: "Warden takes the evacuation pack with essential items" },
  { id: 4, title: "Conduct head count", description: "Count all occupants before the drill begins" },
  { id: 5, title: "Prompt occupants to prepare", description: "Notify everyone to prepare for the drill" },
  { id: 6, title: "Prepare workplace", description: "Secure any hazardous materials and equipment" },
  { id: 7, title: "Check doors", description: "Check doors for heat before opening, guide occupants" },
  { id: 8, title: "Assist those in danger", description: "Provide assistance to those who need help evacuating" },
  { id: 9, title: "Use nearest safe route", description: "Guide everyone via the nearest safe evacuation route" },
  { id: 10, title: "Obey warden instructions", description: "Ensure everyone follows warden directions" },
  { id: 11, title: "Move calmly to assembly point", description: "Proceed to the assembly point in an orderly manner" },
  { id: 12, title: "Wait for all clear", description: "Wait at assembly point until all clear is given" },
];

const FIRE_INSTRUCTIONS = [
  "If FIRE detected: Call 000 immediately",
  "Then contact MH&R after hours line if applicable",
  "Follow safe evacuation steps and assist others",
  "After drill: Record in communication book and complete this register"
];

const DRILL_TYPES = [
  { value: "FIRE", label: "Fire Drill" },
  { value: "BOMB_THREAT", label: "Bomb Threat" },
  { value: "OTHER", label: "Other Emergency" },
];

const NOT_INVOLVED_REASONS = [
  { value: "DYSREGULATED", label: "Dysregulated" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "DISENGAGED_FROM_SUPPORT", label: "Disengaged from support" },
  { value: "NOT_MOTIVATED", label: "Not motivated to participate" },
  { value: "OTHER", label: "Other" },
];

const INVOLVEMENT_RATINGS = [
  { value: "SATISFACTORY", label: "Satisfactory" },
  { value: "NOT_SATISFACTORY", label: "Not satisfactory" },
  { value: "REFUSED_TO_PARTICIPATE", label: "Refused to participate" },
];

export default function EvacuationDrillsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showWizard, setShowWizard] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<EvacuationDrill | null>(null);
  const [wizardDrillType, setWizardDrillType] = useState<string>("FIRE");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDrillType, setFilterDrillType] = useState<string>("all");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [formData, setFormData] = useState({
    dateOfDrill: new Date().toISOString().split("T")[0],
    siteId: "",
    drillType: "FIRE",
    assemblyPoint: "",
    wardenFirstName: "",
    wardenLastName: "",
    totalPeoplePresent: "",
    staffInitialsPresent: "",
    clientInitialsPresent: "",
    participantActivelyInvolved: true,
    ifNotInvolvedReason: "",
    ifNotInvolvedOtherText: "",
    involvementRating: "SATISFACTORY",
    improvementNotes: "",
  });

  const { data: workSites = [] } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
  });

  const { data: drills = [], isLoading } = useQuery<EvacuationDrill[]>({
    queryKey: ["/api/company/registers/evacuation-drills"],
    refetchInterval: 30000,
  });

  const filteredDrills = drills.filter((drill) => {
    if (filterDrillType !== "all" && drill.drillType !== filterDrillType) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const siteName = workSites.find(s => s.id === drill.siteId)?.name || "";
    return (
      drill.wardenFirstName?.toLowerCase().includes(query) ||
      drill.wardenLastName?.toLowerCase().includes(query) ||
      drill.improvementNotes?.toLowerCase().includes(query) ||
      drill.assemblyPoint?.toLowerCase().includes(query) ||
      siteName.toLowerCase().includes(query)
    );
  });

  const createDrillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/company/registers/evacuation-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create drill");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/registers/evacuation-drills"] });
      toast({ title: "Success", description: "Evacuation drill record saved" });
      setShowForm(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save drill", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetForm = () => {
    setFormData({
      dateOfDrill: new Date().toISOString().split("T")[0],
      siteId: "",
      drillType: "FIRE",
      assemblyPoint: "",
      wardenFirstName: "",
      wardenLastName: "",
      totalPeoplePresent: "",
      staffInitialsPresent: "",
      clientInitialsPresent: "",
      participantActivelyInvolved: true,
      ifNotInvolvedReason: "",
      ifNotInvolvedOtherText: "",
      involvementRating: "SATISFACTORY",
      improvementNotes: "",
    });
    setCompletedSteps(new Set());
    setTimerSeconds(0);
    setTimerRunning(false);
    setWizardDrillType("FIRE");
  };

  const handleStartDrill = () => {
    setShowWizard(true);
    setTimerSeconds(0);
    setCompletedSteps(new Set());
  };

  const handleEndDrillWizard = () => {
    setShowWizard(false);
    setTimerRunning(false);
    setFormData((prev) => ({
      ...prev,
      drillType: wizardDrillType,
      dateOfDrill: new Date().toISOString().split("T")[0],
    }));
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.siteId) {
      toast({ title: "Error", description: "Work site is required", variant: "destructive" });
      return;
    }
    if (!formData.wardenFirstName || !formData.wardenLastName) {
      toast({ title: "Error", description: "Warden name is required", variant: "destructive" });
      return;
    }
    if (!formData.totalPeoplePresent || parseInt(formData.totalPeoplePresent) < 1) {
      toast({ title: "Error", description: "Total people must be at least 1", variant: "destructive" });
      return;
    }
    if (!formData.staffInitialsPresent) {
      toast({ title: "Error", description: "Staff initials are required", variant: "destructive" });
      return;
    }
    if (!formData.clientInitialsPresent) {
      toast({ title: "Error", description: "Client initials are required", variant: "destructive" });
      return;
    }
    if (!formData.improvementNotes) {
      toast({ title: "Error", description: "Improvement notes are required", variant: "destructive" });
      return;
    }

    createDrillMutation.mutate({
      dateOfDrill: new Date(formData.dateOfDrill).toISOString(),
      siteId: formData.siteId,
      drillType: formData.drillType,
      assemblyPoint: formData.assemblyPoint || null,
      wardenFirstName: formData.wardenFirstName,
      wardenLastName: formData.wardenLastName,
      totalPeoplePresent: parseInt(formData.totalPeoplePresent),
      staffInitialsPresent: formData.staffInitialsPresent,
      clientInitialsPresent: formData.clientInitialsPresent,
      participantActivelyInvolved: formData.participantActivelyInvolved,
      ifNotInvolvedReason: !formData.participantActivelyInvolved ? formData.ifNotInvolvedReason || null : null,
      ifNotInvolvedOtherText: !formData.participantActivelyInvolved && formData.ifNotInvolvedReason === "OTHER" ? formData.ifNotInvolvedOtherText || null : null,
      involvementRating: formData.involvementRating,
      improvementNotes: formData.improvementNotes,
    });
  };

  const getSiteName = (siteId: string) => {
    const site = workSites.find((s) => s.id === siteId);
    return site?.name || "Unknown Site";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-[var(--radius)]">
                <Flame className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Evacuation Drill Register</h1>
                <p className="text-muted-foreground text-sm">Record and track emergency drills</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleStartDrill} data-testid="button-start-drill">
                <Play className="h-4 w-4 mr-2" />
                Start Drill
              </Button>
              <Button variant="outline" onClick={() => { resetForm(); setShowForm(true); }} data-testid="button-new-record">
                <Plus className="h-4 w-4 mr-2" />
                New Record
              </Button>
            </div>
          </div>

          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search drills..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterDrillType} onValueChange={setFilterDrillType}>
              <SelectTrigger className="w-40" data-testid="filter-drill-type"><SelectValue placeholder="Drill Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DRILL_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading drills...</div>
          ) : filteredDrills.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Flame className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No evacuation drills recorded</h3>
                <p className="text-muted-foreground text-sm mb-4">Start a drill or add a new record to begin tracking.</p>
                <Button onClick={handleStartDrill} data-testid="button-start-first-drill">
                  <Play className="h-4 w-4 mr-2" />
                  Start Your First Drill
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDrills.map((drill) => (
                <Card key={drill.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setShowDetail(drill)} data-testid={`card-drill-${drill.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-100 rounded-[var(--radius)]">
                          <Flame className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{getSiteName(drill.siteId)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(drill.dateOfDrill).toLocaleDateString()} • {DRILL_TYPES.find(t => t.value === drill.drillType)?.label || drill.drillType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={drill.involvementRating === "SATISFACTORY" ? "default" : "secondary"}>
                          {INVOLVEMENT_RATINGS.find(r => r.value === drill.involvementRating)?.label}
                        </Badge>
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
                Drill Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground">Before the Drill</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Warden allocated by manager</li>
                  <li>Choose assembly point</li>
                  <li>Take evacuation pack</li>
                  <li>Conduct head count</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground">During the Drill</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  <li>Check doors for heat</li>
                  <li>Use nearest safe route</li>
                  <li>Assist those in danger</li>
                  <li>Move calmly to assembly point</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Fire Emergency
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                  {FIRE_INSTRUCTIONS.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" />
              Evacuation Drill Wizard
            </DialogTitle>
            <DialogDescription>Follow each step and mark as complete. The timer tracks your drill duration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-[var(--radius)]">
              <div className="flex items-center gap-4">
                <div className="text-3xl font-mono font-bold text-foreground">{formatTime(timerSeconds)}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant={timerRunning ? "secondary" : "default"} onClick={() => setTimerRunning(!timerRunning)} data-testid="button-timer-toggle">
                    {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {timerRunning ? "Pause" : "Start"}
                  </Button>
                </div>
              </div>
              <div>
                <Select value={wizardDrillType} onValueChange={setWizardDrillType}>
                  <SelectTrigger className="w-40" data-testid="select-wizard-drill-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {DRILL_STEPS.map((step) => (
                  <div key={step.id} className={`flex items-start gap-3 p-3 rounded-[var(--radius)] border ${completedSteps.has(step.id) ? "bg-green-50 border-green-200" : "bg-card border-border"}`}>
                    <Checkbox 
                      checked={completedSteps.has(step.id)} 
                      onCheckedChange={(checked) => {
                        const newSet = new Set(completedSteps);
                        if (checked) newSet.add(step.id);
                        else newSet.delete(step.id);
                        setCompletedSteps(newSet);
                      }}
                      data-testid={`checkbox-step-${step.id}`}
                    />
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${completedSteps.has(step.id) ? "text-green-700 line-through" : "text-foreground"}`}>{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                    {completedSteps.has(step.id) && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWizard(false)} data-testid="button-cancel-wizard">Cancel</Button>
            <Button onClick={handleEndDrillWizard} data-testid="button-proceed-to-form">
              Proceed to Drill Record
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } else setShowForm(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Record Evacuation Drill</DialogTitle>
            <DialogDescription>Complete all required fields to save the drill record.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Drill *</Label>
                  <Input type="date" value={formData.dateOfDrill} onChange={(e) => setFormData({ ...formData, dateOfDrill: e.target.value })} data-testid="input-date" />
                </div>
                <div className="space-y-2">
                  <Label>Drill Type *</Label>
                  <Select value={formData.drillType} onValueChange={(v) => setFormData({ ...formData, drillType: v })}>
                    <SelectTrigger data-testid="select-drill-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DRILL_TYPES.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Work Site *</Label>
                <Select value={formData.siteId} onValueChange={(v) => setFormData({ ...formData, siteId: v })}>
                  <SelectTrigger data-testid="select-site"><SelectValue placeholder="Select a work site" /></SelectTrigger>
                  <SelectContent>
                    {workSites.map((site) => (<SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assembly Point</Label>
                <Input value={formData.assemblyPoint} onChange={(e) => setFormData({ ...formData, assemblyPoint: e.target.value })} placeholder="e.g., Front car park" data-testid="input-assembly-point" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warden First Name *</Label>
                  <Input value={formData.wardenFirstName} onChange={(e) => setFormData({ ...formData, wardenFirstName: e.target.value })} data-testid="input-warden-first" />
                </div>
                <div className="space-y-2">
                  <Label>Warden Last Name *</Label>
                  <Input value={formData.wardenLastName} onChange={(e) => setFormData({ ...formData, wardenLastName: e.target.value })} data-testid="input-warden-last" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total number of people present during drill *</Label>
                <Input type="number" min={1} value={formData.totalPeoplePresent} onChange={(e) => setFormData({ ...formData, totalPeoplePresent: e.target.value })} data-testid="input-total-people" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initials of staff present *</Label>
                  <Input value={formData.staffInitialsPresent} onChange={(e) => setFormData({ ...formData, staffInitialsPresent: e.target.value })} placeholder="e.g., JD, SM, AB" data-testid="input-staff-initials" />
                </div>
                <div className="space-y-2">
                  <Label>Initials of clients present *</Label>
                  <Input value={formData.clientInitialsPresent} onChange={(e) => setFormData({ ...formData, clientInitialsPresent: e.target.value })} placeholder="e.g., MK, LP" data-testid="input-client-initials" />
                </div>
              </div>
              <div className="space-y-3">
                <Label>Was the participant actively involved in the drill? *</Label>
                <RadioGroup value={formData.participantActivelyInvolved ? "yes" : "no"} onValueChange={(v) => setFormData({ ...formData, participantActivelyInvolved: v === "yes", ifNotInvolvedReason: "", ifNotInvolvedOtherText: "" })}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="involved-yes" data-testid="radio-involved-yes" /><Label htmlFor="involved-yes">Yes</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="involved-no" data-testid="radio-involved-no" /><Label htmlFor="involved-no">No</Label></div>
                </RadioGroup>
              </div>
              {!formData.participantActivelyInvolved && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>If not, why? *</Label>
                  <RadioGroup value={formData.ifNotInvolvedReason} onValueChange={(v) => setFormData({ ...formData, ifNotInvolvedReason: v })}>
                    {NOT_INVOLVED_REASONS.map((reason) => (
                      <div key={reason.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={reason.value} id={`reason-${reason.value}`} data-testid={`radio-reason-${reason.value}`} />
                        <Label htmlFor={`reason-${reason.value}`}>{reason.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {formData.ifNotInvolvedReason === "OTHER" && (
                    <div className="space-y-2">
                      <Label>Please specify:</Label>
                      <Input value={formData.ifNotInvolvedOtherText} onChange={(e) => setFormData({ ...formData, ifNotInvolvedOtherText: e.target.value })} data-testid="input-other-reason" />
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                <Label>Rate involvement of client in the drill *</Label>
                <RadioGroup value={formData.involvementRating} onValueChange={(v) => setFormData({ ...formData, involvementRating: v })}>
                  {INVOLVEMENT_RATINGS.map((rating) => (
                    <div key={rating.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={rating.value} id={`rating-${rating.value}`} data-testid={`radio-rating-${rating.value}`} />
                      <Label htmlFor={`rating-${rating.value}`}>{rating.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Views on how the drill can be improved *</Label>
                <Textarea value={formData.improvementNotes} onChange={(e) => setFormData({ ...formData, improvementNotes: e.target.value })} rows={3} placeholder="Enter your suggestions for improvement..." data-testid="textarea-improvements" />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }} data-testid="button-cancel-form">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createDrillMutation.isPending} data-testid="button-save-drill">
              {createDrillMutation.isPending ? "Saving..." : "Save Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetail} onOpenChange={(open) => !open && setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Drill Details</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(showDetail.dateOfDrill).toLocaleDateString()}</span></div>
                <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{DRILL_TYPES.find(t => t.value === showDetail.drillType)?.label}</span></div>
                <div><span className="text-muted-foreground">Site:</span> <span className="font-medium">{getSiteName(showDetail.siteId)}</span></div>
                <div><span className="text-muted-foreground">Warden:</span> <span className="font-medium">{showDetail.wardenFirstName} {showDetail.wardenLastName}</span></div>
                <div><span className="text-muted-foreground">People Present:</span> <span className="font-medium">{showDetail.totalPeoplePresent}</span></div>
                <div><span className="text-muted-foreground">Involved:</span> <span className="font-medium">{showDetail.participantActivelyInvolved ? "Yes" : "No"}</span></div>
              </div>
              {showDetail.assemblyPoint && <div className="text-sm"><span className="text-muted-foreground">Assembly Point:</span> <span className="font-medium">{showDetail.assemblyPoint}</span></div>}
              <div className="text-sm"><span className="text-muted-foreground">Staff Initials:</span> <span className="font-medium">{showDetail.staffInitialsPresent}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Client Initials:</span> <span className="font-medium">{showDetail.clientInitialsPresent}</span></div>
              <div className="text-sm"><span className="text-muted-foreground">Rating:</span> <Badge variant={showDetail.involvementRating === "SATISFACTORY" ? "default" : "secondary"}>{INVOLVEMENT_RATINGS.find(r => r.value === showDetail.involvementRating)?.label}</Badge></div>
              <div className="text-sm"><span className="text-muted-foreground">Improvement Notes:</span><p className="mt-1 text-foreground">{showDetail.improvementNotes}</p></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)} data-testid="button-close-detail">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
