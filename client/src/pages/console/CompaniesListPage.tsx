import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCompanies, Company } from "@/lib/console-api";
import { 
  Plus, 
  Search, 
  Building2, 
  MoreHorizontal, 
  Calendar, 
  Globe, 
  Loader2, 
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Hash,
  ChevronRight
} from "lucide-react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type StatusFilter = "all" | "active" | "onboarding" | "suspended";

export default function CompaniesListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  const { data: companies, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
  });

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    
    return companies.filter((company) => {
      const matchesSearch = searchQuery === "" || 
        company.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.primaryContactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.primaryContactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (company.abn && company.abn.includes(searchQuery)) ||
        (company.code && company.code.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === "all" || company.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    if (!companies) return { total: 0, active: 0, onboarding: 0, suspended: 0 };
    
    return {
      total: companies.length,
      active: companies.filter(c => c.status === "active").length,
      onboarding: companies.filter(c => c.status === "onboarding").length,
      suspended: companies.filter(c => c.status === "suspended").length,
    };
  }, [companies]);

  const getStatusColor = (status: Company['status']) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
      case 'suspended': return 'bg-destructive/15 text-destructive dark:text-red-400 border-destructive/20';
      case 'onboarding': return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: Company['status']) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'onboarding': return <Clock className="h-4 w-4 text-amber-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white animate-pulse" />
          </div>
          <Loader2 className="h-16 w-16 animate-spin text-primary absolute -top-2 -left-2" />
        </div>
        <p className="text-muted-foreground text-sm">Loading companies...</p>
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">
            <span className="text-gradient-accent">Company Directory</span>
          </h2>
          <p className="text-muted-foreground">Manage all registered NDIS provider organizations.</p>
        </div>
        <Link href="/console/companies/new" data-testid="link-create-company">
          <Button className="gradient-accent text-white hover:opacity-90 shadow-lg" data-testid="button-create-company">
            <Plus className="mr-2 h-4 w-4" />
            New Company
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card border-border/50 overflow-hidden" data-testid="stat-total">
          <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Companies
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-emerald-500/20 overflow-hidden" data-testid="stat-active">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Active
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold text-emerald-400">{stats.active}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-amber-500/20 overflow-hidden" data-testid="stat-onboarding">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2 text-amber-400">
              <Clock className="h-4 w-4" />
              Onboarding
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold text-amber-400">{stats.onboarding}</p>
          </CardContent>
        </Card>
        
        <Card className="glass-card border-red-500/20 overflow-hidden" data-testid="stat-suspended">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2 relative">
            <CardDescription className="flex items-center gap-2 text-red-400">
              <XCircle className="h-4 w-4" />
              Suspended
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold text-red-400">{stats.suspended}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, contact, email, or ABN..." 
            className="pl-10 bg-muted/30 border-border/50 focus:border-accent" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>
        
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all" data-testid="filter-all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="filter-active">
              Active ({stats.active})
            </TabsTrigger>
            <TabsTrigger value="onboarding" data-testid="filter-onboarding">
              Onboarding ({stats.onboarding})
            </TabsTrigger>
            <TabsTrigger value="suspended" data-testid="filter-suspended">
              Suspended ({stats.suspended})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {filteredCompanies.map((company) => (
          <Card 
            key={company.id} 
            className="glass-card border-border/50 hover:border-accent/30 hover-lift transition-all group"
            data-testid={`card-company-${company.id}`}
          >
            <CardContent className="p-0">
              <Link href={`/console/companies/${company.id}`} data-testid={`link-company-${company.id}`}>
                <div className="p-5 flex items-center gap-5 cursor-pointer">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center shrink-0 group-hover:from-primary/15 group-hover:to-primary/30 transition-colors">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {company.code && (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded shrink-0">{company.code}</span>
                        )}
                        <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                          {company.legalName}
                        </h3>
                        <Badge variant="outline" className={`${getStatusColor(company.status)} capitalize shrink-0`}>
                          {getStatusIcon(company.status)}
                          <span className="ml-1">{company.status}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {company.abn && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            ABN: {company.abn}
                          </span>
                        )}
                        {company.ndisRegistrationNumber && company.ndisRegistrationNumber !== "N/A" && (
                          <span className="flex items-center gap-1">
                            NDIS: {company.ndisRegistrationNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{company.primaryContactName}</span>
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{company.primaryContactEmail}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Globe className="h-3 w-3 shrink-0" />
                          {company.timezone}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Created {format(new Date(company.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </Link>
              
              {company.complianceScope && company.complianceScope.length > 0 && (
                <div className="px-5 pb-4 pt-0 flex items-center gap-2 border-t border-dashed mt-0 pt-3">
                  <span className="text-xs text-muted-foreground font-medium">Compliance:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.complianceScope.map((scope) => (
                      <Badge key={scope} variant="secondary" className="text-xs px-2 py-0">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        
        {filteredCompanies.length === 0 && companies && companies.length > 0 && (
          <Card className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No matching companies</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Try adjusting your search query or filters.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
            >
              Clear Filters
            </Button>
          </Card>
        )}
        
        {companies?.length === 0 && (
          <Card className="p-12 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No companies yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              Get started by creating your first NDIS provider organization.
            </p>
            <Link href="/console/companies/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create First Company
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
