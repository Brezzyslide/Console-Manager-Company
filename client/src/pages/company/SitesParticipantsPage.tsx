import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  User,
  Link2,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface WorkSite {
  id: string;
  name: string;
  address?: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  ndisNumber?: string;
  dob?: string;
  primarySiteId?: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface ParticipantSiteAssignment {
  id: string;
  participantId: string;
  siteId: string;
  startDate: string;
  endDate?: string;
  isPrimary: boolean;
}

export default function SitesParticipantsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sites");
  
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);
  const [siteForm, setSiteForm] = useState({ name: "", address: "" });
  
  const [participantDialogOpen, setParticipantDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [participantForm, setParticipantForm] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    ndisNumber: "",
    dob: "",
    primarySiteId: "",
  });
  
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedParticipantForAssignment, setSelectedParticipantForAssignment] = useState<Participant | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    siteId: "",
    startDate: new Date().toISOString().split("T")[0],
    isPrimary: false,
  });

  const { data: workSites = [], isLoading: sitesLoading } = useQuery<WorkSite[]>({
    queryKey: ["/api/company/work-sites"],
    queryFn: async () => {
      const res = await fetch("/api/company/work-sites", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch work sites");
      return res.json();
    },
  });

  const { data: participants = [], isLoading: participantsLoading } = useQuery<Participant[]>({
    queryKey: ["/api/company/participants"],
    queryFn: async () => {
      const res = await fetch("/api/company/participants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json();
    },
  });

  const { data: assignments = [] } = useQuery<ParticipantSiteAssignment[]>({
    queryKey: ["/api/company/participant-site-assignments"],
    queryFn: async () => {
      const res = await fetch("/api/company/participant-site-assignments", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
  });

  const createSiteMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string }) => {
      const res = await fetch("/api/company/work-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create site");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/work-sites"] });
      toast({ title: "Site created successfully" });
      setSiteDialogOpen(false);
      setSiteForm({ name: "", address: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; address?: string; status?: string } }) => {
      const res = await fetch(`/api/company/work-sites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update site");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/work-sites"] });
      toast({ title: "Site updated successfully" });
      setSiteDialogOpen(false);
      setEditingSite(null);
      setSiteForm({ name: "", address: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/company/work-sites/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete site");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/work-sites"] });
      toast({ title: "Site deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createParticipantMutation = useMutation({
    mutationFn: async (data: typeof participantForm) => {
      const res = await fetch("/api/company/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          primarySiteId: data.primarySiteId || undefined,
          dob: data.dob || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/participants"] });
      toast({ title: "Participant created successfully" });
      setParticipantDialogOpen(false);
      setParticipantForm({ firstName: "", lastName: "", displayName: "", ndisNumber: "", dob: "", primarySiteId: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateParticipantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof participantForm> & { status?: string } }) => {
      const res = await fetch(`/api/company/participants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/participants"] });
      toast({ title: "Participant updated successfully" });
      setParticipantDialogOpen(false);
      setEditingParticipant(null);
      setParticipantForm({ firstName: "", lastName: "", displayName: "", ndisNumber: "", dob: "", primarySiteId: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/company/participants/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete participant");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/participants"] });
      toast({ title: "Participant deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: { participantId: string; siteId: string; startDate: string; isPrimary: boolean }) => {
      const res = await fetch("/api/company/participant-site-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/participant-site-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company/participants"] });
      toast({ title: "Site assignment created successfully" });
      setAssignmentDialogOpen(false);
      setSelectedParticipantForAssignment(null);
      setAssignmentForm({ siteId: "", startDate: new Date().toISOString().split("T")[0], isPrimary: false });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/company/participant-site-assignments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete assignment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/participant-site-assignments"] });
      toast({ title: "Site assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditSite = (site: WorkSite) => {
    setEditingSite(site);
    setSiteForm({ name: site.name, address: site.address || "" });
    setSiteDialogOpen(true);
  };

  const openEditParticipant = (participant: Participant) => {
    setEditingParticipant(participant);
    setParticipantForm({
      firstName: participant.firstName,
      lastName: participant.lastName,
      displayName: participant.displayName || "",
      ndisNumber: participant.ndisNumber || "",
      dob: participant.dob ? participant.dob.split("T")[0] : "",
      primarySiteId: participant.primarySiteId || "",
    });
    setParticipantDialogOpen(true);
  };

  const openAssignSite = (participant: Participant) => {
    setSelectedParticipantForAssignment(participant);
    setAssignmentForm({ siteId: "", startDate: new Date().toISOString().split("T")[0], isPrimary: false });
    setAssignmentDialogOpen(true);
  };

  const handleSiteSubmit = () => {
    if (!siteForm.name.trim()) {
      toast({ title: "Site name is required", variant: "destructive" });
      return;
    }
    if (editingSite) {
      updateSiteMutation.mutate({ id: editingSite.id, data: siteForm });
    } else {
      createSiteMutation.mutate(siteForm);
    }
  };

  const handleParticipantSubmit = () => {
    if (!participantForm.firstName.trim() || !participantForm.lastName.trim()) {
      toast({ title: "First and last name are required", variant: "destructive" });
      return;
    }
    if (editingParticipant) {
      updateParticipantMutation.mutate({ id: editingParticipant.id, data: participantForm });
    } else {
      createParticipantMutation.mutate(participantForm);
    }
  };

  const handleAssignmentSubmit = () => {
    if (!selectedParticipantForAssignment || !assignmentForm.siteId) {
      toast({ title: "Please select a site", variant: "destructive" });
      return;
    }
    createAssignmentMutation.mutate({
      participantId: selectedParticipantForAssignment.id,
      siteId: assignmentForm.siteId,
      startDate: assignmentForm.startDate,
      isPrimary: assignmentForm.isPrimary,
    });
  };

  const getSiteName = (siteId: string) => {
    const site = workSites.find(s => s.id === siteId);
    return site?.name || "Unknown Site";
  };

  const getParticipantAssignments = (participantId: string) => {
    return assignments.filter(a => a.participantId === participantId);
  };

  const activeSites = workSites.filter(s => s.status === "active");
  const inactiveSites = workSites.filter(s => s.status === "inactive");
  const activeParticipants = participants.filter(p => p.status === "active");
  const inactiveParticipants = participants.filter(p => p.status === "inactive");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Sites & Participants</h1>
        <p className="text-muted-foreground mt-1">
          Manage your work sites and participants. Link participants to their assigned sites.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="sites" className="flex items-center gap-2" data-testid="tab-sites">
            <Building2 className="h-4 w-4" />
            Sites ({workSites.length})
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex items-center gap-2" data-testid="tab-participants">
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Work Sites</CardTitle>
                <CardDescription>Locations where services are provided</CardDescription>
              </div>
              <Dialog open={siteDialogOpen} onOpenChange={(open) => {
                setSiteDialogOpen(open);
                if (!open) {
                  setEditingSite(null);
                  setSiteForm({ name: "", address: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-site">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Site
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingSite ? "Edit Site" : "Add New Site"}</DialogTitle>
                    <DialogDescription>
                      {editingSite ? "Update the site details" : "Create a new work site location"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="site-name">Site Name *</Label>
                      <Input
                        id="site-name"
                        placeholder="e.g., Main Office, Group Home A"
                        value={siteForm.name}
                        onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
                        data-testid="input-site-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site-address">Address</Label>
                      <Input
                        id="site-address"
                        placeholder="e.g., 123 Main St, Sydney NSW 2000"
                        value={siteForm.address}
                        onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
                        data-testid="input-site-address"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSiteDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleSiteSubmit}
                      disabled={createSiteMutation.isPending || updateSiteMutation.isPending}
                      data-testid="button-save-site"
                    >
                      {(createSiteMutation.isPending || updateSiteMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingSite ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {sitesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : workSites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sites yet. Add your first work site to get started.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeSites.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Sites</h3>
                      <div className="grid gap-3">
                        {activeSites.map((site) => (
                          <div
                            key={site.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                            data-testid={`site-row-${site.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{site.name}</p>
                                {site.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {site.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-green-500/50 text-green-600">Active</Badge>
                              <Button variant="ghost" size="icon" onClick={() => openEditSite(site)} data-testid={`button-edit-site-${site.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSiteMutation.mutate({ id: site.id, data: { status: "inactive" } })}
                                data-testid={`button-deactivate-site-${site.id}`}
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inactiveSites.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Inactive Sites</h3>
                      <div className="grid gap-3">
                        {inactiveSites.map((site) => (
                          <div
                            key={site.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 opacity-75"
                            data-testid={`site-row-${site.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-muted rounded-lg">
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{site.name}</p>
                                {site.address && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {site.address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Inactive</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateSiteMutation.mutate({ id: site.id, data: { status: "active" } })}
                                data-testid={`button-activate-site-${site.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteSiteMutation.mutate(site.id)}
                                data-testid={`button-delete-site-${site.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Participants</CardTitle>
                <CardDescription>NDIS participants receiving services</CardDescription>
              </div>
              <Dialog open={participantDialogOpen} onOpenChange={(open) => {
                setParticipantDialogOpen(open);
                if (!open) {
                  setEditingParticipant(null);
                  setParticipantForm({ firstName: "", lastName: "", displayName: "", ndisNumber: "", dob: "", primarySiteId: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-participant">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingParticipant ? "Edit Participant" : "Add New Participant"}</DialogTitle>
                    <DialogDescription>
                      {editingParticipant ? "Update participant details" : "Register a new NDIS participant"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={participantForm.firstName}
                          onChange={(e) => setParticipantForm({ ...participantForm, firstName: e.target.value })}
                          data-testid="input-participant-firstname"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={participantForm.lastName}
                          onChange={(e) => setParticipantForm({ ...participantForm, lastName: e.target.value })}
                          data-testid="input-participant-lastname"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name (optional)</Label>
                      <Input
                        id="displayName"
                        placeholder="Preferred name or nickname"
                        value={participantForm.displayName}
                        onChange={(e) => setParticipantForm({ ...participantForm, displayName: e.target.value })}
                        data-testid="input-participant-displayname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ndisNumber">NDIS Number</Label>
                      <Input
                        id="ndisNumber"
                        placeholder="e.g., 431234567"
                        value={participantForm.ndisNumber}
                        onChange={(e) => setParticipantForm({ ...participantForm, ndisNumber: e.target.value })}
                        data-testid="input-participant-ndis"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={participantForm.dob}
                        onChange={(e) => setParticipantForm({ ...participantForm, dob: e.target.value })}
                        data-testid="input-participant-dob"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="primarySite">Primary Site</Label>
                      <Select
                        value={participantForm.primarySiteId || "none"}
                        onValueChange={(value) => setParticipantForm({ ...participantForm, primarySiteId: value === "none" ? "" : value })}
                      >
                        <SelectTrigger data-testid="select-primary-site">
                          <SelectValue placeholder="Select primary site" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No primary site</SelectItem>
                          {activeSites.map((site) => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setParticipantDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleParticipantSubmit}
                      disabled={createParticipantMutation.isPending || updateParticipantMutation.isPending}
                      data-testid="button-save-participant"
                    >
                      {(createParticipantMutation.isPending || updateParticipantMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingParticipant ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {participantsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No participants yet. Add your first participant to get started.</p>
                  {workSites.length === 0 && (
                    <p className="text-sm mt-2">Tip: Add sites first so you can link participants to them.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {activeParticipants.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Active Participants</h3>
                      <div className="grid gap-3">
                        {activeParticipants.map((participant) => {
                          const participantAssignments = getParticipantAssignments(participant.id);
                          return (
                            <div
                              key={participant.id}
                              className="p-4 border rounded-lg hover:bg-muted/50"
                              data-testid={`participant-row-${participant.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">
                                      {participant.displayName || `${participant.firstName} ${participant.lastName}`}
                                    </p>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                      {participant.ndisNumber && <span>NDIS: {participant.ndisNumber}</span>}
                                      {participant.dob && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(participant.dob).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="border-green-500/50 text-green-600">Active</Badge>
                                  <Button variant="ghost" size="icon" onClick={() => openAssignSite(participant)} data-testid={`button-assign-site-${participant.id}`}>
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => openEditParticipant(participant)} data-testid={`button-edit-participant-${participant.id}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateParticipantMutation.mutate({ id: participant.id, data: { status: "inactive" } })}
                                    data-testid={`button-deactivate-participant-${participant.id}`}
                                  >
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              </div>
                              
                              {(participant.primarySiteId || participantAssignments.length > 0) && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Sites</p>
                                  <div className="flex flex-wrap gap-2">
                                    {participant.primarySiteId && (
                                      <Badge variant="default" className="bg-primary/20 text-primary">
                                        <Building2 className="h-3 w-3 mr-1" />
                                        {getSiteName(participant.primarySiteId)} (Primary)
                                      </Badge>
                                    )}
                                    {participantAssignments.filter(a => a.siteId !== participant.primarySiteId).map((assignment) => (
                                      <Badge key={assignment.id} variant="secondary" className="flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        {getSiteName(assignment.siteId)}
                                        <button
                                          onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                          className="ml-1 hover:text-destructive"
                                        >
                                          <XCircle className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {inactiveParticipants.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Inactive Participants</h3>
                      <div className="grid gap-3">
                        {inactiveParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 opacity-75"
                            data-testid={`participant-row-${participant.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-muted rounded-lg">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {participant.displayName || `${participant.firstName} ${participant.lastName}`}
                                </p>
                                {participant.ndisNumber && (
                                  <p className="text-sm text-muted-foreground">NDIS: {participant.ndisNumber}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">Inactive</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateParticipantMutation.mutate({ id: participant.id, data: { status: "active" } })}
                                data-testid={`button-activate-participant-${participant.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteParticipantMutation.mutate(participant.id)}
                                data-testid={`button-delete-participant-${participant.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Site to Participant</DialogTitle>
            <DialogDescription>
              Link {selectedParticipantForAssignment?.displayName || `${selectedParticipantForAssignment?.firstName} ${selectedParticipantForAssignment?.lastName}`} to a work site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Site *</Label>
              <Select
                value={assignmentForm.siteId}
                onValueChange={(value) => setAssignmentForm({ ...assignmentForm, siteId: value })}
              >
                <SelectTrigger data-testid="select-assignment-site">
                  <SelectValue placeholder="Choose a site" />
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
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={assignmentForm.startDate}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, startDate: e.target.value })}
                data-testid="input-assignment-startdate"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={assignmentForm.isPrimary}
                onChange={(e) => setAssignmentForm({ ...assignmentForm, isPrimary: e.target.checked })}
                className="rounded border-gray-300"
                data-testid="checkbox-assignment-primary"
              />
              <Label htmlFor="isPrimary" className="font-normal">Set as primary site</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAssignmentSubmit}
              disabled={createAssignmentMutation.isPending}
              data-testid="button-save-assignment"
            >
              {createAssignmentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Assign Site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
