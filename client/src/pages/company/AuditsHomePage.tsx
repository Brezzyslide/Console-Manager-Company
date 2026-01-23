import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardCheck, Loader2, Calendar, Building2, BarChart2, ChevronRight, Sparkles } from "lucide-react";
import { getAudits, type Audit, type AuditStatus, type AuditType } from "@/lib/company-api";
import { useState } from "react";
import { format } from "date-fns";

const statusConfig: Record<AuditStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Draft", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20" },
  IN_PROGRESS: { label: "In Progress", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
  IN_REVIEW: { label: "In Review", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  CLOSED: { label: "Closed", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
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
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">
            <span className="text-gradient-primary">Audits</span>
          </h1>
          <p className="text-muted-foreground">Manage your compliance audits</p>
        </div>
        <Button 
          onClick={() => navigate("/audits/new")} 
          className="gradient-primary text-background hover:opacity-90 shadow-lg"
          data-testid="button-create-audit"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Audit
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-muted/30 border-border/50" data-testid="select-status-filter">
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
          <SelectTrigger className="w-40 bg-muted/30 border-border/50" data-testid="select-type-filter">
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
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-background animate-pulse" />
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-primary absolute -top-2 -left-2" />
          </div>
          <p className="text-muted-foreground text-sm mt-4">Loading audits...</p>
        </div>
      ) : audits?.length === 0 ? (
        <Card className="glass-card border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No audits yet</p>
            <p className="text-muted-foreground text-sm mb-6">Create your first audit to get started</p>
            <Button 
              onClick={() => navigate("/audits/new")} 
              className="gradient-primary text-background hover:opacity-90"
              data-testid="button-create-first-audit"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Audit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits?.map((audit) => {
            const status = statusConfig[audit.status];
            return (
              <Card 
                key={audit.id} 
                className="glass-card border-border/50 cursor-pointer hover:bg-muted/30 hover-lift transition-all group"
                onClick={() => handleAuditClick(audit)}
                data-testid={`card-audit-${audit.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                        {audit.title}
                      </CardTitle>
                      {audit.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{audit.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                        {audit.auditType}
                      </Badge>
                      <Badge className={`${status.bg} ${status.color} border`}>
                        {status.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      {format(new Date(audit.scopeTimeFrom), "MMM d")} - {format(new Date(audit.scopeTimeTo), "MMM d, yyyy")}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-primary/60" />
                      {serviceContextLabels[audit.serviceContext] || audit.serviceContext}
                    </div>
                    {audit.auditType === "EXTERNAL" && audit.externalAuditorOrg && (
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-primary/60" />
                        {audit.externalAuditorOrg}
                      </div>
                    )}
                    {audit.indicatorCount && audit.indicatorCount > 0 && (
                      <div className="flex items-center gap-1.5" data-testid={`text-score-${audit.id}`}>
                        <BarChart2 className="h-4 w-4 text-primary/60" />
                        {audit.completedCount}/{audit.indicatorCount} rated
                        {audit.scorePercent != null && (
                          <Badge 
                            variant="outline" 
                            className={`ml-1 ${
                              audit.scorePercent >= 80 
                                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" 
                                : audit.scorePercent >= 50 
                                  ? "border-amber-500/30 text-amber-400 bg-amber-500/10" 
                                  : "border-red-500/30 text-red-400 bg-red-500/10"
                            }`}
                          >
                            {audit.scorePercent}%
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
