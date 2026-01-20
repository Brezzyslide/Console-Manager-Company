import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield, Clock, FileUp, CheckCircle, Upload, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PortalInfo {
  success: boolean;
  portalId: string;
  auditId: string;
  auditName: string;
  companyName: string;
  expiresAt: string | null;
}

interface EvidenceRequest {
  id: string;
  evidenceType: string;
  requestNote: string;
  dueDate: string | null;
  status: string;
  findingId: string | null;
}

const evidenceTypeLabels: Record<string, string> = {
  CLIENT_PROFILE: "Client Profile / Intake",
  NDIS_PLAN: "NDIS Plan",
  SERVICE_AGREEMENT: "Service Agreement",
  CONSENT_FORM: "Consent Form",
  GUARDIAN_DOCUMENTATION: "Guardian / Nominee Documentation",
  CARE_PLAN: "Care / Support Plan",
  BSP: "Behaviour Support Plan",
  MMP: "Mealtime Management Plan",
  HEALTH_PLAN: "Health Management Plan",
  COMMUNICATION_PLAN: "Communication Plan",
  RISK_ASSESSMENT: "Risk Assessment",
  EMERGENCY_PLAN: "Emergency Plan",
  ROSTER: "Roster / Shift Allocation",
  SHIFT_NOTES: "Shift Notes / Case Notes",
  DAILY_LOG: "Daily Support Log",
  PROGRESS_NOTES: "Progress Notes",
  ACTIVITY_RECORD: "Activity Record",
  QUALIFICATION: "Qualification / Credential",
  WWCC: "WWCC / Police Check / Screening",
  TRAINING_RECORD: "Training Record",
  SUPERVISION_RECORD: "Supervision Record",
  MEDICATION_PLAN: "Medication Management Plan",
  MAR: "Medication Administration Record",
  PRN_LOG: "PRN Protocol / Log",
  INCIDENT_REPORT: "Incident Report",
  COMPLAINT_RECORD: "Complaint Record",
  RP_RECORD: "Restrictive Practice Record",
  SERVICE_BOOKING: "Service Booking / Funding",
  INVOICE_CLAIM: "Invoice / Claim Record",
  POLICY: "Policy Document",
  PROCEDURE: "Procedure",
  REVIEW_RECORD: "Review / Monitoring Record",
  OTHER: "Other",
};

interface PortalInfoWithSession extends PortalInfo {
  sessionToken: string;
}

