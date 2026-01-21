import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import OpenAI from "openai";
import { storage } from "../storage";
import { requireCompanyAuth, requireRole, type AuthenticatedCompanyRequest } from "../lib/companyAuth";
import { restrictivePracticeTypes, authorizationStatuses } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const RP_REPORT_PROMPT_VERSION = "1.0.0";

const router = Router();

// ============================================================
// RESTRICTIVE PRACTICE AUTHORIZATIONS
// ============================================================

router.get("/restrictive-practices/authorizations", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const participantId = req.query.participantId as string | undefined;
    
    const authorizations = await storage.getRestrictivePracticeAuthorizations(companyId, { participantId });
    res.json(authorizations);
  } catch (error: any) {
    console.error("Error fetching restrictive practice authorizations:", error);
    res.status(500).json({ error: "Failed to fetch authorizations" });
  }
});

router.get("/restrictive-practices/authorizations/:id", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const { id } = req.params;
    
    const authorization = await storage.getRestrictivePracticeAuthorization(id, companyId);
    if (!authorization) {
      return res.status(404).json({ error: "Authorization not found" });
    }
    res.json(authorization);
  } catch (error: any) {
    console.error("Error fetching authorization:", error);
    res.status(500).json({ error: "Failed to fetch authorization" });
  }
});

router.post("/restrictive-practices/authorizations", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      participantId: z.string().min(1),
      practiceType: z.enum(restrictivePracticeTypes),
      authorizationStatus: z.enum(authorizationStatuses).optional(),
      approvalDate: z.string().datetime().optional(),
      expiryDate: z.string().datetime().optional(),
      behaviorSupportPlanRef: z.string().optional(),
      conditionsOfUse: z.string().optional(),
      reviewFrequencyDays: z.number().int().positive().optional(),
      notes: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    const authorization = await storage.createRestrictivePracticeAuthorization({
      ...data,
      companyId,
      approvedByUserId: data.authorizationStatus === "APPROVED" ? userId : undefined,
      approvalDate: data.approvalDate ? new Date(data.approvalDate) : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      nextReviewDate: data.reviewFrequencyDays && data.approvalDate
        ? new Date(new Date(data.approvalDate).getTime() + data.reviewFrequencyDays * 24 * 60 * 60 * 1000)
        : undefined,
    });
    
    res.status(201).json(authorization);
  } catch (error: any) {
    console.error("Error creating authorization:", error);
    res.status(400).json({ error: error.message || "Failed to create authorization" });
  }
});

router.patch("/restrictive-practices/authorizations/:id", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    const { id } = req.params;
    
    const schema = z.object({
      authorizationStatus: z.enum(authorizationStatuses).optional(),
      approvalDate: z.string().datetime().optional(),
      expiryDate: z.string().datetime().optional(),
      behaviorSupportPlanRef: z.string().optional(),
      conditionsOfUse: z.string().optional(),
      reviewFrequencyDays: z.number().int().positive().optional(),
      lastReviewDate: z.string().datetime().optional(),
      notes: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    const updates: any = { ...data };
    if (data.approvalDate) updates.approvalDate = new Date(data.approvalDate);
    if (data.expiryDate) updates.expiryDate = new Date(data.expiryDate);
    if (data.lastReviewDate) updates.lastReviewDate = new Date(data.lastReviewDate);
    if (data.authorizationStatus === "APPROVED" && !data.approvalDate) {
      updates.approvedByUserId = userId;
    }
    
    const authorization = await storage.updateRestrictivePracticeAuthorization(id, companyId, updates);
    if (!authorization) {
      return res.status(404).json({ error: "Authorization not found" });
    }
    
    res.json(authorization);
  } catch (error: any) {
    console.error("Error updating authorization:", error);
    res.status(400).json({ error: error.message || "Failed to update authorization" });
  }
});

// ============================================================
// RESTRICTIVE PRACTICE USAGE LOGS
// ============================================================

router.get("/restrictive-practices/usage-logs", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const participantId = req.query.participantId as string | undefined;
    const authorizationId = req.query.authorizationId as string | undefined;
    const isAuthorized = req.query.isAuthorized === "true" ? true : req.query.isAuthorized === "false" ? false : undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const logs = await storage.getRestrictivePracticeUsageLogs(companyId, {
      participantId,
      authorizationId,
      isAuthorized,
      startDate,
      endDate,
    });
    
    res.json(logs);
  } catch (error: any) {
    console.error("Error fetching usage logs:", error);
    res.status(500).json({ error: "Failed to fetch usage logs" });
  }
});

