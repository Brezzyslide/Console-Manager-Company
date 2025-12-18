import { 
  consoleUsers, 
  companies, 
  companyUsers, 
  companyRoles,
  changeLog,
  type ConsoleUser, 
  type InsertConsoleUser,
  type Company,
  type InsertCompany,
  type CompanyUser,
  type InsertCompanyUser,
  type CompanyRole,
  type InsertCompanyRole,
  type InsertChangeLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Console Users
  getConsoleUser(id: string): Promise<ConsoleUser | undefined>;
  getConsoleUserByEmail(email: string): Promise<ConsoleUser | undefined>;
  createConsoleUser(user: InsertConsoleUser): Promise<ConsoleUser>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  
  // Company Users
  createCompanyUser(user: InsertCompanyUser): Promise<CompanyUser>;
  getCompanyUser(id: string): Promise<CompanyUser | undefined>;
  getCompanyUserByEmail(companyId: string, email: string): Promise<CompanyUser | undefined>;
  updateCompanyUserPassword(id: string, passwordHash: string): Promise<CompanyUser>;
  
  // Company Roles
  createCompanyRole(role: InsertCompanyRole): Promise<CompanyRole>;
  getCompanyRoles(companyId: string): Promise<CompanyRole[]>;
  
  // Change Log
  logChange(change: InsertChangeLog): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Console Users
  async getConsoleUser(id: string): Promise<ConsoleUser | undefined> {
    const [user] = await db.select().from(consoleUsers).where(eq(consoleUsers.id, id));
    return user || undefined;
  }

  async getConsoleUserByEmail(email: string): Promise<ConsoleUser | undefined> {
    const [user] = await db.select().from(consoleUsers).where(eq(consoleUsers.email, email.toLowerCase()));
    return user || undefined;
  }

  async createConsoleUser(insertUser: InsertConsoleUser): Promise<ConsoleUser> {
    const [user] = await db
      .insert(consoleUsers)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(companies.createdAt);
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ...insertCompany,
        primaryContactEmail: insertCompany.primaryContactEmail.toLowerCase(),
      })
      .returning();
    return company;
  }

  // Company Users
  async createCompanyUser(insertUser: InsertCompanyUser): Promise<CompanyUser> {
    const [user] = await db
      .insert(companyUsers)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
      })
      .returning();
    return user;
  }

  async getCompanyUser(id: string): Promise<CompanyUser | undefined> {
    const [user] = await db.select().from(companyUsers).where(eq(companyUsers.id, id));
    return user || undefined;
  }

  async getCompanyUserByEmail(companyId: string, email: string): Promise<CompanyUser | undefined> {
    const [user] = await db
      .select()
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.email, email.toLowerCase())
        )
      );
    return user || undefined;
  }

  async updateCompanyUserPassword(id: string, passwordHash: string): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set({
        passwordHash,
        tempPasswordHash: null,
        mustResetPassword: false,
      })
      .where(eq(companyUsers.id, id))
      .returning();
    return user;
  }

  // Company Roles
  async createCompanyRole(insertRole: InsertCompanyRole): Promise<CompanyRole> {
    const [role] = await db
      .insert(companyRoles)
      .values(insertRole)
      .returning();
    return role;
  }

  async getCompanyRoles(companyId: string): Promise<CompanyRole[]> {
    return await db.select().from(companyRoles).where(eq(companyRoles.companyId, companyId));
  }

  // Change Log
  async logChange(insertChange: InsertChangeLog): Promise<void> {
    await db.insert(changeLog).values(insertChange);
  }
}

export const storage = new DatabaseStorage();
