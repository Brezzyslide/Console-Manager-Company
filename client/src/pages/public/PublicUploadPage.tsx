import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Calendar } from "lucide-react";

interface EvidenceRequestInfo {
  id: string;
  evidenceType: string;
  requestNote: string;
  dueDate: string | null;
  status: string;
  companyName: string;
}

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !requestInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Unable to Access</h2>
                <p className="text-gray-600 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (uploadSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900" data-testid="text-upload-success">Upload Successful</h2>
                <p className="text-gray-600 mt-1">
                  Your evidence has been submitted successfully. The team at {requestInfo?.companyName} will review it shortly.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadSuccess(false);
                  setSelectedFile(null);
                  setNote("");
                }}
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Evidence Upload
            </CardTitle>
            <CardDescription>
              Upload evidence for {requestInfo?.companyName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Evidence Type</div>
                  <div className="text-blue-800">{requestInfo?.evidenceType}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Due Date</div>
                  <div className="text-blue-800">{formatDate(requestInfo?.dueDate || null)}</div>
                </div>
              </div>
              {requestInfo?.requestNote && (
                <div className="border-t border-blue-200 pt-3 mt-3">
                  <div className="font-medium text-blue-900 mb-1">Request Details</div>
                  <div className="text-blue-800 text-sm">{requestInfo.requestNote}</div>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="uploaderName">Your Name *</Label>
                <Input
                  id="uploaderName"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  data-testid="input-uploader-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="uploaderEmail">Your Email *</Label>
                <Input
                  id="uploaderEmail"
                  type="email"
                  value={uploaderEmail}
                  onChange={(e) => setUploaderEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  data-testid="input-uploader-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  data-testid="input-file"
                />
                <p className="text-xs text-gray-500">Maximum file size: 10MB</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Notes (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add any additional notes about this evidence"
                  rows={3}
                  data-testid="input-note"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
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
