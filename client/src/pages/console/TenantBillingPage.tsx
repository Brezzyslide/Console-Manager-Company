import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft,
  Building2, 
  CreditCard, 
  DollarSign,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Receipt,
  History,
  Play,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
type ChargeStatus = "DRAFT" | "INVOICED" | "PAID" | "VOID";

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
}

interface Company {
  id: string;
  code: string;
  legalName: string;
  primaryContactEmail: string;
  status: string;
}

interface BillingPlan {
  id: string;
  name: string;
  defaultSeatPriceCents: number;
  currency: string;
  stripePriceId: string | null;
  isActive: boolean;
}

interface OneTimeCharge {
  id: string;
  title: string;
  description: string | null;
  amountCents: number;
  currency: string;
  status: ChargeStatus;
  stripeInvoiceId: string | null;
  createdAt: string;
}

interface SeatOverride {
  id: string;
  overrideSeatPriceCents: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface BillingEvent {
  id: string;
  eventType: string;
  payloadJson: any;
  createdAt: string;
}

export default function TenantBillingPage() {
  const [, params] = useRoute("/console/billing/:companyId");
  const companyId = params?.companyId || "";
  const queryClient = useQueryClient();

  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [chargeTitle, setChargeTitle] = useState("");
  const [chargeDescription, setChargeDescription] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePrice, setOverridePrice] = useState("");
  
