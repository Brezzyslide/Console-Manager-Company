// Standard Document Checklist items for Site Visits
export const SITE_VISIT_DOCUMENT_CHECKLIST = [
  "Service Agreement / Tenancy Agreement",
  "Consent Form",
  "Risk Assessments (home/Participant/site)",
  "Support/Care plan (including BSP, mealtime and/or mod 1 care plans)",
  "Invoicing (two invoice samples each participant)",
  "Progress notes",
  "Goals",
  "Intake Form",
  "Emergency and Disaster planning for the participant",
  "Medication chart/record (if applicable)",
  "Staff roster/sign-in records",
  "Incident reports (if applicable)",
];

// Standard Participant Feedback Checklist items for Interviews
export const PARTICIPANT_FEEDBACK_CHECKLIST = [
  "Participants received Welcome pack",
  "Copies of Service Agreements, Plans provided",
  "Culture and Individual beliefs/values respected",
  "Privacy and confidentiality explained",
  "Informed of any changes/updates",
  "Incident management explained",
  "Complaints explained/supported including to the commission",
  "Feel confident to raise issues with provider",
  "Emergency and Disaster planning",
  "Treated with dignity and respect",
  "Choice and control respected",
  "Goals and preferences understood",
];

// Staff HR Documentation Checklist for Staff Interviews
export const STAFF_HR_DOCUMENTATION_CHECKLIST = [
  "Qualifications verified",
  "Name of Institution confirmed",
  "Date Issued recorded",
  "Memberships (e.g., APHRA) details verified",
  "Passport sighted",
  "100-point ID-2: Driver Licence verified",
  "NDIS Worker Orientation Module completed",
  "NDIS Worker Screening Check current",
  "WWCC (Working With Children Check) current",
  "Police Check current",
  "COVID-19 Infection Control training completed",
  "First Aid-CPR certificate current",
  "Role/Position description on file",
  "Employment contract signed",
  "Code of Conduct acknowledged",
  "Induction completed",
];

// Safety Items Checklist (already exists but providing standard items)
export const SAFETY_ITEMS_CHECKLIST = [
  "Fire extinguisher present and in date",
  "Smoke detectors present and operational",
  "First aid kit available and stocked",
  "Emergency evacuation plan displayed",
  "Emergency exits clearly marked",
  "Medication storage secure (if applicable)",
  "Chemical storage secure (if applicable)",
  "Manual handling equipment available (if required)",
  "WHS signage displayed",
  "COVID-safe measures in place",
];

export type ChecklistItem = {
  item: string;
  checked: boolean;
  partial?: boolean;
};

export function initializeChecklist(items: string[]): ChecklistItem[] {
  return items.map(item => ({ item, checked: false, partial: false }));
}
