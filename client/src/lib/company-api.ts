import { z } from "zod";

export const companyLoginSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CompanyLoginInput = z.infer<typeof companyLoginSchema>;

export const passwordResetSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

export interface CompanyUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  companyId: string;
  requiresPasswordReset: boolean;
}

export async function companyLogin(input: CompanyLoginInput): Promise<CompanyUser> {
  const res = await fetch("/api/company/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Login failed");
  }
  
  return res.json();
}

export async function companyLogout(): Promise<void> {
  const res = await fetch("/api/company/logout", {
    method: "POST",
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Logout failed");
  }
}

export async function getCompanyMe(): Promise<CompanyUser> {
  const res = await fetch("/api/company/me", {
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Not authenticated");
  }
  
  return res.json();
}

export async function resetPassword(input: PasswordResetInput): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/company/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Password reset failed");
  }
  
  return res.json();
}
