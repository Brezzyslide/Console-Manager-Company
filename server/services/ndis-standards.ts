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

const KEYWORD_STANDARD_MAPPING: { keywords: string[]; standard: string }[] = [
  // Standard 11 - Governance and Operational Management
  { keywords: ["governance framework", "governance charter"], standard: "11" },
  { keywords: ["organisational structure", "organizational structure", "org chart"], standard: "11" },
  { keywords: ["delegations of authority", "delegations register"], standard: "11" },
  { keywords: ["roles and responsibilities", "raci"], standard: "11" },
  { keywords: ["fit and proper person"], standard: "11" },
  { keywords: ["conflict of interest"], standard: "11" },
  { keywords: ["board", "management meeting minutes"], standard: "11" },
  { keywords: ["policy register"], standard: "11" },
  { keywords: ["policies are communicated"], standard: "11" },
  { keywords: ["whistleblower", "reportable conduct"], standard: "11" },
  
  // Standard 12 - Risk Management
  { keywords: ["risk management policy"], standard: "12" },
  { keywords: ["risk register"], standard: "12" },
  { keywords: ["client-specific risk", "individual risk assessment"], standard: "12" },
  
  // Standard 13 - Quality Management
  { keywords: ["continuous improvement policy"], standard: "13" },
  { keywords: ["continuous improvement register", "quality improvement"], standard: "13" },
  { keywords: ["internal audit"], standard: "13" },
  { keywords: ["external audit report"], standard: "13" },
  { keywords: ["management review"], standard: "13" },
  
  // Standard 14 - Information Management
  { keywords: ["privacy", "confidentiality policy"], standard: "14" },
  { keywords: ["information management", "record keeping"], standard: "14" },
  
  // Standard 15 - Feedback and Complaints Management
  { keywords: ["complaints management policy"], standard: "15" },
  { keywords: ["feedback", "feedback handling"], standard: "15" },
  { keywords: ["complaint outcomes", "complaint resolution"], standard: "15" },
  { keywords: ["complaints made by", "complaints recorded"], standard: "15" },
  
  // Standard 16 - Incident Management
  { keywords: ["incident management policy"], standard: "16" },
  { keywords: ["incident report"], standard: "16" },
  { keywords: ["incident follow-up"], standard: "16" },
  { keywords: ["behavioural incident", "de-escalation"], standard: "16" },
  { keywords: ["restrictive practice"], standard: "16" },
  
  // Standard 17 - Human Resource Management
  { keywords: ["police check"], standard: "17" },
  { keywords: ["working with children", "wwcc"], standard: "17" },
  { keywords: ["ndis worker screening"], standard: "17" },
  { keywords: ["right to work"], standard: "17" },
  { keywords: ["reference check"], standard: "17" },
  { keywords: ["qualification", "qualifications"], standard: "17" },
  { keywords: ["scope of practice", "role description", "position description"], standard: "17" },
  { keywords: ["training matrix", "training register"], standard: "17" },
  { keywords: ["mandatory training"], standard: "17" },
  { keywords: ["induction record"], standard: "17" },
  { keywords: ["professional development"], standard: "17" },
  { keywords: ["supervision schedule", "supervision session", "supervision record"], standard: "17" },
  { keywords: ["performance review", "appraisal"], standard: "17" },
  { keywords: ["corrective action", "performance improvement plan"], standard: "17" },
  { keywords: ["staff register"], standard: "17" },
  { keywords: ["contractor agreement"], standard: "17" },
  { keywords: ["rostering polic"], standard: "17" },
  { keywords: ["code of conduct"], standard: "17" },
  { keywords: ["child safe standards", "child safe policy"], standard: "17" },
  { keywords: ["medication competency", "medication support training"], standard: "17" },
  
  // Standard 18 - Continuity of Supports
  { keywords: ["continuity of support", "service continuity"], standard: "18" },
  { keywords: ["transition plan", "transition record"], standard: "18" },
  
  // Standard 18A - Emergency and Disaster Management
  { keywords: ["emergency drill", "evacuation"], standard: "18A" },
  { keywords: ["emergency plan", "disaster response"], standard: "18A" },
  { keywords: ["client-specific emergency", "individual emergency"], standard: "18A" },
  { keywords: ["emergency contact"], standard: "18A" },
  { keywords: ["fire safety"], standard: "18A" },
];

export function getNdisStandard(indicatorText: string): { number: string; name: string } | null {
  if (!indicatorText) return null;
  
  const normalizedText = indicatorText.toLowerCase();
  
  for (const mapping of KEYWORD_STANDARD_MAPPING) {
    for (const keyword of mapping.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        return NDIS_STANDARDS[mapping.standard as keyof typeof NDIS_STANDARDS] || null;
      }
    }
  }
  
  return null;
}
