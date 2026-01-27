import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  CreditCard, 
  Building2, 
  Users, 
  DollarSign,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  RefreshCw,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const apiBase = "/api/console/billing";

async function apiFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

type BillingStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INACTIVE";

interface BillingTenant {
  id: string;
  companyId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingStatus: BillingStatus;
  currentSeatPriceCents: number | null;
  currency: string;
  trialEndsAt: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  company?: {
    id: string;
    code: string;
    legalName: string;
    primaryContactEmail: string;
    status: string;
  };
}

interface BillingPlan {
  id: string;
  name: string;
  defaultSeatPriceCents: number;
  currency: string;
  stripePriceId: string | null;
  isActive: boolean;
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | BillingStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["/api/console/billing/tenants"],
    queryFn: () => apiFetch("/tenants"),
    refetchInterval: 30000,
  });

  const { data: plans } = useQuery({
    queryKey: ["/api/console/billing/plans"],
    queryFn: () => apiFetch("/plans"),
  });

  const createPlanMutation = useMutation({
    mutationFn: (data: { name: string; defaultSeatPriceCents: number }) => 
      apiFetch("/plans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/console/billing/plans"] });
      setCreatePlanOpen(false);
      setNewPlanName("");
      setNewPlanPrice("");
    },
  });

  const filteredTenants = (tenants || []).filter((t: BillingTenant) => {
    const matchesStatus = statusFilter === "all" || t.billingStatus === statusFilter;
    const matchesSearch = !searchQuery || 
      t.company?.legalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company?.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: (tenants || []).length,
    active: (tenants || []).filter((t: BillingTenant) => t.billingStatus === "ACTIVE").length,
    trial: (tenants || []).filter((t: BillingTenant) => t.billingStatus === "TRIAL").length,
    pastDue: (tenants || []).filter((t: BillingTenant) => t.billingStatus === "PAST_DUE").length,
    inactive: (tenants || []).filter((t: BillingTenant) => 
      t.billingStatus === "INACTIVE" || t.billingStatus === "CANCELED"
    ).length,
  };

  const getStatusBadge = (status: BillingStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">Active</Badge>;
      case "TRIAL":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20">Trial</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/20">Past Due</Badge>;
      case "CANCELED":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/20">Canceled</Badge>;
      default:
        return <Badge variant="secondary">Inactive</Badge>;
    }
  };

  const formatCurrency = (cents: number | null, currency: string = "aud") => {
    if (cents === null) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  if (tenantsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading billing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage subscription billing, seat pricing, and one-time charges for all tenants
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.trial}</p>
                <p className="text-xs text-muted-foreground">Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.pastDue}</p>
                <p className="text-xs text-muted-foreground">Past Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Billing Plans</CardTitle>
              <CardDescription>Manage seat-based pricing plans</CardDescription>
            </div>
            <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-plan">
                  <Plus className="h-4 w-4 mr-2" />
                  New Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Billing Plan</DialogTitle>
                  <DialogDescription>
                    Create a new seat-based pricing plan. This will also create the price in Stripe.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="planName">Plan Name</Label>
                    <Input
                      id="planName"
                      value={newPlanName}
                      onChange={(e) => setNewPlanName(e.target.value)}
                      placeholder="e.g., Standard"
                      data-testid="input-plan-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planPrice">Price per Seat (AUD)</Label>
                    <Input
                      id="planPrice"
                      type="number"
                      value={newPlanPrice}
                      onChange={(e) => setNewPlanPrice(e.target.value)}
                      placeholder="e.g., 49.00"
                      data-testid="input-plan-price"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreatePlanOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createPlanMutation.mutate({
                      name: newPlanName,
                      defaultSeatPriceCents: Math.round(parseFloat(newPlanPrice) * 100),
                    })}
                    disabled={!newPlanName || !newPlanPrice || createPlanMutation.isPending}
                    data-testid="button-save-plan"
                  >
                    {createPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {(plans || []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No billing plans yet. Create one to get started.
            </p>
          ) : (
            <div className="grid gap-2">
              {(plans || []).map((plan: BillingPlan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-3 rounded-[var(--radius)] border bg-card"
                  data-testid={`plan-${plan.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(plan.defaultSeatPriceCents, plan.currency)} per seat/month
                      </p>
                    </div>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Tenant Billing</CardTitle>
              <CardDescription>Manage billing for each tenant</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search tenants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px]"
                data-testid="input-search-tenants"
              />
            </div>
          </div>
          
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="ACTIVE">Active ({stats.active})</TabsTrigger>
              <TabsTrigger value="TRIAL">Trial ({stats.trial})</TabsTrigger>
              <TabsTrigger value="PAST_DUE">Past Due ({stats.pastDue})</TabsTrigger>
              <TabsTrigger value="INACTIVE">Inactive ({stats.inactive})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tenants match your filters
            </p>
          ) : (
            <div className="space-y-2">
              {filteredTenants.map((tenant: BillingTenant) => (
                <Link key={tenant.id} href={`/console/billing/${tenant.companyId}`}>
                  <div
                    className="flex items-center justify-between p-4 rounded-[var(--radius)] border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    data-testid={`tenant-billing-${tenant.companyId}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tenant.company?.legalName || "Unknown"}</p>
                          {tenant.company?.code && (
                            <Badge variant="outline" className="font-mono text-xs">
                              {tenant.company.code}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(tenant.currentSeatPriceCents, tenant.currency)}/seat
                          </span>
                          {tenant.stripeCustomerId && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              Customer linked
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(tenant.billingStatus)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
