import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCompany } from "@/lib/console-api";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { format } from "date-fns";

export default function CompanyDetailsPage() {
  const [, params] = useRoute("/console/companies/:id");
  const companyId = params?.id;

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => getCompany(companyId!),
    enabled: !!companyId,
  });

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
            <h2 className="text-2xl font-bold tracking-tight">{company.legalName}</h2>
            <Badge variant="outline" className="capitalize gap-1 pl-1.5">
              {getStatusIcon(company.status)}
              {company.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-muted-foreground/70">ID: {company.id}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {format(new Date(company.createdAt), 'PPP')}
            </span>
          </p>
        </div>
        <Button variant="outline">Edit Details</Button>
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
                {[
                  { label: "Company Admin", desc: "Full access" },
                  { label: "Auditor", desc: "Read-only + Compliance" },
                  { label: "Reviewer", desc: "Case review access" },
                  { label: "Staff (Read Only)", desc: "Limited view" },
                ].map((role) => (
                  <div key={role.label} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50 transition-colors">
                    <span className="font-medium">{role.label}</span>
                    <span className="text-xs text-muted-foreground">{role.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground text-center w-full">
                Roles are immutable at tenant level.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
