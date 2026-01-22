import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useCompanyAuth } from "@/hooks/use-company-auth";
import { passwordResetSchema, PasswordResetInput, resetPassword, companyLogout } from "@/lib/company-api";
import { KeyRound, Loader2, Lock, CheckCircle2, AlertCircle, ShieldCheck, LogOut } from "lucide-react";
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

export default function PasswordResetPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useCompanyAuth();
  const [success, setSuccess] = useState(false);
  
  const form = useForm<PasswordResetInput>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        setLocation("/company/dashboard");
      }, 2000);
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/company/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  const onSubmit = (data: PasswordResetInput) => {
    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-emerald-500/20">
          <CardHeader className="text-center space-y-4">
            <div className="h-14 w-14 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Password Updated</CardTitle>
              <CardDescription className="mt-2">
                Your password has been changed successfully. Redirecting to dashboard...
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="text-center space-y-4">
          <div className="h-14 w-14 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mx-auto">
            <KeyRound className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription className="mt-2">
              Your temporary password must be changed before continuing
            </CardDescription>
          </div>
        </CardHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {mutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
              </Alert>
            )}
            
            <Alert className="bg-muted/50 border-amber-500/20">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                Choose a strong password with at least 8 characters including letters and numbers.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current/Temporary Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter your temporary password"
                  className="pl-10"
                  {...form.register("currentPassword")}
                  data-testid="input-current-password"
                />
              </div>
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Create a new password"
                  className="pl-10"
                  {...form.register("newPassword")}
                  data-testid="input-new-password"
                />
              </div>
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  className="pl-10"
                  {...form.register("confirmPassword")}
                  data-testid="input-confirm-password"
                />
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
              data-testid="button-reset-password"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Set New Password"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={async () => {
                await companyLogout();
                setLocation("/company/login");
              }}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out and use different account
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