export default function AuditPortalPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [portalInfo, setPortalInfo] = useState<PortalInfoWithSession | null>(null);
  
  const [evidenceRequests, setEvidenceRequests] = useState<EvidenceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const [uploaderName, setUploaderName] = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestNote, setRequestNote] = useState("");
  const [requestFile, setRequestFile] = useState<File | null>(null);
  const [uploadingToRequest, setUploadingToRequest] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    setAuthenticating(true);
    setAuthError(null);
    
    try {
      const res = await fetch(`/api/public/audit-portal/${token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Authentication failed");
      }
      
      const data: PortalInfoWithSession = await res.json();
      setPortalInfo(data);
      setIsAuthenticated(true);
      
      setLoadingRequests(true);
      const reqRes = await fetch(`/api/public/audit-portal/evidence-requests`, {
        headers: { "Authorization": `Bearer ${data.sessionToken}` },
      });
      if (reqRes.ok) {
        const requests = await reqRes.json();
        setEvidenceRequests(requests);
      }
      setLoadingRequests(false);
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleUploadGeneral = async () => {
    if (!selectedFile || !uploaderName || !uploaderEmail || !description || !portalInfo) {
      toast({ title: "Missing information", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("uploaderName", uploaderName);
      formData.append("uploaderEmail", uploaderEmail);
      formData.append("description", description);
      if (note) formData.append("note", note);
      
      const res = await fetch(`/api/public/audit-portal/general-evidence`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${portalInfo.sessionToken}` },
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      
      toast({ title: "Upload successful", description: "Your evidence has been submitted for review" });
      setSelectedFile(null);
      setDescription("");
      setNote("");
      setUploadSuccess("general");
    } catch (error) {
      toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadToRequest = async (requestId: string) => {
    if (!requestFile || !uploaderName || !uploaderEmail || !portalInfo) {
      toast({ title: "Missing information", description: "Please fill your name, email, and select a file", variant: "destructive" });
      return;
    }
    
    setUploadingToRequest(true);
    
    try {
      const formData = new FormData();
      formData.append("file", requestFile);
      formData.append("uploaderName", uploaderName);
      formData.append("uploaderEmail", uploaderEmail);
      if (requestNote) formData.append("note", requestNote);
      
      const res = await fetch(`/api/public/audit-portal/evidence-requests/${requestId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${portalInfo.sessionToken}` },
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      
      toast({ title: "Upload successful", description: "Your evidence has been submitted" });
      setRequestFile(null);
      setRequestNote("");
      setSelectedRequestId(null);
      setUploadSuccess(requestId);
      
      const reqRes = await fetch(`/api/public/audit-portal/evidence-requests`, {
        headers: { "Authorization": `Bearer ${portalInfo.sessionToken}` },
      });
      if (reqRes.ok) {
        const requests = await reqRes.json();
        setEvidenceRequests(requests);
      }
    } catch (error) {
      toast({ title: "Upload failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setUploadingToRequest(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Evidence Upload Portal</CardTitle>
            <CardDescription>
              Enter the password provided to you to access the upload portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Portal Password</Label>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                data-testid="input-portal-password"
              />
            </div>
            {authError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {authError}
              </div>
            )}
            <Button
              className="w-full"
              onClick={handleAuthenticate}
              disabled={!password || authenticating}
              data-testid="button-authenticate"
            >
              {authenticating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Access Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{portalInfo?.auditName}</CardTitle>
                <CardDescription>{portalInfo?.companyName}</CardDescription>
              </div>
            </div>
            {portalInfo?.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                <Clock className="h-4 w-4" />
                This portal expires on {format(new Date(portalInfo.expiresAt), "PPP")}
              </div>
            )}
          </CardHeader>
        </Card>

        <div className="space-y-2">
          <Label>Your Name <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Enter your full name"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            data-testid="input-uploader-name"
          />
        </div>
        <div className="space-y-2">
          <Label>Your Email <span className="text-destructive">*</span></Label>
          <Input
            type="email"
            placeholder="Enter your email"
            value={uploaderEmail}
            onChange={(e) => setUploaderEmail(e.target.value)}
            data-testid="input-uploader-email"
          />
        </div>

        <Tabs defaultValue="requests" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests" data-testid="tab-requests">
              Evidence Requests
              {evidenceRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2">{evidenceRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general">
              Additional Evidence
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="requests" className="space-y-4 mt-4">
            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : evidenceRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No pending evidence requests</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    There are no specific evidence requests at this time. You can still upload additional evidence using the "Additional Evidence" tab.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {evidenceRequests.map((request) => (
                  <Card key={request.id} data-testid={`card-request-${request.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline">
                            {evidenceTypeLabels[request.evidenceType] || request.evidenceType}
                          </Badge>
                          {request.dueDate && (
                            <span className="text-sm text-muted-foreground ml-2 flex items-center gap-1 inline">
                              <Clock className="h-3 w-3" />
                              Due: {format(new Date(request.dueDate), "PPP")}
                            </span>
                          )}
                        </div>
                        {uploadSuccess === request.id && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Uploaded
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-2">{request.requestNote}</p>
                    </CardHeader>
                    <CardContent>
                      {selectedRequestId === request.id ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Select File <span className="text-destructive">*</span></Label>
                            <Input
                              type="file"
                              onChange={(e) => setRequestFile(e.target.files?.[0] || null)}
                              data-testid={`input-file-${request.id}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Note (optional)</Label>
                            <Textarea
                              placeholder="Add any notes about this file..."
                              value={requestNote}
                              onChange={(e) => setRequestNote(e.target.value)}
                              rows={2}
                              data-testid={`input-note-${request.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedRequestId(null);
                                setRequestFile(null);
                                setRequestNote("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleUploadToRequest(request.id)}
                              disabled={!requestFile || !uploaderName || !uploaderEmail || uploadingToRequest}
                              data-testid={`button-upload-${request.id}`}
                            >
                              {uploadingToRequest && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Upload
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRequestId(request.id)}
                          disabled={request.status === "ACCEPTED"}
                          data-testid={`button-respond-${request.id}`}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Evidence
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5" />
                  Upload Additional Evidence
                </CardTitle>
                <CardDescription>
                  Upload any other evidence or documentation that may be relevant to this audit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadSuccess === "general" && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-700">Your evidence has been submitted and will be reviewed by the audit team.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="Describe what this evidence is for and how it relates to the audit..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Select File <span className="text-destructive">*</span></Label>
                  <Input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    data-testid="input-general-file"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Notes (optional)</Label>
                  <Textarea
                    placeholder="Any additional context..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    data-testid="input-general-note"
                  />
                </div>
                <Button
                  onClick={handleUploadGeneral}
                  disabled={!selectedFile || !uploaderName || !uploaderEmail || !description || uploading}
                  className="w-full"
                  data-testid="button-upload-general"
                >
                  {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Submit Evidence
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
