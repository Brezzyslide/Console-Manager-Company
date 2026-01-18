export const NDIS_STANDARDS = {
  "11": { number: "11", name: "Governance and Operational Management" },
  "12": { number: "12", name: "Risk Management" },
  "13": { number: "13", name: "Quality Management" },
  "14": { number: "14", name: "Information Management" },
  "15": { number: "15", name: "Feedback and Complaints Management" },
  "16": { number: "16", name: "Incident Management" },
  "17": { number: "17", name: "Human Resource Management" },
  "18": { number: "18", name: "Continuity of Supports" },
  "18A": { number: "18A", name: "Emergency and Disaster Management" },
} as const;

export const INDICATOR_STANDARD_MAPPING: Record<string, string> = {
  "Governance framework or governance charter is documented and current": "11",
  "Organisational structure chart is documented and reflects current structure": "11",
  "Delegations of authority are documented and current": "11",
  "Roles and responsibilities matrix is documented": "11",
  "Fit and Proper Person declarations are completed for directors and key management": "11",
  "Conflict of interest register is maintained and current": "11",
  "Board or management meeting minutes are documented": "11",
  
  "Incident management policy is documented, current and approved": "16",
  "Complaints management policy is documented, current and approved": "15",
  "Risk management policy is documented, current and approved": "12",
  "Continuous improvement policy is documented, current and approved": "13",
  "Feedback and feedback handling policy is documented, current and approved": "15",
  "Privacy and confidentiality policy is documented, current and approved": "14",
  "Information management and record keeping policy is documented": "14",
  "Code of conduct is documented and staff have acknowledged": "17",
  "Child safe standards policy is documented (where applicable)": "17",
  "Whistleblower or reportable conduct policy is documented (if applicable)": "11",
  
  "Organisation-level risk register is maintained and current": "12",
  "Continuous improvement register or quality improvement plan is maintained": "13",
  "Internal audit reports are documented": "13",
  "Previous external audit reports and responses are available": "13",
  "Management review records are documented": "13",
  "Policy register showing review dates is maintained": "11",
  "Evidence that policies are communicated to staff": "11",
  "Training or induction records reference governance policies": "17",
  
  "Police check records are current for all staff": "17",
  "Working With Children Check records are current (where required)": "17",
  "NDIS Worker Screening clearance is current for all workers": "17",
  "Right to work documentation is verified and on file": "17",
  "Reference checks are completed (where applicable)": "17",
  "Qualification certificates relevant to role are on file": "17",
  "Scope of practice or role descriptions are documented": "17",
  "Evidence that qualifications are appropriate to supports delivered": "17",
  "Training matrix or training register is maintained": "17",
  "Mandatory training records are current (incident management, medication, restrictive practices)": "17",
  "Induction records are documented for all staff": "17",
  "Ongoing professional development records are maintained": "17",
  "Supervision schedules are documented": "17",
  "Supervision session records are maintained": "17",
  "Performance reviews or appraisals are completed": "17",
  "Corrective action or performance improvement plans are documented (if applicable)": "17",
  "Staff register with roles, employment type and start dates is maintained": "17",
  "Contractor agreements are in place (if contractors used)": "17",
  "Rostering policies relating to skill mix and ratios are documented": "17",
  
  "Client-specific emergency/disaster response is documented": "18A",
  
  "Incident reports involving the client are documented": "16",
  "Incident follow-up actions are documented": "16",
  "Behavioural incidents and de-escalation records are maintained": "16",
  "Restrictive practice records and authorisations are maintained (if applicable)": "16",
  
  "Complaints made by or on behalf of the client are recorded": "15",
  "Complaint outcomes and resolution records are documented": "15",
};

export function getNdisStandard(indicatorText: string): { number: string; name: string } | null {
  const standardNumber = INDICATOR_STANDARD_MAPPING[indicatorText];
  if (!standardNumber) return null;
  return NDIS_STANDARDS[standardNumber as keyof typeof NDIS_STANDARDS] || null;
}
