import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";
import { WebhookHandlers } from "../webhookHandlers";
import { requireConsoleAuth, type AuthenticatedConsoleRequest } from "../lib/consoleAuth";
import { z } from "zod";

const router = Router();

router.use(requireConsoleAuth);

const createPlanSchema = z.object({
  name: z.string().min(1),
  defaultSeatPriceCents: z.number().int().positive(),
  currency: z.string().default("aud"),
});

const createOneTimeChargeSchema = z.object({
  companyId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  amountCents: z.number().int().positive(),
  currency: z.string().default("aud"),
});

const setSeatOverrideSchema = z.object({
  companyId: z.string(),
  overrideSeatPriceCents: z.number().int().positive(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
});

router.get("/plans", async (req: Request, res: Response) => {
  try {
    const plans = await storage.getBillingPlans();
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/plans", async (req: Request, res: Response) => {
  try {
    const data = createPlanSchema.parse(req.body);
    const stripe = await getUncachableStripeClient();
    
    const stripePrice = await stripe.prices.create({
      unit_amount: data.defaultSeatPriceCents,
      currency: data.currency,
      recurring: { interval: "month" },
      product_data: {
        name: `${data.name} Seat`,
      },
    });

    const plan = await storage.createBillingPlan({
      name: data.name,
      defaultSeatPriceCents: data.defaultSeatPriceCents,
      currency: data.currency,
      stripePriceId: stripePrice.id,
      isActive: true,
    });

    await storage.createBillingEvent({
      eventType: "SUBSCRIPTION_CREATED",
      payloadJson: { planId: plan.id, stripePriceId: stripePrice.id },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/plans/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const plan = await storage.updateBillingPlan(id, updates);
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    res.json(plan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tenants", async (req: Request, res: Response) => {
  try {
    const tenants = await storage.getBillingTenants();
    const companies = await storage.getCompanies();
    
    const enriched = companies.map(company => {
      const tenant = tenants.find(t => t.companyId === company.id);
      if (tenant) {
        return { ...tenant, company };
      }
      return {
        id: null,
        companyId: company.id,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        billingStatus: "INACTIVE" as const,
        billingPlanId: null,
        currentSeatPriceCents: null,
        seatCount: 0,
        currency: "aud",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        lastSyncedAt: null,
        createdAt: null,
        company,
      };
    });
    
    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tenants/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    let tenant = await storage.getBillingTenantByCompanyId(companyId);
    
    if (!tenant) {
      tenant = await storage.createBillingTenant({
        companyId,
        billingStatus: "INACTIVE",
        currency: "aud",
      });
    }
    
    const override = await storage.getActiveSeatOverride(companyId);
    const charges = await storage.getOneTimeCharges(companyId);
    const events = await storage.getBillingEvents(companyId);
    const company = await storage.getCompany(companyId);
    const seatCount = await storage.getCompanyUsers(companyId);

    res.json({
      tenant,
      company,
      seatOverride: override,
      oneTimeCharges: charges,
      recentEvents: events.slice(0, 20),
      currentSeatCount: seatCount.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/tenants/:companyId/status", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "INACTIVE"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    let tenant = await storage.getBillingTenantByCompanyId(companyId);
    if (!tenant) {
      tenant = await storage.createBillingTenant({
        companyId,
        billingStatus: status,
        currency: "aud",
      });
    } else {
      await storage.updateBillingTenant(tenant.id, { billingStatus: status });
    }
    
    await storage.createBillingEvent({
      companyId,
      eventType: "BILLING_STATUS_CHANGED",
      payloadJson: { newStatus: status, previousStatus: tenant.billingStatus },
    });
    
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenants/:companyId/create-customer", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    let tenant = await storage.getBillingTenantByCompanyId(companyId);
    if (!tenant) {
      tenant = await storage.createBillingTenant({
        companyId,
        billingStatus: "INACTIVE",
        currency: "aud",
      });
    }

    if (tenant.stripeCustomerId) {
      return res.status(400).json({ error: "Stripe customer already exists" });
    }

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      name: company.legalName,
      email: company.primaryContactEmail,
      metadata: {
        companyId: company.id,
        companyCode: company.code || "",
      },
    });

    tenant = await storage.updateBillingTenant(tenant.id, {
      stripeCustomerId: customer.id,
    });

    await storage.createBillingEvent({
      companyId,
      eventType: "CUSTOMER_CREATED",
      payloadJson: { stripeCustomerId: customer.id },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json({ tenant, stripeCustomerId: customer.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenants/:companyId/start-subscription", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const { planId } = req.body;

    const tenant = await storage.getBillingTenantByCompanyId(companyId);
    if (!tenant || !tenant.stripeCustomerId) {
      return res.status(400).json({ error: "Stripe customer must be created first" });
    }

    const plan = await storage.getBillingPlan(planId);
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({ error: "Invalid billing plan" });
    }

    const override = await storage.getActiveSeatOverride(companyId);
    const effectivePrice = override?.overrideSeatPriceCents || plan.defaultSeatPriceCents;

    const users = await storage.getCompanyUsers(companyId);
    const seatCount = Math.max(users.length, 1);

    const stripe = await getUncachableStripeClient();

    let priceId = plan.stripePriceId;
    if (override?.overrideSeatPriceCents) {
      const customPrice = await stripe.prices.create({
        unit_amount: override.overrideSeatPriceCents,
        currency: plan.currency,
        recurring: { interval: "month" },
        product: (await stripe.prices.retrieve(plan.stripePriceId)).product as string,
      });
      priceId = customPrice.id;
    }

    const subscription = await stripe.subscriptions.create({
      customer: tenant.stripeCustomerId,
      items: [{ price: priceId, quantity: seatCount }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    await storage.updateBillingTenant(tenant.id, {
      stripeSubscriptionId: subscription.id,
      billingStatus: subscription.status === "active" ? "ACTIVE" : "TRIAL",
      currentSeatPriceCents: effectivePrice,
      lastSyncedAt: new Date(),
    });

    await storage.createBillingEvent({
      companyId,
      eventType: "SUBSCRIPTION_CREATED",
      payloadJson: { subscriptionId: subscription.id, seatCount, pricePerSeat: effectivePrice },
      createdByUserId: (req as any).consoleUser?.id,
    });

    const invoice = subscription.latest_invoice as any;
    res.json({
      subscription,
      clientSecret: invoice?.payment_intent?.client_secret,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenants/:companyId/sync-seats", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    const tenant = await storage.getBillingTenantByCompanyId(companyId);
    if (!tenant || !tenant.stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription" });
    }

    const users = await storage.getCompanyUsers(companyId);
    const seatCount = Math.max(users.length, 1);

    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
    
    if (subscription.items.data.length > 0) {
      await stripe.subscriptionItems.update(subscription.items.data[0].id, {
        quantity: seatCount,
      });
    }

    await storage.updateBillingTenant(tenant.id, {
      lastSyncedAt: new Date(),
    });

    await storage.createBillingEvent({
      companyId,
      eventType: "SEAT_SYNCED",
      payloadJson: { newSeatCount: seatCount },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json({ success: true, seatCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tenants/:companyId/cancel-subscription", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    
    const tenant = await storage.getBillingTenantByCompanyId(companyId);
    if (!tenant || !tenant.stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription" });
    }

    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);

    await storage.updateBillingTenant(tenant.id, {
      billingStatus: "CANCELED",
      stripeSubscriptionId: null,
    });

    await storage.createBillingEvent({
      companyId,
      eventType: "SUBSCRIPTION_CANCELED",
      payloadJson: {},
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/seat-overrides", async (req: Request, res: Response) => {
  try {
    const data = setSeatOverrideSchema.parse(req.body);
    
    const override = await storage.createSeatOverride({
      companyId: data.companyId,
      overrideSeatPriceCents: data.overrideSeatPriceCents,
      effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
    });

    await storage.createBillingEvent({
      companyId: data.companyId,
      eventType: "SEAT_OVERRIDE_SET",
      payloadJson: { overrideSeatPriceCents: data.overrideSeatPriceCents },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json(override);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/seat-overrides/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const overrides = await storage.getSeatOverrides(companyId);
    const active = await storage.getActiveSeatOverride(companyId);
    res.json({ overrides, active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/one-time-charges/:companyId", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    const charges = await storage.getOneTimeCharges(companyId);
    res.json(charges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/one-time-charges", async (req: Request, res: Response) => {
  try {
    const data = createOneTimeChargeSchema.parse(req.body);
    
    const charge = await storage.createOneTimeCharge({
      companyId: data.companyId,
      title: data.title,
      description: data.description,
      amountCents: data.amountCents,
      currency: data.currency,
      status: "DRAFT",
      createdByUserId: (req as any).consoleUser?.id,
    });

    await storage.createBillingEvent({
      companyId: data.companyId,
      eventType: "ONE_TIME_CHARGE_CREATED",
      payloadJson: { chargeId: charge.id, amount: data.amountCents },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json(charge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/one-time-charges/:id/invoice", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const charge = await storage.getOneTimeCharge(id);
    if (!charge) {
      return res.status(404).json({ error: "Charge not found" });
    }

    const tenant = await storage.getBillingTenantByCompanyId(charge.companyId);
    if (!tenant || !tenant.stripeCustomerId) {
      return res.status(400).json({ error: "Customer must be created first" });
    }

    const stripe = await getUncachableStripeClient();

    const invoiceItem = await stripe.invoiceItems.create({
      customer: tenant.stripeCustomerId,
      amount: charge.amountCents,
      currency: charge.currency,
      description: charge.title,
    });

    const invoice = await stripe.invoices.create({
      customer: tenant.stripeCustomerId,
      auto_advance: true,
    });

    await stripe.invoices.sendInvoice(invoice.id);

    await storage.updateOneTimeCharge(id, {
      status: "INVOICED",
      stripeInvoiceId: invoice.id,
      stripeInvoiceItemId: invoiceItem.id,
    });

    await storage.createBillingEvent({
      companyId: charge.companyId,
      eventType: "INVOICE_CREATED",
      payloadJson: { chargeId: id, invoiceId: invoice.id },
      createdByUserId: (req as any).consoleUser?.id,
    });

    res.json({ invoice, charge: await storage.getOneTimeCharge(id) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/events", async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query;
    const events = await storage.getBillingEvents(companyId as string | undefined);
    res.json(events.slice(0, 100));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

export async function handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  await WebhookHandlers.processWebhook(payload, signature);
}
