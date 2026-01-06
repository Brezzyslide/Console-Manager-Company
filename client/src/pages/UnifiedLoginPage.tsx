import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConsoleAuth } from "@/hooks/use-console-auth";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { companyLoginSchema, CompanyLoginInput } from "@/lib/company-api";
import { 
  ShieldCheck, 
  Building2, 
  Loader2, 
  Mail, 
  Lock, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const consoleLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type ConsoleLoginFormValues = z.infer<typeof consoleLoginSchema>;

export default function UnifiedLoginPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [activeTab, setActiveTab] = useState<string>("provider");
  const [providerError, setProviderError] = useState<string | null>(null);

  const companyIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("company") || "";
  }, [searchString]);

  const modeFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("mode") || "";
  }, [searchString]);

  useEffect(() => {
    if (modeFromUrl === "console") {
      setActiveTab("console");
    } else if (modeFromUrl === "provider" || companyIdFromUrl) {
      setActiveTab("provider");
    }
  }, [modeFromUrl, companyIdFromUrl]);

  // Console Auth
  const { login: consoleLogin, isLoggingIn: isConsoleLoggingIn, loginError: consoleLoginError } = useConsoleAuth();
  const consoleForm = useForm<ConsoleLoginFormValues>({
    resolver: zodResolver(consoleLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onConsoleSubmit = (data: ConsoleLoginFormValues) => {
    consoleLogin(data);
  };

  // Company Auth
  const { 
    isAuthenticated: isCompanyAuthenticated, 
    requiresPasswordReset, 
    login: companyLogin, 
    isLoggingIn: isCompanyLoggingIn, 
    loginError: companyLoginError 
  } = useCompanyAuth();

  const companyForm = useForm<CompanyLoginInput>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: {
      companyId: companyIdFromUrl,
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (companyIdFromUrl) {
      companyForm.setValue("companyId", companyIdFromUrl);
    }
  }, [companyIdFromUrl, companyForm]);

  useEffect(() => {
    if (isCompanyAuthenticated) {
      if (requiresPasswordReset) {
        setLocation("/company/password-reset");
      } else {
        setLocation("/company/dashboard");
      }
    }
  }, [isCompanyAuthenticated, requiresPasswordReset, setLocation]);

  const onCompanySubmit = async (data: CompanyLoginInput) => {
    setProviderError(null);
    try {
      const result = await companyLogin(data);
      if (result.requiresPasswordReset) {
        setLocation("/company/password-reset");
      } else {
        setLocation("/company/dashboard");
      }
    } catch (err) {
      setProviderError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">NDIS Provider Hub</h1>
          <p className="text-muted-foreground">Select your login type to continue</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2" data-testid="login-type-toggle">
                <TabsTrigger value="provider" className="gap-2" data-testid="tab-provider">
                  <Building2 className="h-4 w-4" />
                  Provider
                </TabsTrigger>
                <TabsTrigger value="console" className="gap-2" data-testid="tab-console">
                  <ShieldCheck className="h-4 w-4" />
                  Console Manager
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="provider" className="mt-0">
              <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center gap-3 pb-2">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Provider Login</CardTitle>
                      <CardDescription className="text-sm">
                        Sign in to your provider portal
                      </CardDescription>
                    </div>
                  </div>

                  {(providerError || companyLoginError) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{providerError || (companyLoginError as Error)?.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyId">Company ID</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyId"
                        type="text"
                        placeholder="Company ID from your invitation"
                        className="pl-10"
                        {...companyForm.register("companyId")}
                        data-testid="input-company-id"
                      />
                    </div>
                    {companyForm.formState.errors.companyId && (
                      <p className="text-sm text-destructive">{companyForm.formState.errors.companyId.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provider-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="provider-email"
                        type="email"
                        placeholder="you@company.com"
                        className="pl-10"
                        {...companyForm.register("email")}
                        data-testid="input-provider-email"
                      />
                    </div>
                    {companyForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{companyForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provider-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="provider-password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10"
                        {...companyForm.register("password")}
                        data-testid="input-provider-password"
                      />
                    </div>
                    {companyForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{companyForm.formState.errors.password.message}</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isCompanyLoggingIn}
                    data-testid="button-provider-login"
                  >
                    {isCompanyLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In to Provider Portal"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="console" className="mt-0">
              <form onSubmit={consoleForm.handleSubmit(onConsoleSubmit)}>
                <CardContent className="space-y-4 pt-0">
                  <div className="flex items-center gap-3 pb-2">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Console Manager</CardTitle>
                      <CardDescription className="text-sm">
                        Platform administrator access
                      </CardDescription>
                    </div>
                  </div>

                  {consoleLoginError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Access Denied</AlertTitle>
                      <AlertDescription>
                        {(consoleLoginError as Error).message || "Invalid credentials. Please try again."}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="console-email">Email</Label>
                    <Input 
                      id="console-email" 
                      type="email" 
                      placeholder="admin@example.com" 
                      {...consoleForm.register("email")}
                      className={consoleForm.formState.errors.email ? "border-destructive" : ""}
                      data-testid="input-console-email"
                    />
                    {consoleForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{consoleForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="console-password">Password</Label>
                    <Input 
                      id="console-password" 
                      type="password" 
                      {...consoleForm.register("password")}
                      className={consoleForm.formState.errors.password ? "border-destructive" : ""}
                      data-testid="input-console-password"
                    />
                    {consoleForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{consoleForm.formState.errors.password.message}</p>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={isConsoleLoggingIn} data-testid="button-console-login">
                    {isConsoleLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      "Sign in to Console"
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Restricted access for platform administrators only.
                  </p>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Protected by secure HTTP-only session authentication.
        </p>
      </div>
    </div>
  );
}
