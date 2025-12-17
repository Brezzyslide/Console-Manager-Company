import { z } from "zod";

export const companySchema = z.object({
  id: z.string(),
  legalName: z.string(),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string(),
  primaryContactEmail: z.string(),
  timezone: z.string(),
  complianceScope: z.array(z.string()),
  status: z.enum(['active', 'suspended', 'onboarding']),
  createdAt: z.string(),
});

export type Company = z.infer<typeof companySchema>;

export const createCompanySchema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  abn: z.string().optional(),
  ndisRegistrationNumber: z.string().optional(),
  primaryContactName: z.string().min(2, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Valid email is required"),
  timezone: z.string().default("Australia/Melbourne"),
  complianceScope: z.array(z.string()).default([]),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const consoleUserSchema = z.object({
  id: z.string(),
  email: z.string(),
});

export type ConsoleUser = z.infer<typeof consoleUserSchema>;

// API Functions

export async function loginConsole(email: string, password: string): Promise<ConsoleUser> {
  const res = await fetch("/api/console/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  if (!res.ok) {
    throw new Error("Login failed");
  }
  
  return res.json();
}

export async function logoutConsole(): Promise<void> {
  const res = await fetch("/api/console/logout", {
    method: "POST",
  });
  
  if (!res.ok) {
    throw new Error("Logout failed");
  }
}

export async function getConsoleMe(): Promise<ConsoleUser> {
  const res = await fetch("/api/console/me");
  
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  
  if (!res.ok) {
    throw new Error("Failed to fetch user");
  }
  
  return res.json();
}

export async function getCompanies(): Promise<Company[]> {
  const res = await fetch("/api/console/companies");
  
  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }
  
  return res.json();
}

export async function getCompany(id: string): Promise<Company> {
  const res = await fetch(`/api/console/companies/${id}`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch company");
  }
  
  return res.json();
}

export async function createCompany(data: CreateCompanyInput): Promise<{
  company: Company;
  adminEmail: string;
  tempPassword: string;
}> {
  const res = await fetch("/api/console/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    throw new Error("Failed to create company");
  }
  
  return res.json();
}
