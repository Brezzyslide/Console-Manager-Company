import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCompanies, Company } from "@/lib/console-api";
import { Plus, Search, Building2, MoreHorizontal, Calendar, Globe, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function CompaniesListPage() {
  const { data: companies, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const getStatusColor = (status: Company['status']) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
      case 'suspended': return 'bg-destructive/15 text-destructive dark:text-red-400 border-destructive/20';
      case 'onboarding': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold">Failed to load companies</h3>
        <p className="text-muted-foreground">{(error as Error).message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Companies</h2>
          <p className="text-muted-foreground mt-1">Manage tenant organizations and their subscriptions.</p>
        </div>
        <Link href="/console/companies/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" />
            Create Company
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search companies..." 
            className="pl-9 bg-card" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Filter</Button>
          <Button variant="outline" size="sm">Sort</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 p-4 bg-muted/30 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div>Company</div>
          <div>Primary Contact</div>
          <div>Status</div>
          <div>Created</div>
          <div className="w-[40px]"></div>
        </div>
        
        <div className="divide-y divide-border">
          {companies?.map((company) => (
            <div key={company.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 p-4 items-center hover:bg-muted/20 transition-colors">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="overflow-hidden">
                    <Link href={`/console/companies/${company.id}`}>
                      <p className="font-semibold truncate cursor-pointer hover:text-primary transition-colors">
                        {company.legalName}
                      </p>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {company.abn && <span>ABN: {company.abn}</span>}
                      {company.timezone && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {company.timezone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{company.primaryContactName}</p>
                <p className="text-xs text-muted-foreground truncate">{company.primaryContactEmail}</p>
              </div>

              <div>
                <Badge variant="outline" className={`${getStatusColor(company.status)} capitalize`}>
                  {company.status}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(company.createdAt), 'MMM d, yyyy')}
              </div>

              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <Link href={`/console/companies/${company.id}`}>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem>Manage Subscription</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Suspend Tenant</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          
          {companies?.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No companies found</h3>
              <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                Get started by creating your first tenant organization.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
