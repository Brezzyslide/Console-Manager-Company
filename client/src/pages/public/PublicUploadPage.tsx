import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Calendar, Info, Lightbulb, Sparkles } from "lucide-react";

interface EvidenceRequestInfo {
  id: string;
  evidenceType: string;
  requestNote: string;
  dueDate: string | null;
  status: string;
  companyName: string;
}

const DOCUMENT_TYPES = [
  // Client Identity & Authority
  { value: "CLIENT_PROFILE", label: "Client Profile / Intake Record" },
  { value: "NDIS_PLAN", label: "NDIS Plan" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "GUARDIAN_DOCUMENTATION", label: "Guardian / Nominee Documentation" },
  // Assessment & Planning
  { value: "CARE_PLAN", label: "Care / Support Plan" },
  { value: "BSP", label: "Behaviour Support Plan (BSP)" },
  { value: "MMP", label: "Mealtime Management Plan (MMP)" },
  { value: "HEALTH_PLAN", label: "Health Management Plan" },
  { value: "COMMUNICATION_PLAN", label: "Communication Plan" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "EMERGENCY_PLAN", label: "Emergency / Evacuation Plan" },
  // Delivery of Supports
  { value: "ROSTER", label: "Roster / Shift Allocation" },
  { value: "SHIFT_NOTES", label: "Shift Notes / Case Notes" },
  { value: "DAILY_LOG", label: "Daily Support Log" },
  { value: "PROGRESS_NOTES", label: "Progress Notes" },
  { value: "ACTIVITY_RECORD", label: "Activity / Community Access Record" },
  // Staff & Personnel
  { value: "QUALIFICATION", label: "Qualification / Credential" },
  { value: "WWCC", label: "WWCC / Police Check / NDIS Screening" },
  { value: "TRAINING_RECORD", label: "Training Record / Certificate" },
  { value: "SUPERVISION_RECORD", label: "Supervision Record" },
  // Medication & Health
  { value: "MEDICATION_PLAN", label: "Medication Management Plan" },
  { value: "MAR", label: "Medication Administration Record (MAR)" },
  { value: "PRN_LOG", label: "PRN Protocol / Usage Log" },
  // Incidents & Complaints
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "COMPLAINT_RECORD", label: "Complaint Record" },
  { value: "RP_RECORD", label: "Restrictive Practice Record" },
  // Funding & Claims
  { value: "SERVICE_BOOKING", label: "Service Booking / Funding Allocation" },
  { value: "INVOICE_CLAIM", label: "Invoice / Claim Record" },
  // Governance
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure Document" },
  // Other
  { value: "REVIEW_RECORD", label: "Review / Monitoring Record" },
  { value: "OTHER", label: "Other Document" },
] as const;

