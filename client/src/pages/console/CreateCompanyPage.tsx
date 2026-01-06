import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCompany, createCompanySchema, CreateCompanyInput, getSupportCatalogue, CategoryWithItems } from "@/lib/console-api";
import { 
  Building2, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Copy, 
  Info,
  Globe,
  Mail,
  User,
  Hash,
  AlertCircle,
  ListChecks,
  Search,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

const SCOPE_OPTIONS = ["Core", "SIL", "BSP", "Medication"];

export default function CreateCompanyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  const [successData, setSuccessData] = useState<{
    id: string;
    email: string;
    tempPass: string;
    serviceCount: number;
  } | null>(null);

  const { data: catalogue = [], isLoading: catalogueLoading } = useQuery({
    queryKey: ["support-catalogue"],
    queryFn: getSupportCatalogue,
  });

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      legalName: "",
      abn: "",
      ndisRegistrationNumber: "",
      primaryContactName: "",
      primaryContactEmail: "",
      timezone: "Australia/Melbourne",
      complianceScope: ["Core"],
      serviceSelectionMode: "ALL",
      selectedCategoryIds: [],
      selectedLineItemIds: [],
    },
  });

  const serviceSelectionMode = form.watch("serviceSelectionMode");
  const selectedCategoryIds = form.watch("selectedCategoryIds") || [];
  const selectedLineItemIds = form.watch("selectedLineItemIds") || [];

  const totalLineItems = useMemo(() => {
    return catalogue.reduce((acc, cat) => acc + cat.lineItems.length, 0);
  }, [catalogue]);

  const selectedCount = useMemo(() => {
    if (serviceSelectionMode === "ALL") return totalLineItems;
    if (serviceSelectionMode === "CATEGORY") {
      return catalogue
        .filter(cat => selectedCategoryIds.includes(cat.id))
        .reduce((acc, cat) => acc + cat.lineItems.length, 0);
    }
    return selectedLineItemIds.length;
  }, [serviceSelectionMode, selectedCategoryIds, selectedLineItemIds, catalogue, totalLineItems]);

  const filteredCatalogue = useMemo(() => {
    if (!searchQuery.trim()) return catalogue;
    const query = searchQuery.toLowerCase();
    return catalogue.map(cat => ({
      ...cat,
      lineItems: cat.lineItems.filter(item => 
        item.itemLabel.toLowerCase().includes(query) || 
        item.itemCode.toLowerCase().includes(query)
      ),
    })).filter(cat => cat.lineItems.length > 0 || cat.categoryLabel.toLowerCase().includes(query));
  }, [catalogue, searchQuery]);

  const toggleCategorySelection = (categoryId: string, checked: boolean) => {
    const current = form.getValues("selectedCategoryIds") || [];
    if (checked) {
      form.setValue("selectedCategoryIds", [...current, categoryId]);
    } else {
      form.setValue("selectedCategoryIds", current.filter(id => id !== categoryId));
    }
  };

  const toggleLineItemSelection = (itemId: string, checked: boolean) => {
    const current = form.getValues("selectedLineItemIds") || [];
    if (checked) {
      form.setValue("selectedLineItemIds", [...current, itemId]);
    } else {
      form.setValue("selectedLineItemIds", current.filter(id => id !== itemId));
    }
  };

  const selectAllInCategory = (category: CategoryWithItems) => {
    const current = form.getValues("selectedLineItemIds") || [];
    const categoryItemIds = category.lineItems.map(item => item.id);
    const allSelected = categoryItemIds.every(id => current.includes(id));
    
    if (allSelected) {
      form.setValue("selectedLineItemIds", current.filter(id => !categoryItemIds.includes(id)));
    } else {
      const newIds = categoryItemIds.filter(id => !current.includes(id));
      form.setValue("selectedLineItemIds", [...current, ...newIds]);
    }
  };

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: (data) => {
      setSuccessData({
        id: data.company.id,
        email: data.adminEmail,
        tempPass: data.tempPassword,
        serviceCount: data.serviceSelection.selectedCount,
      });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast({
        title: "Company Created",
        description: "The tenant environment has been provisioned successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to create company",
        description: (error as Error).message,
      });
    }
  });

  const onSubmit = (data: CreateCompanyInput) => {
    mutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
    });
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Tenant Provisioned</h2>
          <p className="text-muted-foreground">
            The company environment is ready. Please share these credentials securely.
          </p>
        </div>

        <Card className="border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <CardHeader>
            <CardTitle>Initial Administrator Credentials</CardTitle>
            <CardDescription>
              These credentials grant full administrative access. The user will be required to change their password on first login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="default" className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>One-time Display</AlertTitle>
              <AlertDescription>
                This temporary password will not be shown again. Please copy it now.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Company ID (for login)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={successData.id} className="font-mono text-xs bg-muted/30" data-testid="text-company-id" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(successData.id)} data-testid="button-copy-company-id">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admin Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={successData.email} className="font-mono bg-muted/30" data-testid="text-admin-email" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(successData.email)} data-testid="button-copy-email">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Temporary Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={successData.tempPass} className="font-mono bg-muted/30 text-primary font-bold" data-testid="text-temp-password" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(successData.tempPass)} data-testid="button-copy-password">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Services Configured</span>
                </div>
                <Badge variant="secondary">{successData.serviceCount} line items</Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 justify-end border-t bg-muted/10 py-4">
            <Link href="/console/companies">
              <Button variant="outline">Return to List</Button>
            </Link>
            <Link href={`/console/companies/${successData.id}`}>
              <Button>View Company Details</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/console/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Company</h2>
          <p className="text-muted-foreground">Provision a new tenant environment.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Enter the legal and contact information for the new tenant.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {mutation.error && (
               <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Legal Information
              </h3>
              <Separator />
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal Name <span className="text-destructive">*</span></Label>
                  <Input 
                    id="legalName" 
                    placeholder="e.g. Acme Care Services Pty Ltd" 
                    {...form.register("legalName")}
                    className={form.formState.errors.legalName ? "border-destructive" : ""}
                    data-testid="input-legal-name"
                  />
                  {form.formState.errors.legalName && (
                    <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="abn" 
                        placeholder="00 000 000 000" 
                        className="pl-9"
                        {...form.register("abn")}
                        data-testid="input-abn"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ndis">NDIS Registration Number</Label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="ndis" 
                        placeholder="4-XXXXXXXX" 
                        className="pl-9"
                        {...form.register("ndisRegistrationNumber")}
                        data-testid="input-ndis"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Primary Administrator
              </h3>
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Full Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="contactName" 
                      placeholder="Jane Doe" 
                      className="pl-9"
                      {...form.register("primaryContactName")}
                      data-testid="input-contact-name"
                    />
                  </div>
                  {form.formState.errors.primaryContactName && (
                    <p className="text-sm text-destructive">{form.formState.errors.primaryContactName.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email Address <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="contactEmail" 
                      type="email" 
                      placeholder="jane@company.com" 
                      className="pl-9"
                      {...form.register("primaryContactEmail")}
                      data-testid="input-contact-email"
                    />
                  </div>
                  {form.formState.errors.primaryContactEmail && (
                    <p className="text-sm text-destructive">{form.formState.errors.primaryContactEmail.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Configuration
              </h3>
              <Separator />
              
              <div className="grid gap-6">
                <div className="space-y-2 max-w-md">
                  <Label>Timezone</Label>
                  <Select 
                    onValueChange={(val) => form.setValue("timezone", val)}
                    defaultValue={form.getValues("timezone")}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                      <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                      <SelectItem value="Australia/Adelaide">Australia/Adelaide</SelectItem>
                      <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Compliance Scope</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SCOPE_OPTIONS.map((scope) => (
                      <div key={scope} className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <Checkbox 
                          id={`scope-${scope}`} 
                          checked={form.watch("complianceScope")?.includes(scope)}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("complianceScope") || [];
                            if (checked) {
                              form.setValue("complianceScope", [...current, scope]);
                            } else {
                              form.setValue("complianceScope", current.filter(s => s !== scope));
                            }
                          }}
                          data-testid={`checkbox-scope-${scope.toLowerCase()}`}
                        />
                        <Label htmlFor={`scope-${scope}`} className="cursor-pointer font-normal text-sm w-full">
                          {scope}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Services Delivered (NDIS In-Scope Supports)
                </h3>
                <Badge variant="outline" className="text-primary">
                  {selectedCount} of {totalLineItems} selected
                </Badge>
              </div>
              <Separator />

              {catalogueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <RadioGroup
                    value={serviceSelectionMode}
                    onValueChange={(val) => form.setValue("serviceSelectionMode", val as "ALL" | "CATEGORY" | "CUSTOM")}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3"
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="ALL" id="mode-all" data-testid="radio-mode-all" />
                      <Label htmlFor="mode-all" className="cursor-pointer font-normal text-sm w-full">
                        All services ({totalLineItems})
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="CATEGORY" id="mode-category" data-testid="radio-mode-category" />
                      <Label htmlFor="mode-category" className="cursor-pointer font-normal text-sm w-full">
                        Select by category
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="CUSTOM" id="mode-custom" data-testid="radio-mode-custom" />
                      <Label htmlFor="mode-custom" className="cursor-pointer font-normal text-sm w-full">
                        Select individually
                      </Label>
                    </div>
                  </RadioGroup>

                  {serviceSelectionMode === "CATEGORY" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {catalogue.map((cat) => (
                        <div 
                          key={cat.id} 
                          className={`flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                            selectedCategoryIds.includes(cat.id) ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => toggleCategorySelection(cat.id, !selectedCategoryIds.includes(cat.id))}
                        >
                          <Checkbox 
                            checked={selectedCategoryIds.includes(cat.id)}
                            onCheckedChange={(checked) => toggleCategorySelection(cat.id, !!checked)}
                            data-testid={`checkbox-category-${cat.categoryKey.toLowerCase()}`}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{cat.categoryLabel}</p>
                            <p className="text-xs text-muted-foreground">{cat.lineItems.length} line items</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {serviceSelectionMode === "CUSTOM" && (
                    <div className="space-y-3 mt-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search line items..."
                          className="pl-9"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          data-testid="input-search-items"
                        />
                      </div>

                      <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                        {filteredCatalogue.map((cat) => {
                          const selectedInCategory = cat.lineItems.filter(item => selectedLineItemIds.includes(item.id)).length;
                          return (
                          <Collapsible key={cat.id}>
                            <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                              <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                                <ChevronRight className="h-4 w-4 text-muted-foreground collapsible-chevron" />
                                <span className="font-medium text-sm">{cat.categoryLabel}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {selectedInCategory}/{cat.lineItems.length}
                                </Badge>
                              </CollapsibleTrigger>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectAllInCategory(cat);
                                }}
                              >
                                Toggle all
                              </Button>
                            </div>
                            <CollapsibleContent>
                              <div className="pl-8 pr-3 pb-3 space-y-1">
                                {cat.lineItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors cursor-pointer ${
                                      selectedLineItemIds.includes(item.id) ? "bg-primary/5" : ""
                                    }`}
                                    onClick={() => toggleLineItemSelection(item.id, !selectedLineItemIds.includes(item.id))}
                                  >
                                    <Checkbox
                                      checked={selectedLineItemIds.includes(item.id)}
                                      onCheckedChange={(checked) => toggleLineItemSelection(item.id, !!checked)}
                                      data-testid={`checkbox-item-${item.itemCode}`}
                                    />
                                    <div className="flex-1 flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs font-mono">
                                        {item.itemCode}
                                      </Badge>
                                      <span className="text-sm">{item.itemLabel}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </CardContent>
          <CardFooter className="justify-end border-t bg-muted/10 py-4 gap-4">
            <Link href="/console/companies">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending} className="min-w-[150px]" data-testid="button-create-company">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Provisioning...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Company
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
