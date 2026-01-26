import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  static async handleSubscriptionUpdate(event: any): Promise<void> {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    const billingTenant = await storage.getBillingTenantByStripeCustomerId(customerId);
    if (!billingTenant) {
      console.log(`No billing tenant found for Stripe customer ${customerId}`);
      return;
    }

    let newStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INACTIVE" = "INACTIVE";
    
    switch (subscription.status) {
      case 'active':
        newStatus = "ACTIVE";
        break;
      case 'trialing':
        newStatus = "TRIAL";
        break;
      case 'past_due':
        newStatus = "PAST_DUE";
        break;
      case 'canceled':
      case 'unpaid':
        newStatus = "CANCELED";
        break;
      default:
        newStatus = "INACTIVE";
    }

    await storage.updateBillingTenant(billingTenant.id, {
      billingStatus: newStatus,
      stripeSubscriptionId: subscription.id,
      updatedAt: new Date(),
    });

    await storage.createBillingEvent({
      companyId: billingTenant.companyId,
      eventType: "WEBHOOK_RECEIVED",
      payloadJson: { eventType: event.type, subscriptionStatus: subscription.status },
    });
  }

  static async handleInvoicePaid(event: any): Promise<void> {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    
    const billingTenant = await storage.getBillingTenantByStripeCustomerId(customerId);
    if (!billingTenant) return;

    await storage.updateBillingTenant(billingTenant.id, {
      billingStatus: "ACTIVE",
      updatedAt: new Date(),
    });

    await storage.markOneTimeChargesPaidByInvoice(invoice.id);

    await storage.createBillingEvent({
      companyId: billingTenant.companyId,
      eventType: "INVOICE_PAID",
      payloadJson: { invoiceId: invoice.id, amountPaid: invoice.amount_paid },
    });
  }

  static async handleInvoicePaymentFailed(event: any): Promise<void> {
    const invoice = event.data.object;
    const customerId = invoice.customer;
    
    const billingTenant = await storage.getBillingTenantByStripeCustomerId(customerId);
    if (!billingTenant) return;

    await storage.updateBillingTenant(billingTenant.id, {
      billingStatus: "PAST_DUE",
      updatedAt: new Date(),
    });

    await storage.createBillingEvent({
      companyId: billingTenant.companyId,
      eventType: "INVOICE_PAYMENT_FAILED",
      payloadJson: { invoiceId: invoice.id },
    });
  }
}
