import { db } from "./db";
import { documentChecklistTemplates, documentChecklistItems } from "@shared/schema";

const CHECKLIST_VERSION = 1;

type ChecklistSection = "HYGIENE" | "IMPLEMENTATION" | "CRITICAL";

interface ChecklistItemDef {
  itemKey: string;
  itemText: string;
  section: ChecklistSection;
  isCritical: boolean;
  sortOrder: number;
}

interface ChecklistTemplateDef {
  documentType: string;
  templateName: string;
  description: string;
  items: ChecklistItemDef[];
}

const CHECKLIST_TEMPLATES: ChecklistTemplateDef[] = [
  {
    documentType: "POLICY",
    templateName: "Policy Document Checklist",
    description: "Review checklist for organisational policy documents",
    items: [
      { itemKey: "POL_H1", itemText: "Document has a clear title and version number", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "POL_H2", itemText: "Document date is within review period (typically 2 years)", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "POL_H3", itemText: "Approval signature or authorisation present", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "POL_H4", itemText: "Document is branded/on letterhead", section: "HYGIENE", isCritical: false, sortOrder: 4 },
      { itemKey: "POL_I1", itemText: "Policy scope and purpose clearly defined", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "POL_I2", itemText: "Roles and responsibilities assigned", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "POL_I3", itemText: "References relevant legislation or standards", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "POL_I4", itemText: "Review schedule documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 8 },
      { itemKey: "POL_C1", itemText: "Content aligns with NDIS Practice Standards", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "POL_C2", itemText: "No conflicting or outdated information", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "PROCEDURE",
    templateName: "Procedure Document Checklist",
    description: "Review checklist for operational procedure documents",
    items: [
      { itemKey: "PROC_H1", itemText: "Document has clear title and version", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "PROC_H2", itemText: "Date is current (within review period)", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "PROC_H3", itemText: "Author/owner identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "PROC_I1", itemText: "Step-by-step instructions provided", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "PROC_I2", itemText: "Responsible parties for each step identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "PROC_I3", itemText: "Links to related policies or forms", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "PROC_I4", itemText: "Escalation pathway defined where applicable", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "PROC_C1", itemText: "Procedure aligns with parent policy", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "PROC_C2", itemText: "Critical safety steps clearly identified", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "TRAINING_RECORD",
    templateName: "Training Record Checklist",
    description: "Review checklist for staff training and certification records",
    items: [
      { itemKey: "TRN_H1", itemText: "Staff member name clearly identified", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "TRN_H2", itemText: "Training date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "TRN_H3", itemText: "Training provider/organisation named", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "TRN_I1", itemText: "Training topic/module specified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "TRN_I2", itemText: "Completion evidence (certificate, sign-off)", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "TRN_I3", itemText: "Expiry date noted if applicable", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "TRN_C1", itemText: "Training is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "TRN_C2", itemText: "Training relevant to staff role", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "RISK_ASSESSMENT",
    templateName: "Risk Assessment Checklist",
    description: "Review checklist for risk assessment documents",
    items: [
      { itemKey: "RSK_H1", itemText: "Assessment date recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "RSK_H2", itemText: "Assessor identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "RSK_H3", itemText: "Subject/scope of assessment clear", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "RSK_I1", itemText: "Risks identified and described", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "RSK_I2", itemText: "Risk ratings assigned (likelihood x impact)", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "RSK_I3", itemText: "Control measures documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "RSK_I4", itemText: "Review date scheduled", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "RSK_C1", itemText: "High/extreme risks have documented controls", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "RSK_C2", itemText: "Assessment is current (reviewed within 12 months)", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "CARE_PLAN",
    templateName: "Care/Support Plan Checklist",
    description: "Review checklist for participant care and support plans",
    items: [
      { itemKey: "CP_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "CP_H2", itemText: "Plan date clearly shown", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "CP_H3", itemText: "Plan author/coordinator identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "CP_I1", itemText: "Goals and outcomes documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "CP_I2", itemText: "Support strategies detailed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "CP_I3", itemText: "Participant preferences noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "CP_I4", itemText: "Review schedule included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "CP_C1", itemText: "Participant consent/signature obtained", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "CP_C2", itemText: "Plan reflects current participant needs", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "CP_C3", itemText: "Emergency contacts/protocols documented", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "QUALIFICATION",
    templateName: "Qualification/Credential Checklist",
    description: "Review checklist for staff qualifications and credentials",
    items: [
      { itemKey: "QUAL_H1", itemText: "Staff member name matches", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "QUAL_H2", itemText: "Issuing institution identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "QUAL_H3", itemText: "Issue date present", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "QUAL_I1", itemText: "Qualification title/type specified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "QUAL_I2", itemText: "Registration/certification number if applicable", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "QUAL_C1", itemText: "Qualification is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 6 },
      { itemKey: "QUAL_C2", itemText: "Qualification relevant to role requirements", section: "CRITICAL", isCritical: true, sortOrder: 7 },
    ],
  },
  {
    documentType: "WWCC",
    templateName: "WWCC/Police Check Checklist",
    description: "Review checklist for Working with Children and police checks",
    items: [
      { itemKey: "WW_H1", itemText: "Person name matches employee records", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "WW_H2", itemText: "Check date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "WW_H3", itemText: "Document is legible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "WW_I1", itemText: "Card/reference number visible", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "WW_I2", itemText: "Issuing authority identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "WW_C1", itemText: "Check is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 6 },
      { itemKey: "WW_C2", itemText: "Status is cleared/valid", section: "CRITICAL", isCritical: true, sortOrder: 7 },
    ],
  },
  {
    documentType: "SERVICE_AGREEMENT",
    templateName: "Service Agreement Checklist",
    description: "Review checklist for participant service agreements",
    items: [
      { itemKey: "SA_H1", itemText: "Participant name and details present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "SA_H2", itemText: "Agreement date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "SA_H3", itemText: "Provider details included", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "SA_I1", itemText: "Services to be provided clearly described", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "SA_I2", itemText: "Pricing/fees documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "SA_I3", itemText: "Cancellation policy included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "SA_I4", itemText: "Complaints process referenced", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "SA_C1", itemText: "Participant signature obtained", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "SA_C2", itemText: "Agreement is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "INCIDENT_REPORT",
    templateName: "Incident Report Checklist",
    description: "Review checklist for incident and accident reports",
    items: [
      { itemKey: "INC_H1", itemText: "Incident date and time recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "INC_H2", itemText: "Location specified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "INC_H3", itemText: "Reporter identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "INC_I1", itemText: "Description of what occurred", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "INC_I2", itemText: "Persons involved identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "INC_I3", itemText: "Immediate actions taken documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "INC_I4", itemText: "Witnesses noted if applicable", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "INC_C1", itemText: "Report submitted within required timeframe", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "INC_C2", itemText: "Reportable incident notified to NDIS Commission if required", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "COMPLAINT_RECORD",
    templateName: "Complaint Record Checklist",
    description: "Review checklist for complaint and feedback records",
    items: [
      { itemKey: "CMP_H1", itemText: "Complaint date received recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "CMP_H2", itemText: "Complainant identified (or noted as anonymous)", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "CMP_H3", itemText: "Receiving staff member noted", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "CMP_I1", itemText: "Nature of complaint described", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "CMP_I2", itemText: "Investigation steps documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "CMP_I3", itemText: "Outcome/resolution recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "CMP_C1", itemText: "Acknowledgement provided within required timeframe", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "CMP_C2", itemText: "Resolution communicated to complainant", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "CONSENT_FORM",
    templateName: "Consent Form Checklist",
    description: "Review checklist for participant consent documents",
    items: [
      { itemKey: "CON_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "CON_H2", itemText: "Date of consent recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "CON_H3", itemText: "Form version/date visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "CON_I1", itemText: "Purpose of consent clearly stated", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "CON_I2", itemText: "Scope of consent defined", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "CON_I3", itemText: "Withdrawal process explained", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "CON_C1", itemText: "Participant signature obtained", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "CON_C2", itemText: "Consent is current and not withdrawn", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "OTHER",
    templateName: "General Document Checklist",
    description: "General review checklist for other document types",
    items: [
      { itemKey: "OTH_H1", itemText: "Document title/purpose clear", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "OTH_H2", itemText: "Date present", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "OTH_H3", itemText: "Document is legible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "OTH_I1", itemText: "Content is complete", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "OTH_I2", itemText: "Relevant to the evidence request", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "OTH_C1", itemText: "Document appears authentic", section: "CRITICAL", isCritical: true, sortOrder: 6 },
    ],
  },
];

export async function seedDocumentChecklists(): Promise<void> {
  const existingTemplates = await db.select().from(documentChecklistTemplates);
  
  if (existingTemplates.length > 0) {
    console.log(`Document checklists already seeded (${existingTemplates.length} templates exist). Skipping.`);
    return;
  }

  console.log("Seeding document checklist templates...");

  for (const templateDef of CHECKLIST_TEMPLATES) {
    const [template] = await db.insert(documentChecklistTemplates).values({
      documentType: templateDef.documentType as any,
      templateName: templateDef.templateName,
      description: templateDef.description,
      version: CHECKLIST_VERSION,
      isActive: true,
    }).returning();

    console.log(`  Created template: ${templateDef.templateName}`);

    for (const item of templateDef.items) {
      await db.insert(documentChecklistItems).values({
        templateId: template.id,
        itemKey: item.itemKey,
        itemText: item.itemText,
        section: item.section,
        isCritical: item.isCritical,
        sortOrder: item.sortOrder,
      });
    }

    console.log(`    Added ${templateDef.items.length} checklist items`);
  }

  console.log("Document checklist seeding complete.");
}
