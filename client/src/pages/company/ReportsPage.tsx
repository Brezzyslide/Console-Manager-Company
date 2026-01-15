import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileBarChart, Download, Eye } from "lucide-react";
import { getAudits, type Audit } from "@/lib/company-api";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

export default function ReportsPage() {
  const [, navigate] = useLocation();

  const { data: audits, isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: () => getAudits(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const auditsWithScores = audits?.filter(a => a.scorePercent !== null && a.scorePercent !== undefined) || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileBarChart className="h-6 w-6" />
          Audit Reports
        </h1>
        <p className="text-muted-foreground">
          View and download audit reports
        </p>
      </div>

      {auditsWithScores.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No audit reports available</h3>
            <p className="text-sm text-muted-foreground">
              Complete an audit to generate a report
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {auditsWithScores.map((audit) => (
            <Card key={audit.id} data-testid={`report-card-${audit.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{audit.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(audit.scopeTimeFrom), "MMM d, yyyy")} - {format(new Date(audit.scopeTimeTo), "MMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[audit.status]}>{audit.status}</Badge>
                    <div className="text-right">
                      <div className="text-xl font-bold">{audit.scorePercent}%</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span>{audit.auditType} Audit</span>
                  <span>•</span>
                  <span>{audit.completedCount || 0} of {audit.indicatorCount || 0} indicators</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/audits/${audit.id}/report`)}
                    data-testid={`btn-view-report-${audit.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Report
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => window.open(`/api/company/audits/${audit.id}/download-pdf`, '_blank')}
                    data-testid={`btn-download-pdf-${audit.id}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
