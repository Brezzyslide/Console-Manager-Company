import { z } from "zod";

export const companyLoginSchema = z.object({
  companyId: z.string().uuid("Invalid company ID"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CompanyLoginInput = z.infer<typeof companyLoginSchema>;

export const passwordResetSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(12, "Password must be at least 12 characters"),
  confirmPassword: z.string().min(12, "Password must be at least 12 characters"),
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

export interface CompanyUserListItem {
  id: string;
  email: string;
  fullName: string;
  role: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly";
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: string;
}

export const createUserSchema = z.object({
  email: z.string().email("Valid email required"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["CompanyAdmin", "Auditor", "Reviewer", "StaffReadOnly"]),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

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

// Admin API functions
export async function getCompanyUsers(): Promise<CompanyUserListItem[]> {
  const res = await fetch("/api/company/admin/users", {
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to fetch users");
  }
  
  return res.json();
}

export async function createCompanyUser(input: CreateUserInput): Promise<{ id: string; email: string; fullName: string; role: string; tempPassword: string }> {
  const res = await fetch("/api/company/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create user");
  }
  
  return res.json();
}

export async function updateCompanyUser(id: string, updates: { fullName?: string; role?: string; isActive?: boolean }): Promise<CompanyUserListItem> {
  const res = await fetch(`/api/company/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update user");
  }
  
  return res.json();
}

export async function resetUserTempPassword(id: string): Promise<{ tempPassword: string; message: string }> {
  const res = await fetch(`/api/company/admin/users/${id}/reset-temp-password`, {
    method: "POST",
    credentials: "include",
  });
  
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to reset password");
  }
  
  return res.json();
}