router.post("/restrictive-practices/usage-logs", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor", "Reviewer"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      participantId: z.string().min(1),
      authorizationId: z.string().optional(),
      practiceType: z.enum(restrictivePracticeTypes),
      isAuthorized: z.boolean().optional(),
      usageDate: z.string().datetime(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      durationMinutes: z.number().int().positive().optional(),
      reason: z.string().min(1),
      deescalationAttempts: z.string().optional(),
      outcome: z.string().optional(),
      witnessName: z.string().optional(),
      incidentLinked: z.boolean().optional(),
      incidentReference: z.string().optional(),
      notes: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    // Auto-detect authorization if not provided
    let authorizationId = data.authorizationId;
    let isAuthorized = data.isAuthorized;
    
    if (!authorizationId) {
      // Look for active authorization for this participant/practice type
      const authorizations = await storage.getRestrictivePracticeAuthorizations(companyId, { participantId: data.participantId });
      const usageDate = new Date(data.usageDate);
      
      const matchingAuth = authorizations.find(auth => 
        auth.practiceType === data.practiceType &&
        auth.authorizationStatus === "APPROVED" &&
        (!auth.expiryDate || new Date(auth.expiryDate) > usageDate)
      );
      
      if (matchingAuth) {
        authorizationId = matchingAuth.id;
        // If isAuthorized not explicitly set, derive from authorization match
        if (isAuthorized === undefined) {
          isAuthorized = true;
        }
      } else {
        // No valid authorization found
        if (isAuthorized === undefined) {
          isAuthorized = false;
        }
      }
    }
    
    const log = await storage.createRestrictivePracticeUsageLog({
      ...data,
      companyId,
      authorizationId,
      isAuthorized: isAuthorized ?? false,
      reportedByUserId: userId,
      usageDate: new Date(data.usageDate),
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    });
    
    res.status(201).json(log);
  } catch (error: any) {
    console.error("Error creating usage log:", error);
    res.status(400).json({ error: error.message || "Failed to create usage log" });
  }
});

// ============================================================
// AI REPORT GENERATION
// ============================================================

