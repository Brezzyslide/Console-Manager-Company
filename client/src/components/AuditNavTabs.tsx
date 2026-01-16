import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ClipboardList, FileBarChart, Download, Loader2 } from "lucide-react";

interface AuditNavTabsProps {
  auditId: string;
  currentTab: "runner" | "review" | "report";
}

export function AuditNavTabs({ auditId, currentTab }: AuditNavTabsProps) {
  const [, navigate] = useLocation();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/company/audits/${auditId}/download-pdf`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-report-${auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 border-b pb-4 mb-6">
      <Button
        variant={currentTab === "runner" ? "default" : "ghost"}
        onClick={() => navigate(`/audits/${auditId}`)}
        data-testid="nav-runner-tab"
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        Audit
      </Button>
      <Button
        variant={currentTab === "review" ? "default" : "ghost"}
        onClick={() => navigate(`/audits/${auditId}/review`)}
        data-testid="nav-review-tab"
      >
        <ClipboardList className="h-4 w-4 mr-2" />
        Review
      </Button>
      <Button
        variant={currentTab === "report" ? "default" : "ghost"}
        onClick={() => navigate(`/audits/${auditId}/report`)}
        data-testid="nav-report-tab"
      >
        <FileBarChart className="h-4 w-4 mr-2" />
        Report
      </Button>
      <div className="flex-1" />
      <Button
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        data-testid="nav-download-pdf"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isDownloading ? "Downloading..." : "Download PDF"}
      </Button>
    </div>
  );
}
