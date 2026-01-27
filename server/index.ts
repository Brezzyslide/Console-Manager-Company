import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { bootstrapConsoleUser } from "./lib/consoleAuth";
import { seedSupportCatalogue } from "./seed-catalogue";
import { seedDocumentChecklists } from "./seed-checklists";
import consoleRoutes from "./routes/console";
import companyRoutes from "./routes/company";
import onboardingRoutes from "./routes/onboarding";
import auditRoutes from "./routes/audit";
import publicRoutes from "./routes/public";
import complianceRoutes from "./routes/compliance";
import restrictivePracticesRoutes from "./routes/restrictive-practices";
import registersRoutes from "./routes/registers";
import billingRoutes, { handleStripeWebhook } from "./routes/billing";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhook MUST be registered BEFORE express.json() to receive raw body
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  try {
    const { handleStripeWebhook } = await import("./routes/billing");
    await handleStripeWebhook(req.body, sig);
    res.json({ received: true });
  } catch (err: any) {
    console.error("Stripe webhook error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Bootstrap console user on startup
  await bootstrapConsoleUser();
  
  // Seed support catalogue
  await seedSupportCatalogue();
  
  // Seed document checklists
  await seedDocumentChecklists();
  
  // Mount console routes
  app.use("/api/console", consoleRoutes);
  
  // Mount company routes
  app.use("/api/company", companyRoutes);
  
  // Mount onboarding routes (under /api/company)
  app.use("/api/company", onboardingRoutes);
  
  // Mount audit routes (under /api/company)
  app.use("/api/company", auditRoutes);
  
  // Mount public routes (unauthenticated)
  app.use("/api/public", publicRoutes);
  
  // Mount compliance routes (under /api/company)
  app.use("/api/company", complianceRoutes);
  
  // Mount restrictive practices routes (under /api/company)
  app.use("/api/company", restrictivePracticesRoutes);
  
  // Mount registers routes (under /api/company)
  app.use("/api/company", registersRoutes);
  
  // Mount billing routes (under /api/console) - requires console auth
  app.use("/api/console/billing", billingRoutes);
  
  // Public contact enquiry endpoint
  app.post("/api/contact-enquiry", async (req, res) => {
    try {
      const { name, organisation, email, phone, message } = req.body;
      if (!name || !organisation || !email || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const enquiry = await storage.createContactEnquiry({
        name,
        organisation,
        email,
        phone: phone || null,
        message,
        source: "landing",
      });
      res.json({ success: true, id: enquiry.id });
    } catch (error: any) {
      console.error("Contact enquiry error:", error);
      res.status(500).json({ error: "Failed to submit enquiry" });
    }
  });
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
