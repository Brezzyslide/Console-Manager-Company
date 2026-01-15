import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ClipboardList, FileBarChart, Download } from "lucide-react";

interface AuditNavTabsProps {
  auditId: string;
  currentTab: "runner" | "review" | "report";
}

export function AuditNavTabs({ auditId, currentTab }: AuditNavTabsProps) {
  const [, navigate] = useLocation();

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
        onClick={() => window.open(`/api/company/audits/${auditId}/download-pdf`, '_blank')}
        data-testid="nav-download-pdf"
      >
        <Download className="h-4 w-4 mr-2" />
        Download PDF
      </Button>
    </div>
  );
}
