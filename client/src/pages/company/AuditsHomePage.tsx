import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardCheck, Loader2, Calendar, Building2, BarChart2 } from "lucide-react";
import { getAudits, type Audit, type AuditStatus, type AuditType } from "@/lib/company-api";
import { useState } from "react";
import { format } from "date-fns";

const statusColors: Record<AuditStatus, string> = {
  DRAFT: "bg-gray-500",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  CLOSED: "bg-green-500",
};

const statusLabels: Record<AuditStatus, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  CLOSED: "Closed",
};

const serviceContextLabels: Record<string, string> = {
  SIL: "Supported Independent Living",
  COMMUNITY_ACCESS: "Community Access",
  IN_HOME: "In-Home Support",
  CENTRE_BASED: "Centre Based",
  OTHER: "Other",
};

export default function AuditsHomePage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: audits, isLoading } = useQuery({
    queryKey: ["audits", statusFilter, typeFilter],
    queryFn: () => getAudits({
      status: statusFilter !== "all" ? statusFilter as AuditStatus : undefined,
      auditType: typeFilter !== "all" ? typeFilter as AuditType : undefined,
    }),
  });

  const handleAuditClick = (audit: Audit) => {
    if (audit.status === "DRAFT") {
      navigate(`/audits/${audit.id}/scope`);
    } else if (audit.status === "IN_PROGRESS") {
      navigate(`/audits/${audit.id}/run`);
    } else {
      navigate(`/audits/${audit.id}/review`);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audits</h1>
          <p className="text-muted-foreground">Manage your internal and external audits</p>
        </div>
        <Button onClick={() => navigate("/audits/new")} data-testid="button-create-audit">
          <Plus className="h-4 w-4 mr-2" />
          Create Audit
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INTERNAL">Internal</SelectItem>
            <SelectItem value="EXTERNAL">External</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : audits?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No audits yet</p>
            <Button onClick={() => navigate("/audits/new")} data-testid="button-create-first-audit">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits?.map((audit) => (
            <Card 
              key={audit.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleAuditClick(audit)}
              data-testid={`card-audit-${audit.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{audit.title}</CardTitle>
                    {audit.description && (
                      <p className="text-sm text-muted-foreground">{audit.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{audit.auditType}</Badge>
                    <Badge className={statusColors[audit.status]}>{statusLabels[audit.status]}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(audit.scopeTimeFrom), "MMM d, yyyy")} - {format(new Date(audit.scopeTimeTo), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {serviceContextLabels[audit.serviceContext] || audit.serviceContext}
                  </div>
                  {audit.auditType === "EXTERNAL" && audit.externalAuditorOrg && (
                    <div>Auditor: {audit.externalAuditorOrg}</div>
                  )}
                  {(audit as any).indicatorCount > 0 && (
                    <div className="flex items-center gap-1" data-testid={`text-score-${audit.id}`}>
                      <BarChart2 className="h-4 w-4" />
                      {(audit as any).completedCount}/{(audit as any).indicatorCount} rated
                      {(audit as any).scorePercent !== null && (
                        <Badge 
                          variant="outline" 
                          className={`ml-1 ${
                            (audit as any).scorePercent >= 80 
                              ? "border-green-500 text-green-600" 
                              : (audit as any).scorePercent >= 50 
                                ? "border-yellow-500 text-yellow-600" 
                                : "border-red-500 text-red-600"
                          }`}
                        >
                          {(audit as any).scorePercent}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
