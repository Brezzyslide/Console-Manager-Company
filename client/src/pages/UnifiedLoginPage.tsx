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
  AlertCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  const { login: consoleLogin, isLoggingIn: isConsoleLoggingIn, loginError: consoleLoginError } = useConsoleAuth();
  const consoleForm = useForm<ConsoleLoginFormValues>({
    resolver: zodResolver(consoleLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onConsoleSubmit = (data: ConsoleLoginFormValues) => {
    consoleLogin(data);
  };

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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md px-4 py-12">
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl gradient-mixed flex items-center justify-center shadow-2xl glow-primary">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-gradient-mixed">NDIS Provider Hub</span>
            </h1>
            <p className="text-muted-foreground">
              Compliance management made simple
            </p>
          </div>
        </div>

        <Card className="glass-card border-border/50 shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1" data-testid="login-type-toggle">
                <TabsTrigger 
                  value="provider" 
                  className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-background data-[state=active]:shadow-lg" 
                  data-testid="tab-provider"
                >
                  <Building2 className="h-4 w-4" />
                  Provider
                </TabsTrigger>
                <TabsTrigger 
                  value="console" 
                  className="gap-2 data-[state=active]:gradient-accent data-[state=active]:text-white data-[state=active]:shadow-lg" 
                  data-testid="tab-console"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Console
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="provider" className="mt-0">
              <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
                <CardContent className="space-y-5 pt-2">
                  <div className="flex items-center gap-4 pb-2">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                      <Building2 className="h-6 w-6 text-background" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Provider Login</CardTitle>
                      <CardDescription>
                        Access your organization portal
                      </CardDescription>
                    </div>
                  </div>

                  {(providerError || companyLoginError) && (
                    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{providerError || (companyLoginError as Error)?.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyId" className="text-sm font-medium">Company Code</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyId"
                        type="text"
                        placeholder="e.g., C-ABC123"
                        className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20 font-mono"
                        {...companyForm.register("companyId")}
                        data-testid="input-company-code"
                      />
                    </div>
                    {companyForm.formState.errors.companyId && (
                      <p className="text-xs text-destructive">{companyForm.formState.errors.companyId.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="providerEmail" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="providerEmail"
                        type="email"
                        placeholder="you@company.com"
                        className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                        {...companyForm.register("email")}
                        data-testid="input-email"
                      />
                    </div>
                    {companyForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{companyForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="providerPassword" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="providerPassword"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary/20"
                        {...companyForm.register("password")}
                        data-testid="input-password"
                      />
                    </div>
                    {companyForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{companyForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-background hover:opacity-90 shadow-lg hover:shadow-xl transition-all h-11"
                    disabled={isCompanyLoggingIn}
                    data-testid="button-login"
                  >
                    {isCompanyLoggingIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="console" className="mt-0">
              <form onSubmit={consoleForm.handleSubmit(onConsoleSubmit)}>
                <CardContent className="space-y-5 pt-2">
                  <div className="flex items-center gap-4 pb-2">
                    <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center shadow-lg">
                      <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Console Login</CardTitle>
                      <CardDescription>
                        Platform administration access
                      </CardDescription>
                    </div>
                  </div>

                  {consoleLoginError && (
                    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{(consoleLoginError as Error)?.message}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="consoleEmail" className="text-sm font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="consoleEmail"
                        type="email"
                        placeholder="admin@console.local"
                        className="pl-10 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20"
                        {...consoleForm.register("email")}
                        data-testid="input-console-email"
                      />
                    </div>
                    {consoleForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{consoleForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="consolePassword" className="text-sm font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="consolePassword"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10 bg-muted/30 border-border/50 focus:border-accent focus:ring-accent/20"
                        {...consoleForm.register("password")}
                        data-testid="input-console-password"
                      />
                    </div>
                    {consoleForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{consoleForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gradient-accent text-white hover:opacity-90 shadow-lg hover:shadow-xl transition-all h-11"
                    disabled={isConsoleLoggingIn}
                    data-testid="button-console-login"
                  >
                    {isConsoleLoggingIn ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Access Console
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-6">
          NDIS compliance management platform
        </p>
      </div>
    </div>
  );
}