router.post("/restrictive-practices/reports/generate", requireCompanyAuth, requireRole(["CompanyAdmin", "Auditor"]), async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    const userId = req.companyUser!.companyUserId;
    
    const schema = z.object({
      participantId: z.string().min(1),
      reportType: z.enum(["PRACTICE_FOCUSED", "PARTICIPANT_FOCUSED"]),
      startDate: z.string(),
      endDate: z.string(),
    });
    
    const { participantId, reportType, startDate, endDate } = schema.parse(req.body);
    
    const participant = await storage.getParticipant(participantId, companyId);
    if (!participant) {
      return res.status(404).json({ error: "Participant not found" });
    }
    
    const authorizations = await storage.getRestrictivePracticeAuthorizations(companyId, { participantId });
    const usageLogs = await storage.getRestrictivePracticeUsageLogs(companyId, {
      participantId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });
    
    const authorizedLogs = usageLogs.filter(l => l.isAuthorized);
    const unauthorizedLogs = usageLogs.filter(l => !l.isAuthorized);
    
    const inputData = {
      participant: {
        name: `${participant.firstName} ${participant.lastName}`,
        ndisNumber: participant.ndisNumber,
      },
      reportType,
      period: { startDate, endDate },
      authorizations: authorizations.map(a => ({
        practiceType: a.practiceType,
        status: a.authorizationStatus,
        expiryDate: a.expiryDate,
        conditions: a.conditionsOfUse,
      })),
      usageSummary: {
        totalInstances: usageLogs.length,
        authorizedInstances: authorizedLogs.length,
        unauthorizedInstances: unauthorizedLogs.length,
        byPracticeType: Object.fromEntries(
          restrictivePracticeTypes.map(type => [
            type,
            usageLogs.filter(l => l.practiceType === type).length,
          ])
        ),
      },
      usageLogs: usageLogs.map(l => ({
        practiceType: l.practiceType,
        isAuthorized: l.isAuthorized,
        date: l.usageDate,
        duration: l.durationMinutes,
        reason: l.reason,
        deescalation: l.deescalationAttempts,
        outcome: l.outcome,
      })),
    };
    
    const inputHash = crypto.createHash("sha256").update(JSON.stringify(inputData)).digest("hex");
    
    let systemPrompt: string;
    let userPrompt: string;
    
    if (reportType === "PRACTICE_FOCUSED") {
      systemPrompt = `You are a professional NDIS compliance report writer. Generate a restrictive practices report focusing on the practices themselves.

STRICT RULES:
1. ONLY use the data provided - do not invent or assume any information
2. Do NOT include medical diagnoses, conditions, or clinical details
3. Use professional, objective language appropriate for regulatory compliance
4. Highlight any unauthorized usage with appropriate concern
5. Structure the report with clear sections for each practice type
6. Include recommendations based ONLY on the data patterns observed`;

      userPrompt = `Generate a PRACTICE-FOCUSED restrictive practices report for the period ${startDate} to ${endDate}.

DATA:
${JSON.stringify(inputData, null, 2)}

Report should include:
1. Executive Summary
2. Authorization Status Overview
3. Usage Analysis by Practice Type
4. Unauthorized Usage Incidents (if any)
5. Compliance Observations
6. Recommendations`;
    } else {
      systemPrompt = `You are a professional NDIS compliance report writer. Generate a participant-centered restrictive practices report.

STRICT RULES:
1. ONLY use the data provided - do not invent or assume any information
2. Do NOT include medical diagnoses, conditions, or clinical details
3. Use professional, person-centered language
4. Focus on the participant's experience and support needs
5. Highlight any unauthorized usage with appropriate concern
6. Include recommendations for reducing restrictive practice use where possible`;

      userPrompt = `Generate a PARTICIPANT-FOCUSED restrictive practices report for ${inputData.participant.name} for the period ${startDate} to ${endDate}.

DATA:
${JSON.stringify(inputData, null, 2)}

Report should include:
1. Participant Summary
2. Current Authorized Practices
3. Usage Pattern Analysis
4. Unauthorized Incidents (if any)
5. Impact Assessment
6. Person-Centered Recommendations`;
    }
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      });
      
      const reportContent = completion.choices[0]?.message?.content || "";
      
      await storage.createAiGenerationLog({
        companyId,
        userId,
        featureKey: `RP_REPORT_${reportType}`,
        participantId,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
        inputHash,
        modelName: "gpt-4o",
        promptVersion: RP_REPORT_PROMPT_VERSION,
        success: true,
      });
      
      res.json({
        participantId,
        participantName: `${participant.firstName} ${participant.lastName}`,
        reportType,
        period: { startDate, endDate },
        content: reportContent,
        usageSummary: inputData.usageSummary,
        generatedAt: new Date().toISOString(),
      });
    } catch (aiError: any) {
      await storage.createAiGenerationLog({
        companyId,
        userId,
        featureKey: `RP_REPORT_${reportType}`,
        participantId,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate),
        inputHash,
        modelName: "gpt-4o",
        promptVersion: RP_REPORT_PROMPT_VERSION,
        success: false,
        errorMessage: aiError.message,
      });
      
      throw aiError;
    }
  } catch (error: any) {
    console.error("Error generating restrictive practices report:", error);
    res.status(500).json({ error: error.message || "Failed to generate report" });
  }
});

// Dashboard summary endpoint
router.get("/restrictive-practices/dashboard", requireCompanyAuth, async (req: AuthenticatedCompanyRequest, res) => {
  try {
    const companyId = req.companyUser!.companyId;
    
    const authorizations = await storage.getRestrictivePracticeAuthorizations(companyId);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogs = await storage.getRestrictivePracticeUsageLogs(companyId, {
      startDate: thirtyDaysAgo,
    });
    
    const now = new Date();
    const expiringSoon = authorizations.filter(a => 
      a.expiryDate && 
      a.authorizationStatus === "APPROVED" &&
      new Date(a.expiryDate) > now &&
      new Date(a.expiryDate) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    
    const expired = authorizations.filter(a =>
      a.expiryDate &&
      a.authorizationStatus === "APPROVED" &&
      new Date(a.expiryDate) < now
    );
    
    const unauthorizedCount = recentLogs.filter(l => !l.isAuthorized).length;
    
    res.json({
      totalAuthorizations: authorizations.length,
      activeAuthorizations: authorizations.filter(a => a.authorizationStatus === "APPROVED").length,
      pendingAuthorizations: authorizations.filter(a => a.authorizationStatus === "PENDING").length,
      expiringSoonCount: expiringSoon.length,
      expiredCount: expired.length,
      recentUsageCount: recentLogs.length,
      unauthorizedUsageCount: unauthorizedCount,
      byPracticeType: Object.fromEntries(
        restrictivePracticeTypes.map(type => [
          type,
          {
            authorized: authorizations.filter(a => a.practiceType === type && a.authorizationStatus === "APPROVED").length,
            recentUsage: recentLogs.filter(l => l.practiceType === type).length,
          },
        ])
      ),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
