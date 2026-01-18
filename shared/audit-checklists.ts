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
