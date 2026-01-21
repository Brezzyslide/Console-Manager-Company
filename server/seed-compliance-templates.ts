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
    name: "Site Weekly Compliance Check",
    description: "Weekly safety, emergency preparedness, and maintenance reviews for work sites",
    scopeType: "SITE",
    frequency: "WEEKLY",
    items: [
      {
        title: "Evacuation drill completed",
        guidanceText: "Confirm that a fire/evacuation drill has been conducted this period with all staff and participants",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Emergency contacts list reviewed and current",
        guidanceText: "Verify all emergency contact details are up to date and accessible to staff",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Hazard register reviewed and actions assigned",
        guidanceText: "Review all logged hazards and ensure corrective actions have been assigned with due dates",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Maintenance issues triaged",
        guidanceText: "Document any maintenance issues identified and priority level. Add details in notes.",
        responseType: "TEXT",
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
    description: "Daily participant-focused checks for medication, personal care, and safety",
    scopeType: "PARTICIPANT",
    frequency: "DAILY",
    items: [
      {
        title: "Medication administered as per MAR chart",
        guidanceText: "Verify all scheduled medications have been administered and documented correctly",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Personal care completed as per support plan",
        guidanceText: "Confirm personal care activities were delivered according to participant's care plan",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Participant presentation noted",
        guidanceText: "Record observations about participant's physical and emotional wellbeing",
        responseType: "TEXT",
        isCritical: false,
      },
      {
        title: "Any incidents or concerns today",
        guidanceText: "Document any incidents, near-misses, or concerns that occurred during the shift",
        responseType: "YES_NO_NA",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Handover notes completed",
        guidanceText: "Confirm handover documentation has been completed for incoming staff",
        responseType: "YES_NO_NA",
        isCritical: false,
      },
    ],
  },
  {
    name: "Weekly Client Compliance Check",
    description: "Weekly participant review covering goals progress, documentation, and care plan compliance",
    scopeType: "PARTICIPANT",
    frequency: "WEEKLY",
    items: [
      {
        title: "Weekly goal progress reviewed",
        guidanceText: "Review participant's progress towards their NDIS goals for the week",
        responseType: "YES_NO_NA",
        isCritical: false,
        notesRequiredOnFail: true,
      },
      {
        title: "All shift notes completed for the week",
        guidanceText: "Verify that case notes have been completed for all rostered shifts this week",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Incident reports submitted and reviewed",
        guidanceText: "Confirm all incident reports have been submitted, reviewed, and actioned appropriately",
        responseType: "YES_NO_NA",
        isCritical: true,
      },
      {
        title: "Family/carer communication logged",
        guidanceText: "Document any communication with family members or carers during the week",
        responseType: "YES_NO_NA",
        isCritical: false,
      },
      {
        title: "Number of missed supports this week",
        guidanceText: "Enter the number of scheduled supports that were missed or cancelled",
        responseType: "NUMBER",
        isCritical: true,
        notesRequiredOnFail: true,
      },
      {
        title: "Restrictive practice register updated",
        guidanceText: "Confirm restrictive practice register has been reviewed and updated if applicable",
        responseType: "YES_NO_NA",
        isCritical: true,
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
