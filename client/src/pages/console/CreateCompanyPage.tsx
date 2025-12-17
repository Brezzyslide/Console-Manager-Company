import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConsoleStore } from "@/lib/mock-console-api";
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
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";

const createCompanySchema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string().min(2, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Valid email is required"),
  timezone: z.string().default("Australia/Melbourne"),
  complianceScope: z.array(z.string()).default([]),
});

type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;

const SCOPE_OPTIONS = ["Core", "SIL", "BSP", "Medication", "Complex Care"];

export default function CreateCompanyPage() {
  const [, setLocation] = useLocation();
  const addCompany = useConsoleStore((state) => state.addCompany);
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{
    id: string;
    email: string;
    tempPass: string;
  } | null>(null);

  const form = useForm<CreateCompanyFormValues>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      legalName: "",
      abn: "",
      ndisRegistrationNumber: "",
      primaryContactName: "",
      primaryContactEmail: "",
      timezone: "Australia/Melbourne",
      complianceScope: ["Core"],
    },
  });

  const onSubmit = async (data: CreateCompanyFormValues) => {
    setIsSubmitting(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newCompany = addCompany(data);
      const tempPass = Math.random().toString(36).slice(-10) + "Aa1!";
      
      setSuccessData({
        id: newCompany.id,
        email: newCompany.primaryContactEmail,
        tempPass: tempPass,
      });
      setIsSubmitting(false);
      
      toast({
        title: "Company Created",
        description: "The tenant environment has been provisioned successfully.",
      });
    }, 1500);
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
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Admin Email</Label>
                <div className="flex gap-2">
                  <Input readOnly value={successData.email} className="font-mono bg-muted/30" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(successData.email)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Temporary Password</Label>
                <div className="flex gap-2">
                  <Input readOnly value={successData.tempPass} className="font-mono bg-muted/30 text-primary font-bold" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(successData.tempPass)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
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
            {/* Legal Info Section */}
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
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary Contact Section */}
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
                    />
                  </div>
                  {form.formState.errors.primaryContactEmail && (
                    <p className="text-sm text-destructive">{form.formState.errors.primaryContactEmail.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Config Section */}
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
                    <SelectTrigger>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

          </CardContent>
          <CardFooter className="justify-end border-t bg-muted/10 py-4 gap-4">
            <Link href="/console/companies">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
              {isSubmitting ? (
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
