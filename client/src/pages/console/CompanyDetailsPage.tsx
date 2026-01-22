import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCompany, updateCompany, updateCompanySchema, CompanyDetails, UpdateCompanyInput, getCompanyUsers, resetCompanyUserPassword, CompanyUser } from "@/lib/console-api";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Globe, 
  Calendar, 
  ShieldCheck, 
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  ListChecks,
  Pencil,
  KeyRound,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

const TIMEZONE_OPTIONS = [
  "Australia/Melbourne",
  "Australia/Sydney", 
  "Australia/Brisbane",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Hobart",
];

const COMPLIANCE_OPTIONS = [
  { value: "Core", label: "Core Supports" },
  { value: "SIL", label: "Supported Independent Living" },
  { value: "BSP", label: "Behaviour Support" },
  { value: "Medication", label: "Medication Management" },
];

export default function CompanyDetailsPage() {
  const [, params] = useRoute("/console/companies/:id");
  const companyId = params?.id;
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCompliance, setSelectedCompliance] = useState<string[]>([]);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword: string; email: string; fullName: string } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => getCompany(companyId!),
    enabled: !!companyId,
  });

  const { data: companyUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["companyUsers", companyId],
    queryFn: () => getCompanyUsers(companyId!),
    enabled: !!companyId,
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => resetCompanyUserPassword(companyId!, userId),
    onSuccess: (result) => {
      setResetResult(result);
      setShowPasswordDialog(true);
      setCopiedPassword(false);
      queryClient.invalidateQueries({ queryKey: ["companyUsers", companyId] });
    },
  });

  const handleCopyPassword = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCompanyInput) => updateCompany(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      setShowEditDialog(false);
    },
  });

  const openEditDialog = () => {
    if (company) {
      form.reset({
        legalName: company.legalName,
        abn: company.abn || "",
        ndisRegistrationNumber: company.ndisRegistrationNumber || "",
        primaryContactName: company.primaryContactName,
        primaryContactEmail: company.primaryContactEmail,
        timezone: company.timezone,
        status: company.status,
      });
      setSelectedCompliance(company.complianceScope || []);
      setShowEditDialog(true);
    }
  };

  const onSubmit = (data: UpdateCompanyInput) => {
    updateMutation.mutate({ ...data, complianceScope: selectedCompliance });
  };

  const toggleCompliance = (value: string) => {
    setSelectedCompliance(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <div className="bg-muted p-4 rounded-full">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Company not found</h2>
        <p className="text-muted-foreground">{error ? (error as Error).message : "Company ID invalid"}</p>
        <Link href="/console/companies">
          <Button variant="outline">Return to Companies</Button>
        </Link>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'suspended': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'onboarding': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/console/companies">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {company.code && (
              <span className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded">{company.code}</span>
            )}
            <h2 className="text-2xl font-bold tracking-tight">{company.legalName}</h2>
            <Badge variant="outline" className="capitalize gap-1 pl-1.5">
              {getStatusIcon(company.status)}
              {company.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {format(new Date(company.createdAt), 'PPP')}
            </span>
          </p>
        </div>
        <Button variant="outline" onClick={openEditDialog} data-testid="button-edit-company">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Details
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Legal Name</div>
                  <div className="font-medium">{company.legalName}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ABN</div>
                  <div className="font-mono text-sm">{company.abn || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">NDIS Registration</div>
                  <div className="font-mono text-sm">{company.ndisRegistrationNumber || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timezone</div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    {company.timezone}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Contact</div>
                <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {company.primaryContactName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{company.primaryContactName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {company.primaryContactEmail}
                    </div>
                  </div>
                  <Badge className="ml-auto" variant="secondary">Company Admin</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Compliance & Scope
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {company.complianceScope.map((scope) => (
                  <Badge key={scope} variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                    {scope}
                  </Badge>
                ))}
                {company.complianceScope.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">No compliance scope configured.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Company Users
                </CardTitle>
                <Badge variant="secondary">{companyUsers.length} users</Badge>
              </div>
              <CardDescription>
                Manage users within this tenant organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : companyUsers.length > 0 ? (
                <div className="space-y-3">
                  {companyUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20" data-testid={`user-row-${user.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.fullName}
                            {!user.isActive && (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{user.role}</Badge>
                        {user.mustResetPassword && (
                          <Badge variant="secondary" className="text-xs">Password Reset Required</Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetPasswordMutation.mutate(user.id)}
                          disabled={resetPasswordMutation.isPending}
                          data-testid={`button-reset-password-${user.id}`}
                        >
                          {resetPasswordMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <KeyRound className="h-4 w-4 mr-1" />
                              Reset Password
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">No users found.</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Services Delivered
                </CardTitle>
                {company.serviceSelection && (
                  <Badge variant="secondary">
                    {company.serviceSelection.totalSelected} line items
                  </Badge>
                )}
              </div>
              <CardDescription>
                NDIS in-scope supports configured for this provider.
                {company.serviceSelectionMode && (
                  <span className="ml-1">
                    Selection mode: <span className="font-medium">{company.serviceSelectionMode}</span>
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {company.serviceSelection && company.serviceSelection.byCategory.length > 0 ? (
                <div className="space-y-4">
                  {company.serviceSelection.byCategory.map((cat) => (
                    <div key={cat.categoryKey} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">{cat.categoryLabel}</h4>
                        <Badge variant="outline" className="text-xs">{cat.items.length} items</Badge>
                      </div>
                      <div className="grid gap-1 pl-2 border-l-2 border-muted">
                        {cat.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                            <Badge variant="outline" className="font-mono text-xs">{item.itemCode}</Badge>
                            <span className="text-muted-foreground">{item.itemLabel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">No services configured.</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-muted/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Provisioned Roles
              </CardTitle>
              <CardDescription>
                Default roles available in this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {company.roles?.map((role) => (
                  <div key={role.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 transition-colors" data-testid={`role-${role.roleKey}`}>
                    <span className="font-medium">{role.roleLabel}</span>
                    <span className="text-xs text-muted-foreground font-mono">{role.roleKey}</span>
                  </div>
                ))}
                {(!company.roles || company.roles.length === 0) && (
                  <span className="text-sm text-muted-foreground italic">No roles provisioned.</span>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground text-center w-full">
                Roles are immutable at tenant level.
              </p>
            </CardFooter>
          </Card>
          
          {company.adminEmail && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Company Admin
                </CardTitle>
                <CardDescription>
                  Initial administrator for this tenant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium" data-testid="admin-name">{company.adminName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid="admin-email">{company.adminEmail}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company Details</DialogTitle>
            <DialogDescription>
              Update the company information below.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input
                  id="legalName"
                  {...form.register("legalName")}
                  data-testid="input-legal-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  {...form.register("abn")}
                  data-testid="input-abn"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ndisRegistrationNumber">NDIS Registration Number</Label>
                <Input
                  id="ndisRegistrationNumber"
                  {...form.register("ndisRegistrationNumber")}
                  data-testid="input-ndis-reg"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch("timezone")}
                  onValueChange={(value) => form.setValue("timezone", value)}
                >
                  <SelectTrigger data-testid="select-timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primaryContactName">Primary Contact Name</Label>
                <Input
                  id="primaryContactName"
                  {...form.register("primaryContactName")}
                  data-testid="input-contact-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="primaryContactEmail">Primary Contact Email</Label>
                <Input
                  id="primaryContactEmail"
                  type="email"
                  {...form.register("primaryContactEmail")}
                  data-testid="input-contact-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value: any) => form.setValue("status", value)}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Compliance Scope</Label>
              <div className="grid grid-cols-2 gap-2">
                {COMPLIANCE_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`compliance-${option.value}`}
                      checked={selectedCompliance.includes(option.value)}
                      onCheckedChange={() => toggleCompliance(option.value)}
                      data-testid={`checkbox-compliance-${option.value}`}
                    />
                    <Label htmlFor={`compliance-${option.value}`} className="text-sm font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            {updateMutation.error && (
              <p className="text-sm text-destructive">{(updateMutation.error as Error).message}</p>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-company">
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Password Reset Successful
            </DialogTitle>
            <DialogDescription>
              A new temporary password has been generated for this user.
            </DialogDescription>
          </DialogHeader>
          
          {resetResult && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">User</div>
                <div className="font-medium">{resetResult.fullName}</div>
                <div className="text-sm text-muted-foreground">{resetResult.email}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Temporary Password</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm border" data-testid="temp-password-display">
                    {resetResult.tempPassword}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    data-testid="button-copy-password"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  The user will be required to set a new password on their next login.
                  Please share this temporary password securely.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowPasswordDialog(false)} data-testid="button-close-password-dialog">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
