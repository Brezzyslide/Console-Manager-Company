import { 
  consoleUsers, 
  companies, 
  companyUsers, 
  companyRoles,
  changeLog,
  supportCategories,
  supportLineItems,
  companyServiceSelections,
  type ConsoleUser, 
  type InsertConsoleUser,
  type Company,
  type InsertCompany,
  type CompanyUser,
  type InsertCompanyUser,
  type CompanyRole,
  type InsertCompanyRole,
  type InsertChangeLog,
  type SupportCategory,
  type InsertSupportCategory,
  type SupportLineItem,
  type InsertSupportLineItem,
  type CompanyServiceSelection,
  type InsertCompanyServiceSelection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, asc } from "drizzle-orm";

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
  getCompanyAdmin(companyId: string): Promise<{ email: string; fullName: string } | undefined>;
  getCompanyUsers(companyId: string): Promise<CompanyUser[]>;
  updateCompanyUserPassword(id: string, passwordHash: string): Promise<CompanyUser>;
  updateCompanyUser(id: string, companyId: string, updates: { fullName?: string; role?: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly"; isActive?: boolean }): Promise<CompanyUser>;
  setTempPassword(id: string, companyId: string, tempPasswordHash: string): Promise<CompanyUser>;
  
  // Company Roles
  createCompanyRole(role: InsertCompanyRole): Promise<CompanyRole>;
  getCompanyRoles(companyId: string): Promise<CompanyRole[]>;
  
  // Support Catalogue
  getSupportCategories(): Promise<SupportCategory[]>;
  createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory>;
  getSupportLineItems(): Promise<SupportLineItem[]>;
  getActiveLineItems(): Promise<SupportLineItem[]>;
  getLineItemsByCategory(categoryId: string): Promise<SupportLineItem[]>;
  getLineItemsByCategoryIds(categoryIds: string[]): Promise<SupportLineItem[]>;
  createSupportLineItem(item: InsertSupportLineItem): Promise<SupportLineItem>;
  
  // Company Service Selections
  createCompanyServiceSelections(selections: InsertCompanyServiceSelection[]): Promise<void>;
  getCompanyServiceSelections(companyId: string): Promise<CompanyServiceSelection[]>;
  
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

  async getCompanyAdmin(companyId: string): Promise<{ email: string; fullName: string } | undefined> {
    const [admin] = await db
      .select({ email: companyUsers.email, fullName: companyUsers.fullName })
      .from(companyUsers)
      .where(
        and(
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.role, "CompanyAdmin")
        )
      )
      .limit(1);
    return admin || undefined;
  }

  async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
    return await db
      .select()
      .from(companyUsers)
      .where(eq(companyUsers.companyId, companyId))
      .orderBy(companyUsers.createdAt);
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

  async updateCompanyUser(id: string, companyId: string, updates: { fullName?: string; role?: "CompanyAdmin" | "Auditor" | "Reviewer" | "StaffReadOnly"; isActive?: boolean }): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set(updates)
      .where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)))
      .returning();
    return user;
  }

  async setTempPassword(id: string, companyId: string, tempPasswordHash: string): Promise<CompanyUser> {
    const [user] = await db
      .update(companyUsers)
      .set({
        tempPasswordHash,
        mustResetPassword: true,
        passwordHash: null,
      })
      .where(and(eq(companyUsers.id, id), eq(companyUsers.companyId, companyId)))
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

  // Support Catalogue
  async getSupportCategories(): Promise<SupportCategory[]> {
    return await db.select().from(supportCategories).orderBy(asc(supportCategories.sortOrder));
  }

  async createSupportCategory(category: InsertSupportCategory): Promise<SupportCategory> {
    const [created] = await db.insert(supportCategories).values(category).returning();
    return created;
  }

  async getSupportLineItems(): Promise<SupportLineItem[]> {
    return await db.select().from(supportLineItems).orderBy(asc(supportLineItems.sortOrder));
  }

  async getActiveLineItems(): Promise<SupportLineItem[]> {
    return await db
      .select()
      .from(supportLineItems)
      .where(eq(supportLineItems.isActive, true))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async getLineItemsByCategory(categoryId: string): Promise<SupportLineItem[]> {
    return await db
      .select()
      .from(supportLineItems)
      .where(and(eq(supportLineItems.categoryId, categoryId), eq(supportLineItems.isActive, true)))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async getLineItemsByCategoryIds(categoryIds: string[]): Promise<SupportLineItem[]> {
    if (categoryIds.length === 0) return [];
    return await db
      .select()
      .from(supportLineItems)
      .where(and(inArray(supportLineItems.categoryId, categoryIds), eq(supportLineItems.isActive, true)))
      .orderBy(asc(supportLineItems.sortOrder));
  }

  async createSupportLineItem(item: InsertSupportLineItem): Promise<SupportLineItem> {
    const [created] = await db.insert(supportLineItems).values(item).returning();
    return created;
  }

  // Company Service Selections
  async createCompanyServiceSelections(selections: InsertCompanyServiceSelection[]): Promise<void> {
    if (selections.length === 0) return;
    await db.insert(companyServiceSelections).values(selections);
  }

  async getCompanyServiceSelections(companyId: string): Promise<CompanyServiceSelection[]> {
    return await db
      .select()
      .from(companyServiceSelections)
      .where(eq(companyServiceSelections.companyId, companyId));
  }

  // Change Log
  async logChange(insertChange: InsertChangeLog): Promise<void> {
    await db.insert(changeLog).values(insertChange);
  }
}

export const storage = new DatabaseStorage();
