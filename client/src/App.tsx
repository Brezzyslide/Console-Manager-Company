import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Console Pages
import ConsoleLoginPage from "@/pages/console/ConsoleLoginPage";
import CompaniesListPage from "@/pages/console/CompaniesListPage";
import CreateCompanyPage from "@/pages/console/CreateCompanyPage";
import CompanyDetailsPage from "@/pages/console/CompanyDetailsPage";
import AuditLogPage from "@/pages/console/AuditLogPage";
import SettingsPage from "@/pages/console/SettingsPage";
import { ConsoleLayout } from "@/pages/console/ConsoleLayout";

// Company Pages
import CompanyLoginPage from "@/pages/company/CompanyLoginPage";
import PasswordResetPage from "@/pages/company/PasswordResetPage";
import DashboardPage from "@/pages/company/DashboardPage";
import AdminUsersPage from "@/pages/company/AdminUsersPage";
import OnboardingPage from "@/pages/company/OnboardingPage";
import { CompanyLayout } from "@/pages/company/CompanyLayout";

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
      {/* Public Console Login */}
      <Route path="/console/login" component={ConsoleLoginPage} />

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

      {/* Company User Routes */}
      <Route path="/company/login" component={CompanyLoginPage} />
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

      {/* Landing */}
      <Route path="/">
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-primary">NDIS Provider Hub</h1>
            <p className="text-muted-foreground">
              <a href="/console/login" className="text-primary underline">Console Manager</a>
              {" | "}
              <a href="/company/login" className="text-primary underline">Provider Login</a>
            </p>
          </div>
        </div>
      </Route>

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
