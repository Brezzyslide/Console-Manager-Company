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
    documentType: "CLIENT_PROFILE",
    templateName: "Client Profile Checklist",
    description: "Review checklist for client profile and intake records",
    items: [
      { itemKey: "CPR_H1", itemText: "Participant name and DOB present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "CPR_H2", itemText: "NDIS number recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "CPR_H3", itemText: "Document date visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "CPR_I1", itemText: "Address and contact details included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "CPR_I2", itemText: "Emergency contact details documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "CPR_I3", itemText: "Communication preferences noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "CPR_C1", itemText: "Information is current and accurate", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "CPR_C2", itemText: "Cultural and linguistic needs documented", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "NDIS_PLAN",
    templateName: "NDIS Plan Checklist",
    description: "Review checklist for NDIS participant plans",
    items: [
      { itemKey: "NDP_H1", itemText: "Participant name matches records", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "NDP_H2", itemText: "NDIS number clearly visible", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "NDP_H3", itemText: "Plan start and end dates visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "NDP_I1", itemText: "Funded support categories listed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "NDP_I2", itemText: "Budget amounts visible", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "NDP_I3", itemText: "Plan management type identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "NDP_C1", itemText: "Plan is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "NDP_C2", itemText: "Services align with funded categories", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "GUARDIAN_DOCUMENTATION",
    templateName: "Guardian/Nominee Documentation Checklist",
    description: "Review checklist for guardianship and nominee documentation",
    items: [
      { itemKey: "GRD_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "GRD_H2", itemText: "Guardian/nominee name identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "GRD_H3", itemText: "Document is legible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "GRD_I1", itemText: "Type of authority specified (guardianship order, POA, nominee)", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "GRD_I2", itemText: "Scope of authority clearly defined", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "GRD_I3", itemText: "Issuing tribunal or authority identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "GRD_C1", itemText: "Documentation is current (not expired)", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "GRD_C2", itemText: "Authority covers relevant decision areas", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "BSP",
    templateName: "Behaviour Support Plan Checklist",
    description: "Review checklist for Behaviour Support Plans",
    items: [
      { itemKey: "BSP_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "BSP_H2", itemText: "Plan date clearly shown", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "BSP_H3", itemText: "Practitioner name and registration visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "BSP_I1", itemText: "Functional behaviour assessment included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "BSP_I2", itemText: "Proactive strategies documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "BSP_I3", itemText: "Reactive strategies documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "BSP_I4", itemText: "Review date specified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "BSP_C1", itemText: "Developed by qualified behaviour support practitioner", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "BSP_C2", itemText: "Strategies to reduce restrictive practices documented", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "BSP_C3", itemText: "NDIS Commission lodgement reference if restrictive practices used", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "MMP",
    templateName: "Mealtime Management Plan Checklist",
    description: "Review checklist for Mealtime Management Plans",
    items: [
      { itemKey: "MMP_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "MMP_H2", itemText: "Plan date clearly shown", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "MMP_H3", itemText: "Speech pathologist name and credentials visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "MMP_I1", itemText: "Texture modifications specified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "MMP_I2", itemText: "Positioning requirements documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "MMP_I3", itemText: "Fluid consistency requirements noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "MMP_I4", itemText: "Review date included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "MMP_C1", itemText: "Developed by qualified speech pathologist", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "MMP_C2", itemText: "Aspiration risk and management documented", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "MMP_C3", itemText: "Plan is current (within review period)", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "HEALTH_PLAN",
    templateName: "Health Management Plan Checklist",
    description: "Review checklist for Health Management Plans",
    items: [
      { itemKey: "HMP_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "HMP_H2", itemText: "Plan date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "HMP_H3", itemText: "Healthcare provider details included", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "HMP_I1", itemText: "Health conditions documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "HMP_I2", itemText: "Allergies clearly listed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "HMP_I3", itemText: "Treating health professionals identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "HMP_I4", itemText: "Review schedule included", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "HMP_C1", itemText: "Emergency health protocols documented", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "HMP_C2", itemText: "Medication requirements listed", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "COMMUNICATION_PLAN",
    templateName: "Communication Plan Checklist",
    description: "Review checklist for Communication Plans",
    items: [
      { itemKey: "COM_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "COM_H2", itemText: "Plan date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "COM_H3", itemText: "Author/speech pathologist identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "COM_I1", itemText: "How participant communicates described", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "COM_I2", itemText: "AAC needs documented if applicable", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "COM_I3", itemText: "What works well documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "COM_I4", itemText: "What to avoid documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "COM_C1", itemText: "Sensory or environmental considerations noted", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "COM_C2", itemText: "Plan reflects current communication needs", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "EMERGENCY_PLAN",
    templateName: "Emergency/Evacuation Plan Checklist",
    description: "Review checklist for Emergency and Evacuation Plans",
    items: [
      { itemKey: "EMP_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "EMP_H2", itemText: "Plan date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "EMP_H3", itemText: "Location/site identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "EMP_I1", itemText: "Participant-specific evacuation needs documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "EMP_I2", itemText: "Mobility considerations addressed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "EMP_I3", itemText: "Essential medication/equipment listed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "EMP_C1", itemText: "Staff awareness mechanism documented", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "EMP_C2", itemText: "Communication needs during emergency addressed", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "ROSTER",
    templateName: "Roster/Shift Allocation Checklist",
    description: "Review checklist for rosters and shift allocation records",
    items: [
      { itemKey: "RST_H1", itemText: "Roster period clearly identified", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "RST_H2", itemText: "Staff names visible", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "RST_H3", itemText: "Client allocations shown", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "RST_I1", itemText: "Shift times documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "RST_I2", itemText: "Support type indicated", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "RST_I3", itemText: "Covers the audit period being reviewed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "RST_C1", itemText: "Skill-matching evident where relevant", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "RST_C2", itemText: "Adequate staffing levels demonstrated", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "SHIFT_NOTES",
    templateName: "Shift Notes/Case Notes Checklist",
    description: "Review checklist for shift notes and case notes",
    items: [
      { itemKey: "SHN_H1", itemText: "Date and time recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "SHN_H2", itemText: "Staff member name present", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "SHN_H3", itemText: "Participant identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "SHN_I1", itemText: "Support provided documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "SHN_I2", itemText: "Participant presentation noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "SHN_I3", itemText: "Any concerns or changes recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "SHN_C1", itemText: "Notes align with care plan objectives", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "SHN_C2", itemText: "Incidents appropriately escalated", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "DAILY_LOG",
    templateName: "Daily Support Log Checklist",
    description: "Review checklist for daily support logs",
    items: [
      { itemKey: "DLG_H1", itemText: "Date clearly shown", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "DLG_H2", itemText: "Staff completing log identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "DLG_H3", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "DLG_I1", itemText: "Activities documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "DLG_I2", itemText: "Participation level noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "DLG_I3", itemText: "Food/fluid intake recorded if relevant", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "DLG_C1", itemText: "Incidents or concerns recorded", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "DLG_C2", itemText: "Log entries are contemporaneous", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "PROGRESS_NOTES",
    templateName: "Progress Notes Checklist",
    description: "Review checklist for progress notes",
    items: [
      { itemKey: "PRG_H1", itemText: "Date recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "PRG_H2", itemText: "Author identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "PRG_H3", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "PRG_I1", itemText: "Progress linked to specific goals", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "PRG_I2", itemText: "Measurable outcomes documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "PRG_I3", itemText: "Barriers or adjustments noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "PRG_C1", itemText: "Participant feedback included", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "PRG_C2", itemText: "Progress aligns with care plan goals", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "ACTIVITY_RECORD",
    templateName: "Activity/Community Access Record Checklist",
    description: "Review checklist for activity and community access records",
    items: [
      { itemKey: "ACT_H1", itemText: "Date of activity recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "ACT_H2", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "ACT_H3", itemText: "Staff member identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "ACT_I1", itemText: "Activity description documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "ACT_I2", itemText: "Location and duration noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "ACT_I3", itemText: "Participant engagement recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "ACT_C1", itemText: "Links to community participation goals", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "ACT_C2", itemText: "Participant choice and control evident", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "SUPERVISION_RECORD",
    templateName: "Supervision Record Checklist",
    description: "Review checklist for staff supervision records",
    items: [
      { itemKey: "SUP_H1", itemText: "Supervision date recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "SUP_H2", itemText: "Supervisor name identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "SUP_H3", itemText: "Supervisee name identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "SUP_I1", itemText: "Topics discussed documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "SUP_I2", itemText: "Actions or follow-ups agreed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "SUP_I3", itemText: "Duration of session noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "SUP_C1", itemText: "Signatures of both parties present", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "SUP_C2", itemText: "Supervision frequency meets requirements", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "MEDICATION_PLAN",
    templateName: "Medication Management Plan Checklist",
    description: "Review checklist for medication management plans",
    items: [
      { itemKey: "MED_H1", itemText: "Participant name and identifiers present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "MED_H2", itemText: "Plan date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "MED_H3", itemText: "Prescriber details included", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "MED_I1", itemText: "All medications listed with dosages", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "MED_I2", itemText: "Administration times documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "MED_I3", itemText: "Administration route specified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "MED_I4", itemText: "Review date shown", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "MED_C1", itemText: "Special instructions clearly noted", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "MED_C2", itemText: "PRN protocols included if applicable", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "MED_C3", itemText: "Plan is current and reviewed", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "MAR",
    templateName: "Medication Administration Record Checklist",
    description: "Review checklist for Medication Administration Records",
    items: [
      { itemKey: "MAR_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "MAR_H2", itemText: "Month/period covered shown", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "MAR_H3", itemText: "Medication names listed", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "MAR_I1", itemText: "Each dose signed with initials/signature", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "MAR_I2", itemText: "Time of administration recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "MAR_I3", itemText: "Staff signature key present", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "MAR_C1", itemText: "Missed doses explained", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "MAR_C2", itemText: "PRN administration includes reason", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "MAR_C3", itemText: "No unexplained gaps in record", section: "CRITICAL", isCritical: true, sortOrder: 9 },
    ],
  },
  {
    documentType: "PRN_LOG",
    templateName: "PRN Protocol/Usage Log Checklist",
    description: "Review checklist for PRN medication protocols and usage logs",
    items: [
      { itemKey: "PRN_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "PRN_H2", itemText: "Date and time recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "PRN_H3", itemText: "Medication name and dose noted", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "PRN_I1", itemText: "Reason for administration documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "PRN_I2", itemText: "Staff member administering identified", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "PRN_I3", itemText: "Effectiveness/outcome recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "PRN_C1", itemText: "Administration within PRN protocol limits", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "PRN_C2", itemText: "Follow-up monitoring documented", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "RP_RECORD",
    templateName: "Restrictive Practice Record Checklist",
    description: "Review checklist for restrictive practice records",
    items: [
      { itemKey: "RPR_H1", itemText: "Participant name present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "RPR_H2", itemText: "Date and time recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "RPR_H3", itemText: "Staff member identified", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "RPR_I1", itemText: "Type of restrictive practice documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "RPR_I2", itemText: "Duration of use recorded", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "RPR_I3", itemText: "Participant response documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "RPR_I4", itemText: "Antecedent/trigger described", section: "IMPLEMENTATION", isCritical: false, sortOrder: 7 },
      { itemKey: "RPR_C1", itemText: "BSP authorisation reference included", section: "CRITICAL", isCritical: true, sortOrder: 8 },
      { itemKey: "RPR_C2", itemText: "NDIS Commission reporting reference if required", section: "CRITICAL", isCritical: true, sortOrder: 9 },
      { itemKey: "RPR_C3", itemText: "Used as last resort after other strategies", section: "CRITICAL", isCritical: true, sortOrder: 10 },
    ],
  },
  {
    documentType: "SERVICE_BOOKING",
    templateName: "Service Booking/Funding Allocation Checklist",
    description: "Review checklist for service bookings and funding allocations",
    items: [
      { itemKey: "SBK_H1", itemText: "Participant name and NDIS number present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "SBK_H2", itemText: "Booking reference visible", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "SBK_H3", itemText: "Document date present", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "SBK_I1", itemText: "Allocated budget by support category shown", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "SBK_I2", itemText: "Allocation dates documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "SBK_I3", itemText: "Variations or amendments noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "SBK_C1", itemText: "Booking aligns with NDIS plan", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "SBK_C2", itemText: "Sufficient funding for services delivered", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "INVOICE_CLAIM",
    templateName: "Invoice/Claim Record Checklist",
    description: "Review checklist for invoices and claim records",
    items: [
      { itemKey: "INV_H1", itemText: "Participant name and NDIS number present", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "INV_H2", itemText: "Invoice date recorded", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "INV_H3", itemText: "Invoice/claim number visible", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "INV_I1", itemText: "Service dates documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "INV_I2", itemText: "Support item codes listed", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "INV_I3", itemText: "Quantities and rates shown", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "INV_C1", itemText: "Rates match NDIS price guide", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "INV_C2", itemText: "Claims reconcile with delivery records", section: "CRITICAL", isCritical: true, sortOrder: 8 },
    ],
  },
  {
    documentType: "REVIEW_RECORD",
    templateName: "Review/Monitoring Record Checklist",
    description: "Review checklist for review and monitoring records",
    items: [
      { itemKey: "REV_H1", itemText: "Review date recorded", section: "HYGIENE", isCritical: false, sortOrder: 1 },
      { itemKey: "REV_H2", itemText: "Reviewer identified", section: "HYGIENE", isCritical: false, sortOrder: 2 },
      { itemKey: "REV_H3", itemText: "Subject of review clearly stated", section: "HYGIENE", isCritical: false, sortOrder: 3 },
      { itemKey: "REV_I1", itemText: "What was reviewed documented", section: "IMPLEMENTATION", isCritical: false, sortOrder: 4 },
      { itemKey: "REV_I2", itemText: "Findings or observations noted", section: "IMPLEMENTATION", isCritical: false, sortOrder: 5 },
      { itemKey: "REV_I3", itemText: "Changes or recommendations made", section: "IMPLEMENTATION", isCritical: false, sortOrder: 6 },
      { itemKey: "REV_C1", itemText: "Participant or representative involvement documented", section: "CRITICAL", isCritical: true, sortOrder: 7 },
      { itemKey: "REV_C2", itemText: "Next review date scheduled", section: "CRITICAL", isCritical: true, sortOrder: 8 },
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
  const existingDocTypes = new Set(existingTemplates.map(t => t.documentType));
  
  // Find new templates that don't exist yet
  const newTemplates = CHECKLIST_TEMPLATES.filter(t => !existingDocTypes.has(t.documentType));
  
  if (newTemplates.length === 0) {
    console.log(`Document checklists already seeded (${existingTemplates.length} templates exist). Skipping.`);
    return;
  }

  console.log(`Seeding ${newTemplates.length} new document checklist templates...`);

  for (const templateDef of newTemplates) {
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
