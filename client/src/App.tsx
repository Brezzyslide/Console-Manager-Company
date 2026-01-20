import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Unified Login
import UnifiedLoginPage from "@/pages/UnifiedLoginPage";

// Console Pages
import CompaniesListPage from "@/pages/console/CompaniesListPage";
import CreateCompanyPage from "@/pages/console/CreateCompanyPage";
import CompanyDetailsPage from "@/pages/console/CompanyDetailsPage";
import AuditLogPage from "@/pages/console/AuditLogPage";
import SettingsPage from "@/pages/console/SettingsPage";
import { ConsoleLayout } from "@/pages/console/ConsoleLayout";

// Company Pages
import PasswordResetPage from "@/pages/company/PasswordResetPage";
import DashboardPage from "@/pages/company/DashboardPage";
import AdminUsersPage from "@/pages/company/AdminUsersPage";
import OnboardingPage from "@/pages/company/OnboardingPage";
import AuditsHomePage from "@/pages/company/AuditsHomePage";
import CreateAuditPage from "@/pages/company/CreateAuditPage";
import AuditScopePage from "@/pages/company/AuditScopePage";
import AuditTemplateSelectPage from "@/pages/company/AuditTemplateSelectPage";
import AuditRunnerPage from "@/pages/company/AuditRunnerPage";
import AuditReviewPage from "@/pages/company/AuditReviewPage";
import AuditReportPage from "@/pages/company/AuditReportPage";
import ReportsPage from "@/pages/company/ReportsPage";
import FindingsRegisterPage from "@/pages/company/FindingsRegisterPage";
import FindingDetailPage from "@/pages/company/FindingDetailPage";
import ServicesSettingsPage from "@/pages/company/ServicesSettingsPage";
import EvidenceLockerPage from "@/pages/company/EvidenceLockerPage";
import EvidenceDetailPage from "@/pages/company/EvidenceDetailPage";
import { CompanyLayout } from "@/pages/company/CompanyLayout";

// Public Pages
import PublicUploadPage from "@/pages/public/PublicUploadPage";
import AuditPortalPage from "@/pages/public/AuditPortalPage";

function ProtectedConsolePage({ component: Component }: { component: React.ComponentType }) {
  return (
    <ConsoleLayout>
      <Component />
    </ConsoleLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Legacy Console Login - redirect to unified */}
      <Route path="/console/login" component={UnifiedLoginPage} />

      {/* Protected Console Routes - order matters: specific routes before parameterized ones */}
      <Route path="/console/companies/new">
        <ProtectedConsolePage component={CreateCompanyPage} />
      </Route>
      <Route path="/console/companies/:id">
        {(params) => (
          <ConsoleLayout>
            <CompanyDetailsPage />
          </ConsoleLayout>
        )}
      </Route>
      <Route path="/console/companies">
        <ProtectedConsolePage component={CompaniesListPage} />
      </Route>
      <Route path="/console/audit">
        <ProtectedConsolePage component={AuditLogPage} />
      </Route>
      <Route path="/console/settings">
        <ProtectedConsolePage component={SettingsPage} />
      </Route>

      {/* Legacy Company Login - redirect to unified */}
      <Route path="/company/login" component={UnifiedLoginPage} />
      <Route path="/company/password-reset" component={PasswordResetPage} />
      <Route path="/company/dashboard">
        <CompanyLayout>
          <DashboardPage />
        </CompanyLayout>
      </Route>
      <Route path="/company/admin/users">
        <CompanyLayout requireRole={["CompanyAdmin"]}>
          <AdminUsersPage />
        </CompanyLayout>
      </Route>
      <Route path="/company/settings/services">
        <CompanyLayout requireRole={["CompanyAdmin"]}>
          <ServicesSettingsPage />
        </CompanyLayout>
      </Route>
      
      {/* Company Onboarding */}
      <Route path="/onboarding">
        <CompanyLayout skipOnboardingCheck>
          <OnboardingPage />
        </CompanyLayout>
      </Route>
      
      {/* Main App Routes - Protected with onboarding check */}
      <Route path="/app">
        <CompanyLayout>
          <DashboardPage />
        </CompanyLayout>
      </Route>
      <Route path="/app/admin/users">
        <CompanyLayout requireRole={["CompanyAdmin"]}>
          <AdminUsersPage />
        </CompanyLayout>
      </Route>
      
      {/* Audit Routes */}
      <Route path="/audits">
        <CompanyLayout>
          <AuditsHomePage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/new">
        <CompanyLayout requireRole={["CompanyAdmin", "Auditor"]}>
          <CreateAuditPage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id/scope">
        <CompanyLayout requireRole={["CompanyAdmin", "Auditor"]}>
          <AuditScopePage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id/template">
        <CompanyLayout requireRole={["CompanyAdmin", "Auditor"]}>
          <AuditTemplateSelectPage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id/run">
        <CompanyLayout requireRole={["CompanyAdmin", "Auditor"]}>
          <AuditRunnerPage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id/review">
        <CompanyLayout>
          <AuditReviewPage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id/report">
        <CompanyLayout>
          <AuditReportPage />
        </CompanyLayout>
      </Route>
      <Route path="/audits/:id">
        <CompanyLayout>
          <AuditRunnerPage />
        </CompanyLayout>
      </Route>
      <Route path="/findings/:id">
        <CompanyLayout>
          <FindingDetailPage />
        </CompanyLayout>
      </Route>
      <Route path="/findings">
        <CompanyLayout>
          <FindingsRegisterPage />
        </CompanyLayout>
      </Route>
      <Route path="/reports">
        <CompanyLayout>
          <ReportsPage />
        </CompanyLayout>
      </Route>
      
      {/* Evidence Routes */}
      <Route path="/evidence/:id">
        <CompanyLayout>
          <EvidenceDetailPage />
        </CompanyLayout>
      </Route>
      <Route path="/evidence">
        <CompanyLayout>
          <EvidenceLockerPage />
        </CompanyLayout>
      </Route>

      {/* Public Pages - No Authentication Required */}
      <Route path="/upload/:token" component={PublicUploadPage} />
      <Route path="/audit-portal/:token" component={AuditPortalPage} />

      {/* Unified Login - Landing */}
      <Route path="/" component={UnifiedLoginPage} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
