import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Receipt, 
  Users, 
  Calendar, 
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from "lucide-react";
import { getBillingStatus, getTenantBillingDetails, createBillingPortalSession, TenantBillingDetails } from "@/lib/company-api";

function BillingStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    case "TRIAL":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
    case "PAST_DUE":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Past Due</Badge>;
    case "CANCELED":
      return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatCurrency(cents: number, currency: string = "aud") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BillingPage() {
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  const { data: billingStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["billingStatus"],
    queryFn: getBillingStatus,
  });

  const { data: billingDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["tenantBillingDetails"],
    queryFn: getTenantBillingDetails,
  });

  const handleManagePayment = async () => {
    setIsCreatingPortal(true);
    try {
      const { url } = await createBillingPortalSession();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to create billing portal session:", error);
    } finally {
      setIsCreatingPortal(false);
    }
  };

  const isLoading = statusLoading || detailsLoading;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-billing-title">
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription, view invoices, and update payment methods
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Subscription Status
                    </CardTitle>
                    <CardDescription>Your current plan and billing status</CardDescription>
                  </div>
                  {billingStatus && <BillingStatusBadge status={billingStatus.status} />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {billingDetails?.subscription ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="font-medium">{billingDetails.plan?.name || "Standard"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Seats</p>
                        <p className="font-medium flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {billingDetails.subscription.seatCount} active
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Per Seat Price</p>
                        <p className="font-medium">
                          {formatCurrency(
                            billingDetails.seatOverride?.overrideSeatPriceCents || 
                            billingDetails.plan?.defaultSeatPriceCents || 
                            0
                          )}/month
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Next Billing Date</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(billingDetails.subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    </div>
                    
                    {billingDetails.seatOverride && (
                      <div className="bg-primary/5 p-3 rounded-[var(--radius)] text-sm">
                        <p className="text-muted-foreground">
                          You have a custom pricing arrangement applied to your account.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      {billingStatus?.status === "TRIAL" 
                        ? "You are currently on a trial. Contact us to set up your subscription."
                        : "No active subscription found. Please contact support."}
                    </p>
                  </div>
                )}
                
                {billingDetails?.hasCustomer && (
                  <Separator />
                )}
                
                {billingDetails?.hasCustomer && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleManagePayment}
                      disabled={isCreatingPortal}
                      data-testid="button-manage-payment"
                    >
                      {isCreatingPortal ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-2" />
                      )}
                      Manage Payment Methods
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Recent Invoices
                </CardTitle>
                <CardDescription>Your billing history</CardDescription>
              </CardHeader>
              <CardContent>
                {billingDetails?.invoices && billingDetails.invoices.length > 0 ? (
                  <div className="space-y-3">
                    {billingDetails.invoices.map((invoice: any) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-3 rounded-[var(--radius)] border"
                      >
                        <div className="flex items-center gap-3">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{formatCurrency(invoice.amount_paid, invoice.currency)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(new Date(invoice.created * 1000).toISOString())}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status}
                          </Badge>
                          {invoice.invoice_pdf && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No invoices yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {billingDetails?.oneTimeCharges && billingDetails.oneTimeCharges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Charges</CardTitle>
                  <CardDescription>One-time charges for additional services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {billingDetails.oneTimeCharges.map((charge: any) => (
                      <div 
                        key={charge.id}
                        className="flex items-center justify-between p-3 rounded-[var(--radius)] border"
                      >
                        <div>
                          <p className="font-medium">{charge.title}</p>
                          {charge.description && (
                            <p className="text-sm text-muted-foreground">{charge.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(charge.amountCents, charge.currency)}</span>
                          <Badge variant={charge.status === "PAID" ? "default" : "secondary"}>
                            {charge.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
