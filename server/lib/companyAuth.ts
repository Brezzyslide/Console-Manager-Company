import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const COMPANY_JWT_SECRET = process.env.COMPANY_JWT_SECRET || "company-default-secret-change-in-production";
const COOKIE_NAME = "company_token";
const JWT_EXPIRY = "8h";

// Simple in-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  
  if (!record || now > record.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  record.count++;
  return { allowed: true };
}

export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

export interface CompanyJwtPayload {
  companyUserId: string;
  companyId: string;
  email: string;
  role: string;
  mustResetPassword: boolean;
}

export interface AuthenticatedCompanyRequest extends Request {
  companyUser?: CompanyJwtPayload;
}

export function generateCompanyToken(
  userId: string,
  companyId: string,
  email: string,
  role: string,
  mustResetPassword: boolean
): string {
  const payload: CompanyJwtPayload = {
    companyUserId: userId,
    companyId,
    email,
    role,
    mustResetPassword,
  };
  return jwt.sign(payload, COMPANY_JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyCompanyToken(token: string): CompanyJwtPayload | null {
  try {
    return jwt.verify(token, COMPANY_JWT_SECRET) as CompanyJwtPayload;
  } catch (error) {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function setCompanyCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearCompanyCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function requireCompanyAuth(
  req: AuthenticatedCompanyRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies[COOKIE_NAME];
  
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  const payload = verifyCompanyToken(token);
  
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  
  req.companyUser = payload;
  next();
}

export function requirePasswordReset(
  req: AuthenticatedCompanyRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.companyUser?.mustResetPassword) {
    res.status(403).json({ error: "Password reset required", requiresPasswordReset: true });
    return;
  }
  next();
}

export type CompanyRole = "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly";

export function requireRole(allowedRoles: CompanyRole[]) {
  return (req: AuthenticatedCompanyRequest, res: Response, next: NextFunction): void => {
    if (!req.companyUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    if (!allowedRoles.includes(req.companyUser.role as CompanyRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    
    next();
  };
}
