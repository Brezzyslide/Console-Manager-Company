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
import { ConsoleLayout } from "@/pages/console/ConsoleLayout";

function Router() {
  return (
    <Switch>
      {/* Public Console Login */}
      <Route path="/console/login" component={ConsoleLoginPage} />

      {/* Protected Console Routes */}
      <Route path="/console/:rest*">
        {(params) => (
          <ConsoleLayout>
            <Switch>
              <Route path="/console/companies/new" component={CreateCompanyPage} />
              <Route path="/console/companies/:id" component={CompanyDetailsPage} />
              <Route path="/console/companies" component={CompaniesListPage} />
              
              {/* Default redirect or 404 for console */}
              <Route path="/console/:rest*">
                <NotFound />
              </Route>
            </Switch>
          </ConsoleLayout>
        )}
      </Route>

      {/* Main App Routes (not part of this sprint) */}
      <Route path="/">
        <div className="flex h-screen items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-primary">App Landing</h1>
            <p className="text-muted-foreground">Go to <a href="/console/login" className="text-primary underline">/console/login</a> to manage tenants.</p>
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
