import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, Loader2, Plus, FileText, CheckCircle2, Library, PenLine, AlertTriangle } from "lucide-react";
import { 
  getAudit, 
  getAuditTemplates, 
  createAuditTemplate, 
  addTemplateIndicator,
  selectAuditTemplate,
  startAudit,
  getStandardIndicators,
  type AuditTemplate,
  type StandardIndicator,
} from "@/lib/company-api";

export default function AuditTemplateSelectPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddIndicatorDialog, setShowAddIndicatorDialog] = useState(false);
  const [newTemplateId, setNewTemplateId] = useState<string | null>(null);
  
  const [templateForm, setTemplateForm] = useState({ name: "", description: "" });
  const [indicatorForm, setIndicatorForm] = useState({ indicatorText: "", guidanceText: "", evidenceRequirements: "" });
  const [indicatorTab, setIndicatorTab] = useState<"library" | "custom">("library");
  const [selectedLibraryIndicators, setSelectedLibraryIndicators] = useState<Set<string>>(new Set());
  const [selectedDomain, setSelectedDomain] = useState<string>("all");

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => getAudit(id!),
    enabled: !!id,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["auditTemplates"],
    queryFn: getAuditTemplates,
  });

  const { data: standardIndicators, isLoading: indicatorsLoading } = useQuery({
    queryKey: ["standardIndicators"],
    queryFn: () => getStandardIndicators(),
    enabled: showAddIndicatorDialog,
  });

  const filteredIndicators = standardIndicators?.filter(ind => 
    selectedDomain === "all" || ind.domainCode === selectedDomain
  ) || [];

  const indicatorsByCategory = filteredIndicators.reduce((acc, ind) => {
    const key = `${ind.domainCode}|${ind.category}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ind);
    return acc;
  }, {} as Record<string, StandardIndicator[]>);

  const domainNames: Record<string, string> = {
    GOV_POLICY: "Governance & Policy",
    STAFF_PERSONNEL: "Staff & Personnel",
    OPERATIONAL: "Operational / Client Specific",
    SITE_ENVIRONMENT: "Site-Specific & Environment",
  };

  const createTemplateMutation = useMutation({
    mutationFn: createAuditTemplate,
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["auditTemplates"] });
      setShowCreateDialog(false);
      setNewTemplateId(template.id);
      setShowAddIndicatorDialog(true);
      setTemplateForm({ name: "", description: "" });
    },
  });

  const addIndicatorMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) => 
      addTemplateIndicator(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditTemplates"] });
      setIndicatorForm({ indicatorText: "", guidanceText: "", evidenceRequirements: "" });
    },
  });

  const addBatchIndicatorsMutation = useMutation({
    mutationFn: async ({ templateId, indicators }: { templateId: string; indicators: StandardIndicator[] }) => {
      for (const ind of indicators) {
        await addTemplateIndicator(templateId, {
          indicatorText: ind.indicatorText,
          guidanceText: ind.guidanceText,
          evidenceRequirements: ind.evidenceRequirements,
          riskLevel: ind.riskLevel,
          isCriticalControl: ind.isCriticalControl,
          sortOrder: ind.sortOrder,
          auditDomainCode: ind.domainCode,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auditTemplates"] });
      setSelectedLibraryIndicators(new Set());
    },
  });

  const selectTemplateMutation = useMutation({
    mutationFn: (templateId: string) => selectAuditTemplate(id!, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit", id] });
    },
  });

  const startAuditMutation = useMutation({
    mutationFn: () => startAudit(id!),
    onSuccess: () => {
      navigate(`/audits/${id}/run`);
    },
  });

  const handleStartAudit = async () => {
    if (!selectedTemplateId) return;
    
    await selectTemplateMutation.mutateAsync(selectedTemplateId);
    await startAuditMutation.mutateAsync();
  };

  const handleFinishAddingIndicators = () => {
    setShowAddIndicatorDialog(false);
    setSelectedTemplateId(newTemplateId);
    setNewTemplateId(null);
  };

  const isLoading = auditLoading || templatesLoading;
  const canStart = selectedTemplateId !== null;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate(`/audits/${id}/scope`)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Scope
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{audit?.title}</h1>
        <p className="text-muted-foreground">Select an audit template to use for this audit</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Audit Templates</CardTitle>
              <CardDescription>
                Choose a template with predefined indicators
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No templates available</p>
              <p className="text-sm text-muted-foreground">Create a template with audit indicators to continue</p>
            </div>
          ) : (
            <RadioGroup value={selectedTemplateId || ""} onValueChange={setSelectedTemplateId}>
              <div className="grid gap-3">
                {templates?.map(template => (
                  <label 
                    key={template.id}
                    className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${selectedTemplateId === template.id ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                    data-testid={`radio-template-${template.id}`}
                  >
                    <RadioGroupItem value={template.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline">{template.indicatorCount || 0} indicators</Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                    </div>
                    {selectedTemplateId === template.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </label>
                ))}
              </div>
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      {(selectTemplateMutation.error || startAuditMutation.error) && (
        <p className="text-sm text-destructive mb-4">
          {(selectTemplateMutation.error as Error)?.message || (startAuditMutation.error as Error)?.message}
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(`/audits/${id}/scope`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={handleStartAudit} 
          disabled={!canStart || selectTemplateMutation.isPending || startAuditMutation.isPending}
          data-testid="button-start-audit"
        >
          {(selectTemplateMutation.isPending || startAuditMutation.isPending) && (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          )}
          Start Audit
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Audit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                placeholder="e.g., NDIS Practice Standards Review"
                value={templateForm.name}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDesc">Description</Label>
              <Textarea
                id="templateDesc"
                placeholder="Brief description of what this template covers..."
                value={templateForm.description}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-template-description"
              />
            </div>
          </div>
          {createTemplateMutation.error && (
            <p className="text-sm text-destructive">{(createTemplateMutation.error as Error).message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createTemplateMutation.mutate(templateForm)}
              disabled={!templateForm.name.trim() || createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create & Add Indicators
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddIndicatorDialog} onOpenChange={setShowAddIndicatorDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Audit Indicators</DialogTitle>
          </DialogHeader>
          
          <Tabs value={indicatorTab} onValueChange={(v) => setIndicatorTab(v as "library" | "custom")} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library" className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                Select from Library
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Write Custom
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="library" className="flex-1 flex flex-col overflow-hidden mt-4">
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedDomain}
                  onChange={(e) => {
                    const newDomain = e.target.value;
                    setSelectedDomain(newDomain);
                    if (newDomain !== "all" && standardIndicators) {
                      const domainIndicatorIds = standardIndicators
                        .filter(ind => ind.domainCode === newDomain)
                        .map(ind => ind.id);
                      setSelectedLibraryIndicators(prev => {
                        const newSet = new Set(prev);
                        domainIndicatorIds.forEach(id => newSet.add(id));
                        return newSet;
                      });
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  data-testid="select-domain-filter"
                >
                  <option value="all">All Domains</option>
                  <option value="GOV_POLICY">Governance & Policy</option>
                  <option value="STAFF_PERSONNEL">Staff & Personnel</option>
                  <option value="OPERATIONAL">Operational / Client Specific</option>
                  <option value="SITE_ENVIRONMENT">Site-Specific & Environment</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allIds = new Set(filteredIndicators.map(i => i.id));
                    setSelectedLibraryIndicators(allIds);
                  }}
                  data-testid="button-select-all"
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLibraryIndicators(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </div>
              
              {indicatorsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[400px] border rounded-md p-4">
                  <div className="space-y-6">
                    {Object.entries(indicatorsByCategory).map(([key, indicators]) => {
                      const [domain, category] = key.split('|');
                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {domainNames[domain] || domain}
                            </Badge>
                            <span className="font-medium text-sm">{category}</span>
                          </div>
                          <div className="space-y-1 pl-2">
                            {indicators.map((ind) => (
                              <div 
                                key={ind.id} 
                                className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/50 cursor-pointer"
                                onClick={() => {
                                  const newSet = new Set(selectedLibraryIndicators);
                                  if (newSet.has(ind.id)) {
                                    newSet.delete(ind.id);
                                  } else {
                                    newSet.add(ind.id);
                                  }
                                  setSelectedLibraryIndicators(newSet);
                                }}
                              >
                                <Checkbox 
                                  checked={selectedLibraryIndicators.has(ind.id)}
                                  className="mt-1"
                                  data-testid={`checkbox-indicator-${ind.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">{ind.indicatorText}</p>
                                  {ind.isCriticalControl && (
                                    <Badge variant="destructive" className="mt-1 text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Critical Control
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedLibraryIndicators.size} indicator(s) selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleFinishAddingIndicators}>
                    Done
                  </Button>
                  <Button 
                    onClick={() => {
                      if (newTemplateId && selectedLibraryIndicators.size > 0) {
                        const selectedInds = standardIndicators?.filter(i => selectedLibraryIndicators.has(i.id)) || [];
                        addBatchIndicatorsMutation.mutate({ 
                          templateId: newTemplateId, 
                          indicators: selectedInds 
                        });
                      }
                    }}
                    disabled={selectedLibraryIndicators.size === 0 || addBatchIndicatorsMutation.isPending}
                    data-testid="button-add-selected"
                  >
                    {addBatchIndicatorsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Add Selected ({selectedLibraryIndicators.size})
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="indicatorText">Indicator Text *</Label>
                <Textarea
                  id="indicatorText"
                  placeholder="e.g., The organisation has documented policies and procedures for incident management..."
                  value={indicatorForm.indicatorText}
                  onChange={(e) => setIndicatorForm(prev => ({ ...prev, indicatorText: e.target.value }))}
                  data-testid="input-indicator-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guidanceText">Guidance (optional)</Label>
                <Textarea
                  id="guidanceText"
                  placeholder="Additional guidance for auditors..."
                  value={indicatorForm.guidanceText}
                  onChange={(e) => setIndicatorForm(prev => ({ ...prev, guidanceText: e.target.value }))}
                  data-testid="input-guidance-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceRequirements">Evidence Requirements (optional)</Label>
                <Textarea
                  id="evidenceRequirements"
                  placeholder="What evidence should the auditor look for..."
                  value={indicatorForm.evidenceRequirements}
                  onChange={(e) => setIndicatorForm(prev => ({ ...prev, evidenceRequirements: e.target.value }))}
                  data-testid="input-evidence-requirements"
                />
              </div>
              
              {addIndicatorMutation.error && (
                <p className="text-sm text-destructive">{(addIndicatorMutation.error as Error).message}</p>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleFinishAddingIndicators}>
                  Done Adding
                </Button>
                <Button 
                  onClick={() => {
                    if (newTemplateId) {
                      addIndicatorMutation.mutate({ 
                        templateId: newTemplateId, 
                        data: indicatorForm 
                      });
                    }
                  }}
                  disabled={!indicatorForm.indicatorText.trim() || addIndicatorMutation.isPending}
                  data-testid="button-add-indicator"
                >
                  {addIndicatorMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Add Indicator
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
