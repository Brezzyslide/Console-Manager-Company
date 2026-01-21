import { db } from "./db";
import { companies, complianceTemplates, complianceTemplateItems } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { storage } from "./storage";

interface TemplateItemDef {
  title: string;
  guidanceText?: string;
  responseType: "YES_NO_NA" | "NUMBER" | "TEXT" | "PHOTO_REQUIRED";
  isCritical: boolean;
  defaultEvidenceRequired?: boolean;
  notesRequiredOnFail?: boolean;
}

interface TemplateDef {
  name: string;
  description: string;
  scopeType: "SITE" | "PARTICIPANT";
  frequency: "DAILY" | "WEEKLY";
  items: TemplateItemDef[];
}

const DEFAULT_TEMPLATES: TemplateDef[] = [
  {
    name: "Site Daily Compliance Check",
    description: "Daily safety and hygiene checks for work sites",
    scopeType: "SITE",
    frequency: "DAILY",
    items: [
      {
        title: "House neat and tidy",
        guidanceText: "Check that all common areas are clean, organized, and free from clutter",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Trip hazards checked and cleared",
        guidanceText: "Inspect floors, walkways, and entrances for loose items, cords, or wet surfaces",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Exits and pathways clear",
        guidanceText: "Ensure all emergency exits and evacuation pathways are unobstructed",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Emergency/evacuation kit present and accessible",
        guidanceText: "Verify the emergency kit is in its designated location and fully stocked",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Hazards identified and logged",
        guidanceText: "Record any new hazards identified during the day. Add details in notes.",
        responseType: "TEXT",
        isCritical: false,
      },
    ],
  },
  {
    name: "Site Weekly Compliance",
    description: "Comprehensive weekly safety, emergency preparedness, and site compliance review",
    scopeType: "SITE",
    frequency: "WEEKLY",
    items: [
      {
        title: "Evacuation drill completed within required timeframe",
        guidanceText: "Confirm a fire/evacuation drill has been conducted within the required timeframe",
        responseType: "YES_NO_NA",
        isCritical: true,
        defaultEvidenceRequired: true,
      },
      {
        title: "Emergency evacuation plan current and accessible",
        guidanceText: "Verify the emergency evacuation plan is current and accessible to all staff",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Emergency contacts and key client evacuation needs reviewed",
        guidanceText: "Review emergency contacts and confirm client-specific evacuation needs are documented",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Hazard register reviewed and actions assigned",
        guidanceText: "Review all logged hazards and ensure corrective actions have been assigned",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Outstanding hazards progressed or closed",
        guidanceText: "Confirm outstanding hazards have been progressed or closed appropriately",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Maintenance issues reviewed and triaged",
        guidanceText: "Review and prioritize any maintenance issues identified during the week",
        responseType: "YES_NO_NA",
        isCritical: false,
      },
      {
        title: "Fire safety access confirmed",
        guidanceText: "Confirm fire exits, extinguishers, and fire safety equipment are accessible",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Electrical and appliances safety check visual",
        guidanceText: "Conduct visual inspection of electrical outlets, cords, and appliances for damage",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Slip trip fall risks reviewed",
        guidanceText: "Review site for slip, trip, and fall hazards and address any identified risks",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Cleaning schedule completed for the week",
        guidanceText: "Verify all scheduled cleaning tasks have been completed for the week",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Medication storage area compliant if applicable",
        guidanceText: "Check medication storage areas meet compliance requirements (temperature, security, etc.)",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Site induction and key procedures confirmed for rostered staff",
        guidanceText: "Confirm all rostered staff have completed site induction and know key procedures",
        responseType: "YES_NO_NA",
        isCritical: false,
      },
    ],
  },
  {
    name: "Participant Weekly Compliance Check",
    description: "Weekly review of participant safety, documentation, and care plan compliance",
    scopeType: "PARTICIPANT",
    frequency: "WEEKLY",
    items: [
      {
        title: "Incidents for period reviewed and recorded",
        guidanceText: "Enter the number of incidents recorded for this participant during the week. Include details in notes.",
        responseType: "NUMBER",
        isCritical: true,
      },
      {
        title: "Medication compliance sighted for period",
        guidanceText: "Verify medication administration records (MAR) are complete and signed for all scheduled doses",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Case note completion confirmed for rostered supports",
        guidanceText: "Check that case notes have been completed for all rostered support shifts this period",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Care plan review needed flagged",
        guidanceText: "Indicate if the participant's care plan requires review. Add details of concerns in notes.",
        responseType: "YES_NO_NA",
        isCritical: false,
      },
    ],
  },
  {
    name: "Daily Client Compliance Check",
    description: "Daily participant-focused compliance checks for support delivery, documentation, and safety",
    scopeType: "PARTICIPANT",
    frequency: "DAILY",
    items: [
      {
        title: "Support delivered as rostered today",
        guidanceText: "Confirm that all scheduled support was delivered as per the participant's roster",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Case note completed for today's support",
        guidanceText: "Verify that a case note has been written documenting today's support activities",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Client wellbeing checked and documented",
        guidanceText: "Record observations about the participant's physical and emotional wellbeing",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Any incidents today",
        guidanceText: "Document any incidents, near-misses, or safety concerns that occurred. If YES, provide details in notes.",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Medication administered as per plan",
        guidanceText: "Verify all scheduled medications have been administered and documented correctly",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Any concerns requiring follow-up",
        guidanceText: "Note any concerns that require follow-up action. If YES, provide details in notes.",
        responseType: "YES_NO_NA",
        isCritical: false,
        notesRequiredOnFail: true,
      },
    ],
  },
  {
    name: "Weekly Client Compliance Check",
    description: "Weekly participant review covering documentation, incidents, medication, and care plan compliance",
    scopeType: "PARTICIPANT",
    frequency: "WEEKLY",
    items: [
      {
        title: "Case notes completed for all rostered supports",
        guidanceText: "Verify that case notes have been completed for all rostered support shifts this week",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Support delivery aligns with care plan",
        guidanceText: "Confirm that all support activities align with the participant's approved care plan",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Number of incidents this week",
        guidanceText: "Enter the total number of incidents recorded for this participant during the week",
        responseType: "NUMBER",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "All incidents reviewed and actions taken",
        guidanceText: "Confirm all incident reports have been reviewed and appropriate actions taken",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Medication compliance for the week",
        guidanceText: "Verify medication administration records are complete and signed for all scheduled doses",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "PRN usage reviewed",
        guidanceText: "Review any PRN (as needed) medication usage during the week. If YES, document details in notes.",
        responseType: "YES_NO_NA",
        isCritical: false,
        notesRequiredOnFail: true,
      },
      {
        title: "Any restrictive practices used",
        guidanceText: "Document if any restrictive practices were used this week. If YES, details must be provided in notes.",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Care plan reviewed this period if due",
        guidanceText: "If care plan review was due this period, confirm it has been completed",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Risk assessments current and appropriate",
        guidanceText: "Confirm participant's risk assessments are up to date and reflect current circumstances",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Client feedback/preferences captured",
        guidanceText: "Document any feedback or preferences expressed by the participant during the week",
        responseType: "YES_NO_NA",
        isCritical: false,
        notesRequiredOnFail: true,
      },
      {
        title: "Supports align with funded supports",
        guidanceText: "Verify that supports delivered match the participant's funded support categories",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
    ],
  },
];

export async function seedComplianceTemplatesForCompany(companyId: string): Promise<{ templatesCreated: number; itemsCreated: number }> {
  let templatesCreated = 0;
  let itemsCreated = 0;

  const existingTemplates = await db
    .select()
    .from(complianceTemplates)
    .where(eq(complianceTemplates.companyId, companyId));

  for (const templateDef of DEFAULT_TEMPLATES) {
    const alreadyExists = existingTemplates.some(
      t => t.name === templateDef.name && t.scopeType === templateDef.scopeType && t.frequency === templateDef.frequency
    );

    if (alreadyExists) {
      console.log(`  Skipping "${templateDef.name}" - already exists for company ${companyId}`);
      continue;
    }

    const template = await storage.createComplianceTemplate({
      companyId,
      name: templateDef.name,
      description: templateDef.description,
      scopeType: templateDef.scopeType,
      frequency: templateDef.frequency,
      isActive: true,
    });

    templatesCreated++;
    console.log(`  Created template: "${templateDef.name}" (${template.id})`);

    const itemsToInsert = templateDef.items.map((item, index) => ({
      companyId,
      templateId: template.id,
      sortOrder: index + 1,
      title: item.title,
      guidanceText: item.guidanceText || null,
      responseType: item.responseType,
      isCritical: item.isCritical,
      defaultEvidenceRequired: item.defaultEvidenceRequired || false,
      notesRequiredOnFail: item.notesRequiredOnFail || false,
      evidenceSourceType: "MANUAL" as const,
    }));

    await storage.createComplianceTemplateItems(itemsToInsert);
    itemsCreated += itemsToInsert.length;
    console.log(`    Added ${itemsToInsert.length} items`);
  }

  return { templatesCreated, itemsCreated };
}

export async function seedComplianceTemplatesForAllCompanies(): Promise<void> {
  console.log("Seeding compliance templates for all companies...\n");

  const allCompanies = await db.select().from(companies);

  if (allCompanies.length === 0) {
    console.log("No companies found. Skipping seed.");
    return;
  }

  let totalTemplates = 0;
  let totalItems = 0;

  for (const company of allCompanies) {
    console.log(`\nCompany: ${company.legalName} (${company.id})`);
    const result = await seedComplianceTemplatesForCompany(company.id);
    totalTemplates += result.templatesCreated;
    totalItems += result.itemsCreated;
  }

  console.log(`\n✓ Seed complete: ${totalTemplates} templates and ${totalItems} items created across ${allCompanies.length} companies`);
}

import { fileURLToPath } from "url";

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  seedComplianceTemplatesForAllCompanies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
