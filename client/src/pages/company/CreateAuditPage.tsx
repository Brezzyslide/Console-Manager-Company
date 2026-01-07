import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, Loader2, ClipboardCheck, UserCheck, AlertTriangle, Settings } from "lucide-react";
import { createAudit, getAuditOptions, type AuditType } from "@/lib/company-api";

export default function CreateAuditPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [auditType, setAuditType] = useState<AuditType | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceContextKey: "",
    serviceContextLabel: "",
    scopeTimeFrom: "",
    scopeTimeTo: "",
    externalAuditorName: "",
    externalAuditorOrg: "",
    externalAuditorEmail: "",
  });

  const { data: auditOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ["auditOptions"],
    queryFn: getAuditOptions,
  });

  const createMutation = useMutation({
    mutationFn: createAudit,
    onSuccess: (audit) => {
      navigate(`/audits/${audit.id}/scope`);
    },
  });

  const handleServiceContextChange = (label: string) => {
    const context = auditOptions?.serviceContexts.find(c => c.label === label);
    if (context) {
      setFormData(prev => ({ 
        ...prev, 
        serviceContextKey: context.key,
        serviceContextLabel: context.label,
      }));
    }
  };

  const handleSubmit = () => {
    if (!auditType || !formData.serviceContextLabel) return;
    
    createMutation.mutate({
      auditType,
      title: formData.title,
      description: formData.description || undefined,
      serviceContextKey: formData.serviceContextKey,
      serviceContextLabel: formData.serviceContextLabel,
      scopeTimeFrom: formData.scopeTimeFrom,
      scopeTimeTo: formData.scopeTimeTo,
      externalAuditorName: auditType === "EXTERNAL" ? formData.externalAuditorName : undefined,
      externalAuditorOrg: auditType === "EXTERNAL" ? formData.externalAuditorOrg : undefined,
      externalAuditorEmail: auditType === "EXTERNAL" ? formData.externalAuditorEmail : undefined,
    });
  };

  const serviceContextsConfigured = (auditOptions?.serviceContexts?.length ?? 0) > 0;
  const lineItemsConfigured = (auditOptions?.selectedLineItemCount ?? 0) > 0;
  const isOnboardingComplete = serviceContextsConfigured && lineItemsConfigured;

  const isStep1Valid = auditType !== null;
  const isStep2Valid = 
    formData.title.trim() !== "" &&
    formData.serviceContextLabel !== "" &&
    formData.scopeTimeFrom !== "" &&
    formData.scopeTimeTo !== "" &&
    (auditType === "INTERNAL" || (
      formData.externalAuditorName.trim() !== "" &&
      formData.externalAuditorOrg.trim() !== "" &&
      formData.externalAuditorEmail.trim() !== ""
    ));

  if (optionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audits
        </Button>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-yellow-500" />
              Complete Onboarding First
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Before creating an audit, you need to configure your organization's service scope and delivery contexts.
            </p>
            
            {!serviceContextsConfigured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Service delivery contexts are not configured. These define what types of services you provide (e.g., SIL, Community Access).
                </AlertDescription>
              </Alert>
            )}
            
            {!lineItemsConfigured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No service line items have been selected. Please configure your service scope in onboarding.
                </AlertDescription>
              </Alert>
            )}
            
            <Button asChild className="mt-4" data-testid="button-go-to-onboarding">
              <Link href="/onboarding">
                Complete Onboarding
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const configuredLineItemCount = auditOptions?.selectedLineItemCount ?? 0;
  const configuredContextCount = auditOptions?.serviceContexts?.length ?? 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Audit</h1>
        <p className="text-muted-foreground">Set up your audit scope and parameters</p>
      </div>

      <div className="mb-6 p-4 bg-muted/50 rounded-lg border" data-testid="onboarding-summary">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Available from onboarding:</span>
          </div>
          <div className="flex gap-4">
            <span><strong>{configuredContextCount}</strong> service contexts</span>
            <span><strong>{configuredLineItemCount}</strong> line items</span>
          </div>
        </div>
      </div>

      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Audit Type</CardTitle>
            <CardDescription>Choose whether this is an internal or external audit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={auditType || ""} onValueChange={(v) => setAuditType(v as AuditType)}>
              <div className="grid gap-4">
                <label 
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${auditType === "INTERNAL" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                  data-testid="radio-internal-audit"
                >
                  <RadioGroupItem value="INTERNAL" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <ClipboardCheck className="h-5 w-5" />
                      Internal Audit
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Conduct a self-assessment of your organization's compliance and practices
                    </p>
                  </div>
                </label>

                <label 
                  className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${auditType === "EXTERNAL" ? "border-primary bg-primary/5" : "hover:bg-accent"}`}
                  data-testid="radio-external-audit"
                >
                  <RadioGroupItem value="EXTERNAL" className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <UserCheck className="h-5 w-5" />
                      External Audit
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Record an audit conducted by an external auditor or certification body
                    </p>
                  </div>
                </label>
              </div>
            </RadioGroup>

            <div className="flex justify-end">
              <Button onClick={() => setStep(1)} disabled={!isStep1Valid} data-testid="button-next-step">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Audit Details</CardTitle>
            <CardDescription>
              {auditType === "INTERNAL" 
                ? "Enter the details for your internal audit" 
                : "Enter the details for your external audit"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Audit Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q4 2024 SIL Services Review"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-audit-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the audit purpose and scope..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-audit-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Service Delivery Context *</Label>
                <Select 
                  value={formData.serviceContextLabel} 
                  onValueChange={handleServiceContextChange}
                >
                  <SelectTrigger data-testid="select-service-context">
                    <SelectValue placeholder="Select service context" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditOptions?.serviceContexts.map(opt => (
                      <SelectItem key={opt.label} value={opt.label}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a category to see its available line items
                </p>
              </div>

              {formData.serviceContextLabel && (
                <div className="space-y-2">
                  <Label>Line Items in {formData.serviceContextLabel}</Label>
                  <div className="border rounded-lg p-4 bg-muted/30 max-h-48 overflow-y-auto">
                    {auditOptions?.lineItemsByCategory
                      .find(cat => cat.categoryLabel === formData.serviceContextLabel)
                      ?.items.map(item => (
                        <div key={item.lineItemId} className="flex items-center gap-3 py-1.5 text-sm border-b last:border-0">
                          <span className="font-mono text-xs text-muted-foreground min-w-[70px]">{item.code}</span>
                          <span>{item.label}</span>
                        </div>
                      )) || (
                        <p className="text-sm text-muted-foreground">No line items available for this category</p>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You will select specific line items to audit in the next step
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scopeFrom">Scope Period From *</Label>
                  <Input
                    id="scopeFrom"
                    type="date"
                    value={formData.scopeTimeFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, scopeTimeFrom: e.target.value }))}
                    data-testid="input-scope-from"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scopeTo">Scope Period To *</Label>
                  <Input
                    id="scopeTo"
                    type="date"
                    value={formData.scopeTimeTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, scopeTimeTo: e.target.value }))}
                    data-testid="input-scope-to"
                  />
                </div>
              </div>

              {auditType === "EXTERNAL" && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Scope will be locked once the audit is started</span>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium">External Auditor Details</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="auditorName">Auditor Name *</Label>
                      <Input
                        id="auditorName"
                        placeholder="Full name of the lead auditor"
                        value={formData.externalAuditorName}
                        onChange={(e) => setFormData(prev => ({ ...prev, externalAuditorName: e.target.value }))}
                        data-testid="input-auditor-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditorOrg">Organization *</Label>
                      <Input
                        id="auditorOrg"
                        placeholder="Auditing organization or certification body"
                        value={formData.externalAuditorOrg}
                        onChange={(e) => setFormData(prev => ({ ...prev, externalAuditorOrg: e.target.value }))}
                        data-testid="input-auditor-org"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auditorEmail">Email *</Label>
                      <Input
                        id="auditorEmail"
                        type="email"
                        placeholder="auditor@example.com"
                        value={formData.externalAuditorEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, externalAuditorEmail: e.target.value }))}
                        data-testid="input-auditor-email"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {createMutation.error && (
              <p className="text-sm text-destructive">{(createMutation.error as Error).message}</p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!isStep2Valid || createMutation.isPending}
                data-testid="button-create-audit"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Audit
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