const DOCUMENT_TIPS: Record<string, string[]> = {
  // Client Identity & Authority
  CLIENT_PROFILE: [
    "Include complete demographic information (name, DOB, address)",
    "Include emergency contact details",
    "Document communication preferences",
    "Ensure NDIS number is recorded",
  ],
  NDIS_PLAN: [
    "Provide current plan with visible plan dates",
    "NDIS number must be clearly visible",
    "Include all funded support categories",
    "Previous plans may be needed for audit period coverage",
  ],
  SERVICE_AGREEMENT: [
    "Must be signed and dated by participant or nominee",
    "Services listed must align with NDIS plan",
    "Include current pricing matching NDIS price guide",
    "Include cancellation policy and complaints process",
  ],
  CONSENT_FORM: [
    "Include participant name and date of consent",
    "Clearly state what is being consented to",
    "Specify who information can be shared with",
    "Must be signed by participant or authorised representative",
  ],
  GUARDIAN_DOCUMENTATION: [
    "Include guardianship order or tribunal documentation",
    "Clearly show scope of guardianship authority",
    "Check validity dates - must be current",
    "Include nominee appointment letters if applicable",
  ],
  // Assessment & Planning
  CARE_PLAN: [
    "Must include participant name and identifiers",
    "Goals should link to NDIS plan objectives",
    "Include specific support strategies",
    "Show review date and participant sign-off",
  ],
  BSP: [
    "Must be developed by a qualified behaviour support practitioner",
    "Include strategies to reduce restrictive practices",
    "Show clear review date (typically 12 months)",
    "Include NDIS Quality and Safeguards Commission lodgement reference if applicable",
  ],
  MMP: [
    "Must be developed by a qualified speech pathologist",
    "Include texture modifications and positioning requirements",
    "Document risk of aspiration and management strategies",
    "Show clear review date",
  ],
  HEALTH_PLAN: [
    "Document ongoing health conditions",
    "Include medication requirements and allergies",
    "List treating health professionals",
    "Include emergency health protocols",
  ],
  COMMUNICATION_PLAN: [
    "Describe how the participant communicates",
    "Include any augmentative/alternative communication (AAC) needs",
    "List what works well and what to avoid",
    "Include sensory or environmental considerations",
  ],
  RISK_ASSESSMENT: [
    "Include assessment date and assessor name",
    "Identify specific risks for this participant",
    "Include risk ratings (likelihood x consequence)",
    "Document control measures and who is responsible",
  ],
  EMERGENCY_PLAN: [
    "Include participant-specific evacuation needs",
    "Document mobility and communication considerations",
    "Include medication or equipment that must go with participant",
    "Show how staff will be made aware of this plan",
  ],
  // Delivery of Supports
  ROSTER: [
    "Show client allocation and staff assignment",
    "Include shift times and support type",
    "Must cover the audit period being reviewed",
    "Show skill-matching where relevant",
  ],
  SHIFT_NOTES: [
    "Include date, time, and staff member name",
    "Document what support was provided",
    "Note any concerns or changes in participant presentation",
    "Should align with care plan objectives",
  ],
  DAILY_LOG: [
    "Include date and staff completing the log",
    "Document activities and participation",
    "Note food/fluid intake if relevant",
    "Record any incidents or concerns",
  ],
  PROGRESS_NOTES: [
    "Link progress to specific goals in care plan",
    "Include measurable outcomes where possible",
    "Note barriers or adjustments needed",
    "Include participant feedback",
  ],
  ACTIVITY_RECORD: [
    "Document what activity was undertaken",
    "Include location and duration",
    "Note participant engagement and outcomes",
    "Link to community participation goals",
  ],
  // Staff & Personnel
  QUALIFICATION: [
    "Staff member name must match employment records",
    "Include issuing institution details",
    "Show issue date and expiry if applicable",
    "Include registration or certification number",
  ],
  WWCC: [
    "Name must match employee records exactly",
    "Clearance must be current (check expiry)",
    "Reference number must be legible",
    "Status must show cleared/valid",
  ],
  TRAINING_RECORD: [
    "Include staff member name",
    "Show training date and completion evidence",
    "Name the training provider",
    "Include expiry/renewal date if applicable",
  ],
  SUPERVISION_RECORD: [
    "Include date and names of supervisor and supervisee",
    "Document topics discussed",
    "Note any actions or follow-ups agreed",
    "Include signatures of both parties",
  ],
  // Medication & Health
  MEDICATION_PLAN: [
    "List all medications with dosages and times",
    "Include prescriber details",
    "Document administration route and any special instructions",
    "Show review date and who reviewed",
  ],
  MAR: [
    "Every dose must be signed with time given",
    "Missed doses must be explained",
    "PRN administration must include reason",
    "No gaps or unexplained entries",
  ],
  PRN_LOG: [
    "Document reason for PRN administration",
    "Include time given and dose",
    "Record effectiveness/outcome",
    "Check against PRN limits in medication plan",
  ],
  // Incidents & Complaints
  INCIDENT_REPORT: [
    "Include incident date, time, and location",
    "Describe what occurred and who was involved",
    "Document immediate actions taken",
    "Include any NDIS Commission reportable incident reference",
  ],
  COMPLAINT_RECORD: [
    "Include date complaint was received",
    "Document who made the complaint",
    "Record investigation steps and findings",
    "Show resolution and communication to complainant",
  ],
  RP_RECORD: [
    "Document type of restrictive practice used",
    "Include authorisation details and BSP reference",
    "Record duration and participant response",
    "Include NDIS Commission reporting reference",
  ],
  // Funding & Claims
  SERVICE_BOOKING: [
    "Include NDIS portal booking reference",
    "Show allocated budget by support category",
    "Document dates of allocation",
    "Include any variations or amendments",
  ],
  INVOICE_CLAIM: [
    "Include participant name and NDIS number",
    "Show service dates and support item codes",
    "Rates must match NDIS price guide",
    "Claims should reconcile with delivery records",
  ],
  // Governance
  POLICY: [
    "Include clear title and version number",
    "Document should be dated within review period (typically 2-3 years)",
    "Include approval signature or authorisation",
    "Reference relevant legislation or NDIS Practice Standards",
  ],
  PROCEDURE: [
    "Include step-by-step instructions",
    "Identify responsible parties for each step",
    "Link to parent policy if applicable",
    "Include escalation pathway where relevant",
  ],
  // Other
  REVIEW_RECORD: [
    "Include date of review and who participated",
    "Document what was reviewed and any changes made",
    "Show participant or representative involvement",
    "Note next review date",
  ],
  OTHER: [
    "Ensure document title and purpose are clear",
    "Include relevant dates",
    "Make sure document is legible",
    "Verify document is relevant to the audit request",
  ],
};

