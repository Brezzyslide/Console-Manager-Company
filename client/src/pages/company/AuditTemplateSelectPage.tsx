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
import { ArrowLeft, ArrowRight, Loader2, Plus, FileText, CheckCircle2 } from "lucide-react";
import { 
  getAudit, 
  getAuditTemplates, 
  createAuditTemplate, 
  addTemplateIndicator,
  selectAuditTemplate,
  startAudit,
  type AuditTemplate,
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
  const [indicatorForm, setIndicatorForm] = useState({ indicatorText: "", guidanceText: "" });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => getAudit(id!),
    enabled: !!id,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["auditTemplates"],
    queryFn: getAuditTemplates,
  });

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
      setIndicatorForm({ indicatorText: "", guidanceText: "" });
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Audit Indicators</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          </div>
          {addIndicatorMutation.error && (
            <p className="text-sm text-destructive">{(addIndicatorMutation.error as Error).message}</p>
          )}
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
