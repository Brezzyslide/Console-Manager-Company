import { db } from "./db";
import { supportCategories, supportLineItems } from "@shared/schema";

const CATALOGUE_VERSION = "seed-v1";

const CATEGORIES = [
  { categoryKey: "CORE", categoryLabel: "Core Supports", sortOrder: 1 },
  { categoryKey: "CAPACITY_BUILDING", categoryLabel: "Capacity Building", sortOrder: 2 },
  { categoryKey: "BEHAVIOUR_SUPPORT", categoryLabel: "Behaviour Support", sortOrder: 3 },
  { categoryKey: "THERAPIES", categoryLabel: "Therapies", sortOrder: 4 },
  { categoryKey: "AT", categoryLabel: "Assistive Technology", sortOrder: 5 },
];

const LINE_ITEMS: Record<string, Array<{ itemCode: string; itemLabel: string; budgetGroup: string; sortOrder: number }>> = {
  CORE: [
    { itemCode: "0120", itemLabel: "Participate Community", budgetGroup: "Core", sortOrder: 1 },
    { itemCode: "0117", itemLabel: "Household Tasks", budgetGroup: "Core", sortOrder: 2 },
    { itemCode: "0107", itemLabel: "Assist Travel / Transport / Transition", budgetGroup: "Core", sortOrder: 3 },
    { itemCode: "0106", itemLabel: "Assist Life Stage Transition", budgetGroup: "Core", sortOrder: 4 },
    { itemCode: "0115", itemLabel: "Daily Personal Activities", budgetGroup: "Core", sortOrder: 5 },
    { itemCode: "0116", itemLabel: "Assistance with Self-Care Activities", budgetGroup: "Core", sortOrder: 6 },
    { itemCode: "0125", itemLabel: "Innovative Community Participation", budgetGroup: "Core", sortOrder: 7 },
  ],
  CAPACITY_BUILDING: [
    { itemCode: "0108", itemLabel: "Development Life Skills", budgetGroup: "Capacity Building", sortOrder: 1 },
    { itemCode: "0109", itemLabel: "Increased Social & Community Participation", budgetGroup: "Capacity Building", sortOrder: 2 },
    { itemCode: "0118", itemLabel: "Employment Support", budgetGroup: "Capacity Building", sortOrder: 3 },
    { itemCode: "0132", itemLabel: "Support Coordination", budgetGroup: "Capacity Building", sortOrder: 4 },
    { itemCode: "0136", itemLabel: "Plan Management", budgetGroup: "Capacity Building", sortOrder: 5 },
    { itemCode: "0127", itemLabel: "Improved Living Arrangements", budgetGroup: "Capacity Building", sortOrder: 6 },
  ],
  BEHAVIOUR_SUPPORT: [
    { itemCode: "0110", itemLabel: "Specialist Positive Behaviour Support", budgetGroup: "Capacity Building", sortOrder: 1 },
    { itemCode: "0110-001", itemLabel: "Behaviour Management Plan Development", budgetGroup: "Capacity Building", sortOrder: 2 },
    { itemCode: "0110-002", itemLabel: "Behaviour Support Training", budgetGroup: "Capacity Building", sortOrder: 3 },
    { itemCode: "0110-003", itemLabel: "Restrictive Practice Reporting", budgetGroup: "Capacity Building", sortOrder: 4 },
    { itemCode: "0110-004", itemLabel: "Behaviour Crisis Intervention", budgetGroup: "Capacity Building", sortOrder: 5 },
  ],
  THERAPIES: [
    { itemCode: "0128-001", itemLabel: "Speech Pathology Assessment", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 1 },
    { itemCode: "0128-002", itemLabel: "Speech Pathology Therapy", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 2 },
    { itemCode: "0128-003", itemLabel: "Occupational Therapy Assessment", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 3 },
    { itemCode: "0128-004", itemLabel: "Occupational Therapy", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 4 },
    { itemCode: "0128-005", itemLabel: "Physiotherapy Assessment", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 5 },
    { itemCode: "0128-006", itemLabel: "Physiotherapy", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 6 },
    { itemCode: "0128-007", itemLabel: "Psychology Assessment", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 7 },
    { itemCode: "0128-008", itemLabel: "Psychology Sessions", budgetGroup: "Capacity Building (Improved Daily Living)", sortOrder: 8 },
  ],
  AT: [
    { itemCode: "0300-001", itemLabel: "Low Cost AT", budgetGroup: "Capital/Consumables", sortOrder: 1 },
    { itemCode: "0300-002", itemLabel: "Assistive Technology – Assessment / Advice", budgetGroup: "Capital", sortOrder: 2 },
    { itemCode: "0300-003", itemLabel: "Assistive Technology – Training", budgetGroup: "Capacity Building", sortOrder: 3 },
    { itemCode: "0300-004", itemLabel: "Consumables – AT related", budgetGroup: "Capital/Consumables", sortOrder: 4 },
    { itemCode: "0300-005", itemLabel: "Vehicle Modifications", budgetGroup: "Capital", sortOrder: 5 },
    { itemCode: "0300-006", itemLabel: "Home Modifications", budgetGroup: "Capital", sortOrder: 6 },
  ],
};

export async function seedSupportCatalogue(): Promise<void> {
  const existingCategories = await db.select().from(supportCategories);
  
  if (existingCategories.length > 0) {
    console.log(`Support catalogue already seeded (${existingCategories.length} categories exist). Skipping.`);
    return;
  }

  console.log("Seeding support catalogue...");

  for (const cat of CATEGORIES) {
    const [created] = await db.insert(supportCategories).values(cat).returning();
    console.log(`  Created category: ${cat.categoryLabel}`);

    const items = LINE_ITEMS[cat.categoryKey] || [];
    for (const item of items) {
      await db.insert(supportLineItems).values({
        categoryId: created.id,
        itemCode: item.itemCode,
        itemLabel: item.itemLabel,
        budgetGroup: item.budgetGroup,
        sortOrder: item.sortOrder,
        isActive: true,
      });
    }
    console.log(`    Added ${items.length} line items`);
  }

  console.log(`Support catalogue seeded successfully (version: ${CATALOGUE_VERSION})`);
}

export { CATALOGUE_VERSION };
