import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { companyLoginSchema, CompanyLoginInput } from "@/lib/company-api";
import { Building2, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompanyLoginPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { user, isAuthenticated, requiresPasswordReset, login, isLoggingIn, loginError } = useCompanyAuth();
  const [error, setError] = useState<string | null>(null);
  
  const companyIdFromUrl = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get("company") || "";
  }, [searchString]);
  
  const form = useForm<CompanyLoginInput>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: {
      companyId: companyIdFromUrl,
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (companyIdFromUrl) {
      form.setValue("companyId", companyIdFromUrl);
    }
  }, [companyIdFromUrl, form]);

  useEffect(() => {
    if (isAuthenticated) {
      if (requiresPasswordReset) {
        setLocation("/company/password-reset");
      } else {
        setLocation("/company/dashboard");
      }
    }
  }, [isAuthenticated, requiresPasswordReset, setLocation]);

  const onSubmit = async (data: CompanyLoginInput) => {
    setError(null);
    try {
      const result = await login(data);
      if (result.requiresPasswordReset) {
        setLocation("/company/password-reset");
      } else {
        setLocation("/company/dashboard");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="h-14 w-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Provider Login</CardTitle>
            <CardDescription className="mt-2">
              Sign in to your provider portal
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {(error || loginError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || (loginError as Error)?.message}</AlertDescription>
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
                  {...form.register("companyId")}
                  data-testid="input-company-id"
                />
              </div>
              {form.formState.errors.companyId && (
                <p className="text-sm text-destructive">{form.formState.errors.companyId.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  {...form.register("email")}
                  data-testid="input-email"
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  {...form.register("password")}
                  data-testid="input-password"
                />
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn}
              data-testid="button-login"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
