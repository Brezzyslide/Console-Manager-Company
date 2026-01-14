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
  { value: "POLICY", label: "Policy Document" },
  { value: "PROCEDURE", label: "Procedure Document" },
  { value: "TRAINING_RECORD", label: "Training Record / Certificate" },
  { value: "RISK_ASSESSMENT", label: "Risk Assessment" },
  { value: "CARE_PLAN", label: "Care / Support Plan" },
  { value: "QUALIFICATION", label: "Qualification / Credential" },
  { value: "WWCC", label: "WWCC / Police Check" },
  { value: "SERVICE_AGREEMENT", label: "Service Agreement" },
  { value: "INCIDENT_REPORT", label: "Incident Report" },
  { value: "COMPLAINT_RECORD", label: "Complaint Record" },
  { value: "CONSENT_FORM", label: "Consent Form" },
  { value: "OTHER", label: "Other Document" },
] as const;

const DOCUMENT_TIPS: Record<string, string[]> = {
  POLICY: [
    "Include clear title and version number",
    "Document should be dated within review period (typically 2 years)",
    "Include approval signature or authorisation",
    "Reference relevant legislation or standards",
  ],
  PROCEDURE: [
    "Include step-by-step instructions",
    "Identify responsible parties for each step",
    "Link to parent policy if applicable",
    "Include escalation pathway where relevant",
  ],
  TRAINING_RECORD: [
    "Include staff member name",
    "Show training date and completion evidence",
    "Name the training provider or organisation",
    "Include expiry date if applicable",
  ],
  RISK_ASSESSMENT: [
    "Include assessment date and assessor name",
    "Clearly identify and describe risks",
    "Include risk ratings (likelihood x impact)",
    "Document control measures for each risk",
  ],
  CARE_PLAN: [
    "Include participant name and identifiers",
    "Document goals and outcomes",
    "Detail support strategies",
    "Obtain participant consent/signature",
  ],
  QUALIFICATION: [
    "Ensure staff member name matches records",
    "Include issuing institution details",
    "Show issue date and expiry date if applicable",
    "Include registration/certification number",
  ],
  WWCC: [
    "Ensure person name matches employee records",
    "Check date is current and visible",
    "Card/reference number must be legible",
    "Status must show cleared/valid",
  ],
  SERVICE_AGREEMENT: [
    "Include participant name and details",
    "Clearly describe services to be provided",
    "Document pricing and fees",
    "Include cancellation policy and complaints process",
  ],
  INCIDENT_REPORT: [
    "Include incident date, time, and location",
    "Describe what occurred and who was involved",
    "Document immediate actions taken",
    "Submit within required timeframes",
  ],
  COMPLAINT_RECORD: [
    "Include date complaint was received",
    "Describe nature of complaint",
    "Document investigation steps",
    "Record outcome and resolution",
  ],
  CONSENT_FORM: [
    "Include participant name and date of consent",
    "Clearly state purpose of consent",
    "Define scope of consent",
    "Obtain participant signature",
  ],
  OTHER: [
    "Ensure document title and purpose are clear",
    "Include relevant dates",
    "Make sure document is legible",
    "Verify document is relevant to the request",
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
                  <SelectContent>
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