export default function PublicUploadPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [requestInfo, setRequestInfo] = useState<EvidenceRequestInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  useEffect(() => {
    fetchRequestInfo();
  }, [token]);

  const fetchRequestInfo = async () => {
    try {
      const response = await fetch(`/api/public/evidence/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch evidence request");
      }
      const data = await response.json();
      setRequestInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploaderName || !uploaderEmail) {
      setError("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("uploaderName", uploaderName);
      formData.append("uploaderEmail", uploaderEmail);
      if (note) formData.append("note", note);
      if (documentType) formData.append("documentType", documentType);

      const response = await fetch(`/api/public/evidence/${token}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      setUploadSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No deadline";
    return new Date(dateString).toLocaleDateString("en-AU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const currentTips = documentType ? DOCUMENT_TIPS[documentType] || DOCUMENT_TIPS.OTHER : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
              <Upload className="h-6 w-6 text-background animate-pulse" />
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-primary absolute -top-2 -left-2" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !requestInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>
        <Card className="max-w-md w-full glass-card border-border/50 relative">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Unable to Access</h2>
                <p className="text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <Card className="max-w-md w-full glass-card border-border/50 relative">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="h-20 w-20 rounded-2xl gradient-success flex items-center justify-center glow-success">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground" data-testid="text-upload-success">
                  Upload Successful
                </h2>
                <p className="text-muted-foreground">
                  Your evidence has been submitted successfully. The team at {requestInfo?.companyName} will review it shortly.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadSuccess(false);
                  setSelectedFile(null);
                  setNote("");
                  setDocumentType("");
                }}
                className="border-primary/30 text-primary hover:bg-primary/10"
                data-testid="button-upload-another"
              >
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-2xl mx-auto space-y-6 relative">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center">
            <div className="h-14 w-14 rounded-2xl gradient-mixed flex items-center justify-center shadow-2xl glow-primary">
              <Upload className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Evidence Upload</h1>
          <p className="text-muted-foreground">
            Submit evidence for <span className="text-primary font-medium">{requestInfo?.companyName}</span>
          </p>
        </div>

        <Card className="glass-card border-border/50">
          <CardContent className="pt-6 space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">Evidence Type</div>
                  <div className="text-muted-foreground">{requestInfo?.evidenceType}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">Due Date</div>
                  <div className="text-muted-foreground">{formatDate(requestInfo?.dueDate || null)}</div>
                </div>
              </div>
              {requestInfo?.requestNote && (
                <div className="border-t border-primary/20 pt-4 mt-4">
                  <div className="font-medium text-foreground text-sm mb-1">Request Details</div>
                  <div className="text-muted-foreground text-sm">{requestInfo.requestNote}</div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpload} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="uploaderName" className="text-sm font-medium">Your Name *</Label>
                <Input
                  id="uploaderName"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="bg-muted/30 border-border/50 focus:border-primary"
                  data-testid="input-uploader-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uploaderEmail" className="text-sm font-medium">Your Email *</Label>
                <Input
                  id="uploaderEmail"
                  type="email"
                  value={uploaderEmail}
                  onChange={(e) => setUploaderEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="bg-muted/30 border-border/50 focus:border-primary"
                  data-testid="input-uploader-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentType" className="text-sm font-medium">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="bg-muted/30 border-border/50" data-testid="select-document-type">
                    <SelectValue placeholder="Select document type (optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} data-testid={`option-doc-type-${type.value}`}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Selecting a document type helps the reviewer assess your evidence faster</p>
              </div>

              {currentTips && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-400 font-medium mb-3">
                    <Lightbulb className="h-4 w-4" />
                    Tips for this document type
                  </div>
                  <ul className="space-y-2">
                    {currentTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400/70" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="bg-muted/30 border-border/50"
                  data-testid="input-file"
                />
                <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note" className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add any additional notes about this evidence"
                  rows={3}
                  className="bg-muted/30 border-border/50 focus:border-primary"
                  data-testid="input-note"
                />
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary text-background hover:opacity-90 shadow-lg h-11"
                disabled={uploading || !selectedFile}
                data-testid="button-upload-submit"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Evidence
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
