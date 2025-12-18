import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getOnboardingStatus, 
  startOnboarding, 
  completeOnboarding,
  getCompanySettings,
  updateCompanySettings,
  getCompanyServices,
  updateCompanyServices,
  getCompanyDocuments,
  uploadDocument,
  addDocumentLink,
  type SettingsInput,
  type ServicesUpdateInput,
  type DocType,
  type CompanyUser,
  getCompanyMe,
} from "@/lib/company-api";
import { Building2, ListChecks, FileText, CheckCircle2, Loader2, ChevronRight, ChevronLeft, Upload, Link, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DOC_TYPE_LABELS: Record<DocType, string> = {
  policy_pack: "Policy Pack",
  org_chart: "Organisation Chart",
  incident_management_policy: "Incident Management Policy",
  medication_policy: "Medication Policy",
  behaviour_support_policy: "Behaviour Support Policy",
  restrictive_practice_policy: "Restrictive Practice Policy",
  training_matrix: "Training Matrix",
  insurance: "Insurance Certificate",
  service_agreement_template: "Service Agreement Template",
  privacy_policy: "Privacy Policy",
  complaints_policy: "Complaints Policy",
  other: "Other",
};

function ChipInput({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string[]; 
  onChange: (v: string[]) => void; 
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  
  const handleAdd = () => {
    if (input.trim() && !value.includes(input.trim())) {
      onChange([...value, input.trim()]);
      setInput("");
    }
  };
  
  const handleRemove = (item: string) => {
    onChange(value.filter(v => v !== item));
  };
  
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button type="button" onClick={() => handleRemove(item)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ["companyMe"],
    queryFn: getCompanyMe,
  });
  
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: getOnboardingStatus,
  });
  
  const { data: settings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: getCompanySettings,
  });
  
  const { data: services } = useQuery({
    queryKey: ["companyServices"],
    queryFn: getCompanyServices,
  });
  
  const { data: documents } = useQuery({
    queryKey: ["companyDocuments"],
    queryFn: getCompanyDocuments,
  });
  
  const startMutation = useMutation({
    mutationFn: startOnboarding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] }),
  });
  
  useEffect(() => {
    if (status?.onboardingStatus === "not_started") {
      startMutation.mutate();
    }
  }, [status?.onboardingStatus]);
  
  useEffect(() => {
    if (status?.onboardingStatus === "completed") {
      navigate("/app");
    }
  }, [status?.onboardingStatus, navigate]);
  
  const isAdmin = user?.role === "CompanyAdmin";
  
  const steps = [
    { title: "Company Profile", icon: Building2, description: "Enter your organisation details" },
    { title: "Services Delivered", icon: ListChecks, description: "Review and confirm your service offerings" },
    { title: "Documents", icon: FileText, description: "Upload compliance documents" },
    { title: "Review & Complete", icon: CheckCircle2, description: "Finalise your onboarding" },
  ];
  
  if (statusLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Company Onboarding</h1>
          <p className="text-muted-foreground mt-1">Complete the setup to start using the platform</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <button
                key={step.title}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors min-w-max ${
                  isActive 
                    ? "border-primary bg-primary/10 text-primary" 
                    : isCompleted 
                    ? "border-green-500/50 bg-green-500/10 text-green-600"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
                data-testid={`step-${index}`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs opacity-70">{step.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-6">
            {currentStep === 0 && (
              <Step1CompanyProfile 
                settings={settings} 
                onNext={() => setCurrentStep(1)}
                isAdmin={isAdmin}
              />
            )}
            {currentStep === 1 && (
              <Step2ServicesDelivered 
                services={services}
                isAdmin={isAdmin}
                onNext={() => setCurrentStep(2)}
                onBack={() => setCurrentStep(0)}
              />
            )}
            {currentStep === 2 && (
              <Step3Documents 
                documents={documents || []}
                onShowAddDialog={() => setShowAddDocDialog(true)}
                onNext={() => setCurrentStep(3)}
                onBack={() => setCurrentStep(1)}
                isAdmin={isAdmin}
              />
            )}
            {currentStep === 3 && (
              <Step4ReviewSubmit 
                status={status}
                settings={settings}
                servicesCount={services?.totalSelected || 0}
                documentsCount={documents?.length || 0}
                onBack={() => setCurrentStep(2)}
                isAdmin={isAdmin}
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      <AddDocumentDialog 
        open={showAddDocDialog} 
        onOpenChange={setShowAddDocDialog} 
      />
    </div>
  );
}

function Step1CompanyProfile({ 
  settings, 
  onNext,
  isAdmin,
}: { 
  settings: any; 
  onNext: () => void;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsInput>({
    tradingName: settings?.tradingName || "",
    businessAddress: settings?.businessAddress || "",
    primaryPhone: settings?.primaryPhone || "",
    ndisRegistrationGroups: settings?.ndisRegistrationGroups || [],
    operatingRegions: settings?.operatingRegions || [],
    supportDeliveryContexts: settings?.supportDeliveryContexts || [],
    keyRisksSummary: settings?.keyRisksSummary || "",
    documentRetentionNote: settings?.documentRetentionNote || "",
  });
  
  useEffect(() => {
    if (settings) {
      setForm({
        tradingName: settings.tradingName || "",
        businessAddress: settings.businessAddress || "",
        primaryPhone: settings.primaryPhone || "",
        ndisRegistrationGroups: settings.ndisRegistrationGroups || [],
        operatingRegions: settings.operatingRegions || [],
        supportDeliveryContexts: settings.supportDeliveryContexts || [],
        keyRisksSummary: settings.keyRisksSummary || "",
        documentRetentionNote: settings.documentRetentionNote || "",
      });
    }
  }, [settings]);
  
  const saveMutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      onNext();
    },
  });
  
  const handleSave = () => {
    saveMutation.mutate(form);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Company Profile</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your organisation's operational details</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tradingName">Trading Name</Label>
          <Input 
            id="tradingName"
            value={form.tradingName || ""}
            onChange={(e) => setForm({ ...form, tradingName: e.target.value })}
            data-testid="input-trading-name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="primaryPhone">Primary Phone</Label>
          <Input 
            id="primaryPhone"
            value={form.primaryPhone || ""}
            onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}
            data-testid="input-primary-phone"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="businessAddress">Business Address</Label>
          <Input 
            id="businessAddress"
            value={form.businessAddress || ""}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            data-testid="input-business-address"
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>NDIS Registration Groups</Label>
          <ChipInput 
            value={form.ndisRegistrationGroups || []}
            onChange={(v) => setForm({ ...form, ndisRegistrationGroups: v })}
            placeholder="Add registration group..."
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Operating Regions</Label>
          <ChipInput 
            value={form.operatingRegions || []}
            onChange={(v) => setForm({ ...form, operatingRegions: v })}
            placeholder="Add region/suburb..."
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label>Support Delivery Contexts</Label>
          <ChipInput 
            value={form.supportDeliveryContexts || []}
            onChange={(v) => setForm({ ...form, supportDeliveryContexts: v })}
            placeholder="e.g. SIL, Community Access, Centre-Based..."
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="keyRisksSummary">Key Risks Summary (optional)</Label>
          <Textarea 
            id="keyRisksSummary"
            value={form.keyRisksSummary || ""}
            onChange={(e) => setForm({ ...form, keyRisksSummary: e.target.value })}
            placeholder="Brief description of key operational risks..."
            data-testid="input-key-risks"
          />
        </div>
      </div>
      
      {saveMutation.error && (
        <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
      )}
      
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">Only CompanyAdmin can modify profile settings.</p>
      )}
      
      <div className="flex justify-end">
        <Button onClick={isAdmin ? handleSave : onNext} disabled={saveMutation.isPending} data-testid="button-save-profile">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isAdmin ? "Save & Continue" : "Continue"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Step2ServicesDelivered({ 
  services, 
  isAdmin,
  onNext,
  onBack,
}: { 
  services: any; 
  isAdmin: boolean;
  onNext: () => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"ALL" | "CATEGORY" | "CUSTOM">(services?.mode || "CUSTOM");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (services) {
      setMode(services.mode);
      const selected = new Set<string>();
      services.categories.forEach((cat: any) => {
        cat.items.forEach((item: any) => {
          if (item.isSelected) selected.add(item.id);
        });
      });
      setSelectedItems(selected);
    }
  }, [services]);
  
  const saveMutation = useMutation({
    mutationFn: updateCompanyServices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyServices"] });
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      onNext();
    },
  });
  
  const handleSave = () => {
    let input: ServicesUpdateInput;
    
    if (mode === "ALL") {
      input = { mode: "ALL" };
    } else if (mode === "CATEGORY") {
      input = { mode: "CATEGORY", selectedCategoryIds: Array.from(selectedCategories) };
    } else {
      input = { mode: "CUSTOM", selectedLineItemIds: Array.from(selectedItems) };
    }
    
    saveMutation.mutate(input);
  };
  
  const toggleItem = (itemId: string) => {
    if (!isAdmin) return;
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
    setMode("CUSTOM");
  };
  
  const toggleCategory = (categoryId: string) => {
    if (!isAdmin) return;
    const category = services?.categories.find((c: any) => c.categoryId === categoryId);
    if (!category) return;
    
    const allSelected = category.items.every((item: any) => selectedItems.has(item.id));
    const newSet = new Set(selectedItems);
    
    category.items.forEach((item: any) => {
      if (allSelected) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
    });
    
    setSelectedItems(newSet);
    setMode("CUSTOM");
  };
  
  const selectAll = () => {
    if (!isAdmin) return;
    setMode("ALL");
    const all = new Set<string>();
    services?.categories.forEach((cat: any) => {
      cat.items.forEach((item: any) => {
        all.add(item.id);
      });
    });
    setSelectedItems(all);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Services Delivered</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {isAdmin 
            ? "Review and adjust your service offerings" 
            : "Review your current service offerings (CompanyAdmin required to edit)"}
        </p>
      </div>
      
      {isAdmin && (
        <div className="flex gap-2">
          <Button 
            variant={mode === "ALL" ? "default" : "outline"} 
            size="sm"
            onClick={selectAll}
          >
            Select All
          </Button>
        </div>
      )}
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {services?.categories.map((category: any) => {
          const selectedCount = category.items.filter((i: any) => selectedItems.has(i.id)).length;
          const allSelected = selectedCount === category.items.length;
          
          return (
            <Card key={category.categoryId} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={() => toggleCategory(category.categoryId)}
                    />
                  )}
                  <h3 className="font-medium">{category.categoryLabel}</h3>
                </div>
                <Badge variant="outline">{selectedCount}/{category.items.length}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {category.items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      selectedItems.has(item.id) ? "bg-primary/10" : "bg-muted/50"
                    }`}
                  >
                    {isAdmin ? (
                      <Checkbox 
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${selectedItems.has(item.id) ? "bg-primary" : "bg-muted-foreground/30"}`} />
                    )}
                    <Badge variant="outline" className="font-mono text-xs">{item.itemCode}</Badge>
                    <span className="text-muted-foreground truncate">{item.itemLabel}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Selected: {selectedItems.size} services</span>
      </div>
      
      {saveMutation.error && (
        <p className="text-sm text-destructive">{(saveMutation.error as Error).message}</p>
      )}
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={isAdmin ? handleSave : onNext} disabled={saveMutation.isPending} data-testid="button-save-services">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isAdmin ? "Save & Continue" : "Continue"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Step3Documents({ 
  documents, 
  onShowAddDialog,
  onNext,
  onBack,
  isAdmin,
}: { 
  documents: any[]; 
  onShowAddDialog: () => void;
  onNext: () => void;
  onBack: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Compliance Documents</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload or link your foundational policy and compliance documents
        </p>
      </div>
      
      {documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
            <p className="text-sm text-destructive mb-4">At least one document is required to complete onboarding</p>
            {isAdmin ? (
              <Button onClick={onShowAddDialog} data-testid="button-add-first-document">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Document
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Only CompanyAdmin can add documents.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={onShowAddDialog} data-testid="button-add-document">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>
          )}
          
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {doc.storageKind === "upload" ? (
                      <Upload className="h-5 w-5 text-primary mt-1" />
                    ) : (
                      <Link className="h-5 w-5 text-blue-500 mt-1" />
                    )}
                    <div>
                      <h4 className="font-medium">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{DOC_TYPE_LABELS[doc.docType as DocType]}</Badge>
                        {doc.fileName && (
                          <span className="text-xs text-muted-foreground">{doc.fileName}</span>
                        )}
                        {doc.externalLink && (
                          <a href={doc.externalLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                            View Link
                          </a>
                        )}
                      </div>
                      {doc.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={documents.length === 0} data-testid="button-continue-documents">
          Continue
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function Step4ReviewSubmit({ 
  status, 
  settings, 
  servicesCount,
  documentsCount,
  onBack,
  isAdmin,
}: { 
  status: any; 
  settings: any; 
  servicesCount: number;
  documentsCount: number;
  onBack: () => void;
  isAdmin: boolean;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      navigate("/app");
    },
  });
  
  const checklist = status?.checklist || {};
  const canComplete = checklist.hasCompanySettings && checklist.hasAtLeastOneServiceSelected && checklist.hasAtLeastOneDocumentUploadedOrLinked;
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review & Complete</h2>
        <p className="text-muted-foreground text-sm mt-1">Review your setup and complete the onboarding</p>
      </div>
      
      <div className="space-y-4">
        <Card className={`p-4 ${checklist.hasCompanySettings ? "border-green-500/50" : "border-destructive/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${checklist.hasCompanySettings ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Company Profile</h4>
              {settings?.tradingName && (
                <p className="text-sm text-muted-foreground">{settings.tradingName}</p>
              )}
            </div>
            {checklist.hasCompanySettings ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-sm text-destructive">Not configured</span>
            )}
          </div>
        </Card>
        
        <Card className={`p-4 ${checklist.hasAtLeastOneServiceSelected ? "border-green-500/50" : "border-destructive/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${checklist.hasAtLeastOneServiceSelected ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Services Delivered</h4>
              <p className="text-sm text-muted-foreground">{servicesCount} services selected</p>
            </div>
            {checklist.hasAtLeastOneServiceSelected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-sm text-destructive">No services selected</span>
            )}
          </div>
        </Card>
        
        <Card className={`p-4 ${checklist.hasAtLeastOneDocumentUploadedOrLinked ? "border-green-500/50" : "border-destructive/50"}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${checklist.hasAtLeastOneDocumentUploadedOrLinked ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Compliance Documents</h4>
              <p className="text-sm text-muted-foreground">{documentsCount} documents</p>
            </div>
            {checklist.hasAtLeastOneDocumentUploadedOrLinked ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <span className="text-sm text-destructive">No documents</span>
            )}
          </div>
        </Card>
      </div>
      
      {completeMutation.error && (
        <p className="text-sm text-destructive">{(completeMutation.error as Error).message}</p>
      )}
      
      {!isAdmin && (
        <p className="text-sm text-muted-foreground">Only CompanyAdmin can complete the onboarding process.</p>
      )}
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={() => completeMutation.mutate()} 
          disabled={!canComplete || completeMutation.isPending || !isAdmin}
          data-testid="button-complete-onboarding"
        >
          {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Complete Onboarding
          <CheckCircle2 className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function AddDocumentDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [docType, setDocType] = useState<DocType>("policy_pack");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (mode === "upload" && file) {
        return uploadDocument(file, docType, title, notes || undefined);
      } else {
        return addDocumentLink({ docType, title, externalLink, notes: notes || undefined });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      onOpenChange(false);
      setTitle("");
      setNotes("");
      setExternalLink("");
      setFile(null);
    },
  });
  
  const canSubmit = title.trim() && (
    (mode === "upload" && file) || 
    (mode === "link" && externalLink.trim())
  );
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>Upload a file or add a link to an external document</DialogDescription>
        </DialogHeader>
        
        <Tabs value={mode} onValueChange={(v) => setMode(v as "upload" | "link")}>
          <TabsList className="w-full">
            <TabsTrigger value="upload" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              <Link className="h-4 w-4 mr-2" />
              External Link
            </TabsTrigger>
          </TabsList>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocType)}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title..."
                data-testid="input-doc-title"
              />
            </div>
            
            <TabsContent value="upload" className="mt-0 space-y-2">
              <Label>File</Label>
              <Input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                data-testid="input-doc-file"
              />
              <p className="text-xs text-muted-foreground">Max 20MB. PDF, Word, Excel, PNG, JPG accepted.</p>
            </TabsContent>
            
            <TabsContent value="link" className="mt-0 space-y-2">
              <Label>External Link (e.g. OneDrive, SharePoint)</Label>
              <Input 
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://..."
                data-testid="input-doc-link"
              />
            </TabsContent>
            
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                data-testid="input-doc-notes"
              />
            </div>
          </div>
        </Tabs>
        
        {uploadMutation.error && (
          <p className="text-sm text-destructive">{(uploadMutation.error as Error).message}</p>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => uploadMutation.mutate()} 
            disabled={!canSubmit || uploadMutation.isPending}
            data-testid="button-submit-document"
          >
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {mode === "upload" ? "Upload" : "Add Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
