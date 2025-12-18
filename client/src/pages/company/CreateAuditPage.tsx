import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, ClipboardCheck, UserCheck, AlertTriangle } from "lucide-react";
import { createAudit, type AuditType, type ServiceContext } from "@/lib/company-api";

const serviceContextOptions: { value: ServiceContext; label: string }[] = [
  { value: "SIL", label: "Supported Independent Living (SIL)" },
  { value: "COMMUNITY_ACCESS", label: "Community Access" },
  { value: "IN_HOME", label: "In-Home Support" },
  { value: "CENTRE_BASED", label: "Centre Based" },
  { value: "OTHER", label: "Other" },
];

export default function CreateAuditPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [auditType, setAuditType] = useState<AuditType | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    serviceContext: "" as ServiceContext | "",
    scopeTimeFrom: "",
    scopeTimeTo: "",
    externalAuditorName: "",
    externalAuditorOrg: "",
    externalAuditorEmail: "",
  });

  const createMutation = useMutation({
    mutationFn: createAudit,
    onSuccess: (audit) => {
      navigate(`/audits/${audit.id}/scope`);
    },
  });

  const handleSubmit = () => {
    if (!auditType || !formData.serviceContext) return;
    
    createMutation.mutate({
      auditType,
      title: formData.title,
      description: formData.description || undefined,
      serviceContext: formData.serviceContext,
      scopeTimeFrom: formData.scopeTimeFrom,
      scopeTimeTo: formData.scopeTimeTo,
      externalAuditorName: auditType === "EXTERNAL" ? formData.externalAuditorName : undefined,
      externalAuditorOrg: auditType === "EXTERNAL" ? formData.externalAuditorOrg : undefined,
      externalAuditorEmail: auditType === "EXTERNAL" ? formData.externalAuditorEmail : undefined,
    });
  };

  const isStep1Valid = auditType !== null;
  const isStep2Valid = 
    formData.title.trim() !== "" &&
    formData.serviceContext !== "" &&
    formData.scopeTimeFrom !== "" &&
    formData.scopeTimeTo !== "" &&
    (auditType === "INTERNAL" || (
      formData.externalAuditorName.trim() !== "" &&
      formData.externalAuditorOrg.trim() !== "" &&
      formData.externalAuditorEmail.trim() !== ""
    ));

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Button variant="ghost" className="mb-4" onClick={() => navigate("/audits")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Audits
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create New Audit</h1>
        <p className="text-muted-foreground">Set up your audit scope and parameters</p>
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
                  value={formData.serviceContext} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, serviceContext: v as ServiceContext }))}
                >
                  <SelectTrigger data-testid="select-service-context">
                    <SelectValue placeholder="Select service context" />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceContextOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