  const [startSubOpen, setStartSubOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: [`/api/console/billing/tenants/${companyId}`],
    queryFn: () => apiFetch(`/tenants/${companyId}`),
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const { data: plans } = useQuery({
    queryKey: ["/api/console/billing/plans"],
    queryFn: () => apiFetch("/plans"),
  });

  const tenant: BillingTenant = data?.tenant;
  const company: Company = data?.company;
  const seatOverride: SeatOverride | null = data?.seatOverride;
  const oneTimeCharges: OneTimeCharge[] = data?.oneTimeCharges || [];
  const recentEvents: BillingEvent[] = data?.recentEvents || [];
  const currentSeatCount: number = data?.currentSeatCount || 0;

  const createCustomerMutation = useMutation({
    mutationFn: () => apiFetch(`/tenants/${companyId}/create-customer`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
    },
  });

  const startSubscriptionMutation = useMutation({
    mutationFn: (planId: string) => 
      apiFetch(`/tenants/${companyId}/start-subscription`, { 
        method: "POST", 
        body: JSON.stringify({ planId }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
      setStartSubOpen(false);
    },
  });

  const syncSeatsMutation = useMutation({
    mutationFn: () => apiFetch(`/tenants/${companyId}/sync-seats`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiFetch(`/tenants/${companyId}/cancel-subscription`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
    },
  });

  const createChargeMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; amountCents: number }) => 
      apiFetch("/one-time-charges", { 
        method: "POST", 
        body: JSON.stringify({ ...data, companyId }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
      setAddChargeOpen(false);
      setChargeTitle("");
      setChargeDescription("");
      setChargeAmount("");
    },
  });

  const invoiceChargeMutation = useMutation({
    mutationFn: (chargeId: string) => 
      apiFetch(`/one-time-charges/${chargeId}/invoice`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
    },
  });

  const createOverrideMutation = useMutation({
    mutationFn: (overrideSeatPriceCents: number) => 
      apiFetch("/seat-overrides", { 
        method: "POST", 
        body: JSON.stringify({ companyId, overrideSeatPriceCents }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
      setOverrideOpen(false);
      setOverridePrice("");
    },
  });

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

  const getChargeStatusBadge = (status: ChargeStatus) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20">Paid</Badge>;
      case "INVOICED":
        return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/20">Invoiced</Badge>;
      case "DRAFT":
        return <Badge variant="secondary">Draft</Badge>;
      case "VOID":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/20">Void</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number | null, currency: string = "aud") => {
    if (cents === null) return "—";
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading billing details...</p>
        </div>
      </div>
    );
  }

  if (!tenant || !company) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">Tenant not found</p>
          <Link href="/console/billing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/console/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{company.legalName}</h1>
            {getStatusBadge(tenant.billingStatus)}
          </div>
          <p className="text-muted-foreground text-sm">
            {company.code && <span className="font-mono">{company.code} · </span>}
            {company.primaryContactEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Status:</Label>
          <Select
            value={tenant.billingStatus}
            onValueChange={async (value) => {
              try {
                await apiFetch(`/tenants/${companyId}/status`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: value }),
                });
                queryClient.invalidateQueries({ queryKey: [`/api/console/billing/tenants/${companyId}`] });
                queryClient.invalidateQueries({ queryKey: ["billing-tenants"] });
              } catch (err) {
                console.error("Failed to update status:", err);
              }
            }}
          >
            <SelectTrigger className="w-[140px]" data-testid="select-billing-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAST_DUE">Past Due</SelectItem>
              <SelectItem value="CANCELED">Canceled</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{currentSeatCount}</p>
                <p className="text-xs text-muted-foreground">Seats</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(
                    seatOverride?.overrideSeatPriceCents || tenant.currentSeatPriceCents, 
                    tenant.currency
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Per Seat/Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold truncate max-w-[120px]">
                  {tenant.stripeCustomerId ? "Linked" : "Not Set"}
                </p>
                <p className="text-xs text-muted-foreground">Stripe Customer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {tenant.stripeSubscriptionId ? "Active" : "None"}
                </p>
                <p className="text-xs text-muted-foreground">Subscription</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Subscription Management</CardTitle>
          <CardDescription>Create Stripe customer, manage subscription and sync seats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {!tenant.stripeCustomerId && (
              <Button
                onClick={() => createCustomerMutation.mutate()}
                disabled={createCustomerMutation.isPending}
                data-testid="button-create-customer"
              >
                {createCustomerMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Create Stripe Customer
              </Button>
            )}

            {tenant.stripeCustomerId && !tenant.stripeSubscriptionId && (
              <Dialog open={startSubOpen} onOpenChange={setStartSubOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-start-subscription">
                    <Play className="h-4 w-4 mr-2" />
                    Start Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start Subscription</DialogTitle>
                    <DialogDescription>
                      Select a billing plan to start the subscription for this tenant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Billing Plan</Label>
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger data-testid="select-plan">
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          {(plans || []).filter((p: BillingPlan) => p.isActive).map((plan: BillingPlan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} — {formatCurrency(plan.defaultSeatPriceCents, plan.currency)}/seat
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current seats: <strong>{currentSeatCount}</strong>
                      {seatOverride && (
                        <span className="ml-2">
                          (Override: {formatCurrency(seatOverride.overrideSeatPriceCents, tenant.currency)}/seat)
                        </span>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setStartSubOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => startSubscriptionMutation.mutate(selectedPlanId)}
                      disabled={!selectedPlanId || startSubscriptionMutation.isPending}
                      data-testid="button-confirm-start-subscription"
                    >
                      {startSubscriptionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Start Subscription
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {tenant.stripeSubscriptionId && (
              <>
                <Button
                  variant="outline"
                  onClick={() => syncSeatsMutation.mutate()}
                  disabled={syncSeatsMutation.isPending}
                  data-testid="button-sync-seats"
                >
                  {syncSeatsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sync Seats
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm("Are you sure you want to cancel this subscription?")) {
                      cancelSubscriptionMutation.mutate();
                    }
                  }}
                  disabled={cancelSubscriptionMutation.isPending}
                  data-testid="button-cancel-subscription"
                >
                  {cancelSubscriptionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4 mr-2" />
                  )}
                  Cancel Subscription
                </Button>
              </>
            )}
          </div>

          {tenant.lastSyncedAt && (
            <p className="text-xs text-muted-foreground">
              Last synced: {format(new Date(tenant.lastSyncedAt), "PPpp")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Seat Price Override</CardTitle>
                <CardDescription>Set custom pricing for this tenant</CardDescription>
              </div>
              <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" data-testid="button-set-override">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Set Override
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Price Override</DialogTitle>
                    <DialogDescription>
                      Override the default seat price for this tenant. This will apply to future billing.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Override Price per Seat (AUD)</Label>
                      <Input
                        type="number"
                        value={overridePrice}
                        onChange={(e) => setOverridePrice(e.target.value)}
                        placeholder="e.g., 39.00"
                        data-testid="input-override-price"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOverrideOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createOverrideMutation.mutate(Math.round(parseFloat(overridePrice) * 100))}
                      disabled={!overridePrice || createOverrideMutation.isPending}
                      data-testid="button-save-override"
                    >
                      {createOverrideMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Override
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {seatOverride ? (
              <div className="p-3 rounded-[var(--radius)] bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {formatCurrency(seatOverride.overrideSeatPriceCents, tenant.currency)} per seat
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Active since {format(new Date(seatOverride.effectiveFrom), "PP")}
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No price override set. Using default plan pricing.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">One-Time Charges</CardTitle>
                <CardDescription>Setup fees, add-ons, and custom charges</CardDescription>
              </div>
              <Dialog open={addChargeOpen} onOpenChange={setAddChargeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-charge">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Charge
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add One-Time Charge</DialogTitle>
                    <DialogDescription>
                      Create a one-time charge for setup fees, add-ons, or custom services.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={chargeTitle}
                        onChange={(e) => setChargeTitle(e.target.value)}
                        placeholder="e.g., Setup Fee"
                        data-testid="input-charge-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={chargeDescription}
                        onChange={(e) => setChargeDescription(e.target.value)}
                        placeholder="Optional description..."
                        data-testid="input-charge-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (AUD)</Label>
                      <Input
                        type="number"
                        value={chargeAmount}
                        onChange={(e) => setChargeAmount(e.target.value)}
                        placeholder="e.g., 500.00"
                        data-testid="input-charge-amount"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddChargeOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => createChargeMutation.mutate({
                        title: chargeTitle,
                        description: chargeDescription || undefined,
                        amountCents: Math.round(parseFloat(chargeAmount) * 100),
                      })}
                      disabled={!chargeTitle || !chargeAmount || createChargeMutation.isPending}
                      data-testid="button-save-charge"
                    >
                      {createChargeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Charge
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {oneTimeCharges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No one-time charges
              </p>
            ) : (
              <div className="space-y-2">
                {oneTimeCharges.map((charge) => (
                  <div
                    key={charge.id}
                    className="flex items-center justify-between p-3 rounded-[var(--radius)] border"
                    data-testid={`charge-${charge.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{charge.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(charge.amountCents, charge.currency)} · {format(new Date(charge.createdAt), "PP")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getChargeStatusBadge(charge.status)}
                      {charge.status === "DRAFT" && tenant.stripeCustomerId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => invoiceChargeMutation.mutate(charge.id)}
                          disabled={invoiceChargeMutation.isPending}
                          data-testid={`button-invoice-${charge.id}`}
                        >
                          Invoice
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Billing Events
          </CardTitle>
          <CardDescription>Recent billing activity for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No billing events yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-[var(--radius)] border"
                  data-testid={`event-${event.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-[var(--radius)] bg-muted flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {event.eventType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
