import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "../storage";

const CONSOLE_JWT_SECRET = process.env.CONSOLE_JWT_SECRET || "default-secret-change-in-production";
const COOKIE_NAME = "console_token";
const JWT_EXPIRY = "8h";

export interface ConsoleJwtPayload {
  consoleUserId: string;
  email: string;
}

export interface AuthenticatedConsoleRequest extends Request {
  consoleUser?: ConsoleJwtPayload;
}

export function generateConsoleToken(userId: string, email: string): string {
  const payload: ConsoleJwtPayload = {
    consoleUserId: userId,
    email,
  };
  return jwt.sign(payload, CONSOLE_JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyConsoleToken(token: string): ConsoleJwtPayload | null {
  try {
    return jwt.verify(token, CONSOLE_JWT_SECRET) as ConsoleJwtPayload;
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

export function setConsoleCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  });
}

export function clearConsoleCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME);
}

export function requireConsoleAuth(
  req: AuthenticatedConsoleRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies[COOKIE_NAME];
  
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  const payload = verifyConsoleToken(token);
  
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  
  req.consoleUser = payload;
  next();
}

export async function bootstrapConsoleUser(): Promise<void> {
  const email = process.env.CONSOLE_BOOTSTRAP_EMAIL;
  const password = process.env.CONSOLE_BOOTSTRAP_PASSWORD;
  
  if (!email || !password) {
    console.warn("CONSOLE_BOOTSTRAP_EMAIL or CONSOLE_BOOTSTRAP_PASSWORD not set. Skipping bootstrap.");
    return;
  }
  
  const existingUser = await storage.getConsoleUserByEmail(email);
  
  if (existingUser) {
    console.log(`Console user ${email} already exists. Skipping bootstrap.`);
    return;
  }
  
  const passwordHash = await hashPassword(password);
  await storage.createConsoleUser({
    email: email.toLowerCase(),
    passwordHash,
    isActive: true,
  });
  
  console.log(`✓ Console user ${email} created successfully.`);
}
