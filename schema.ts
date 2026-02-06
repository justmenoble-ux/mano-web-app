import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

// Household Configuration Table
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull(),
  member1Name: text("member1_name").notNull(),
  member2Name: text("member2_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHouseholdSchema = createInsertSchema(households).omit({ 
  id: true, 
  createdAt: true 
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;

// Owner type supports both legacy values (noble/maria) and new dynamic values (member1/member2)
export type Owner = "member1" | "member2" | "combined" | "noble" | "maria";

export const CATEGORIES = [
  "Car",
  "Cellular & Wifi",
  "Dining",
  "Entertainment",
  "Fitness & Sports",
  "Fuel",
  "Gifts & Donation",
  "Groceries",
  "Health & Wellness",
  "Household",
  "Housing",
  "Learning & Development",
  "Miscellaneous",
  "Parents",
  "Parking (Public)",
  "Self Care",
  "Shopping",
  "Subscriptions",
  "Transportation",
  "Travel",
  "Utilities"
] as const;

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Car": ["car wash", "car repair", "auto repair", "mechanic", "tire", "oil change", "honda", "toyota", "ford", "dealership"],
  "Fuel": ["esso", "shell", "petro-canada", "gas station", "fuel", "gasoline", "petroleum"],
  "Parking (Public)": ["parking", "green p", "impark", "indigo", "parkway"],
  "Transportation": ["uber", "lyft", "ttc", "transit", "presto", "go train", "via rail", "taxi", "cab"],
  "Cellular & Wifi": ["rogers", "bell", "telus", "fido", "koodo", "freedom mobile", "virgin mobile", "chatr", "internet", "wifi"],
  "Gifts & Donation": ["gift", "birthday", "wedding", "charity", "donation", "present", "flowers"],
  "Subscriptions": ["netflix", "spotify", "amazon prime", "disney", "apple", "subscription", "membership", "youtube", "hulu"],
  "Health & Wellness": ["pharmacy", "doctor", "dentist", "shoppers drug mart", "rexall", "medical", "clinic", "hospital", "prescription"],
  "Parents": ["senior", "eldercare", "parent", "mom", "dad", "family support"],
  "Learning & Development": ["course", "class", "udemy", "coursera", "book", "education", "tuition", "school", "training"],
  "Fitness & Sports": ["gym", "fitness", "yoga", "pilates", "goodlife", "equinox", "sports", "workout", "athletic"],
  "Travel": ["flight", "hotel", "airbnb", "vacation", "expedia", "booking", "airline", "resort", "travel"],
  "Groceries": ["loblaws", "sobeys", "metro", "no frills", "walmart", "costco", "freshco", "supermarket", "grocery", "food basics"],
  "Household": ["cleaning", "toiletries", "home depot", "ikea", "canadian tire", "rona", "home hardware"],
  "Housing": ["rent", "mortgage", "condo fee", "property tax", "home insurance"],
  "Utilities": ["hydro", "electricity", "water", "enbridge", "gas bill", "utility"],
  "Dining": ["restaurant", "cafe", "coffee", "starbucks", "tim hortons", "mcdonald", "fast food", "takeout", "uber eats", "doordash"],
  "Entertainment": ["movies", "cinema", "concert", "theatre", "bar", "pub", "nightclub", "event", "ticket"],
  "Self Care": ["salon", "spa", "hair", "nails", "beauty", "skincare", "massage", "wellness"],
  "Shopping": ["amazon", "ebay", "walmart", "target", "best buy", "clothing", "shoes", "mall", "retail", "store", "shop", "fashion", "outlet"],
  "Miscellaneous": ["other", "misc", "unknown"],
};

// Statements Table
export const statements = pgTable("statements", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  owner: text("owner").notNull().default("combined"),
  filename: text("filename").notNull(),
  content: text("content"),
  status: text("status").notNull().default("pending"), 
  createdAt: timestamp("created_at").defaultNow(),
});

// Recurring frequency options
export const RECURRENCE_FREQUENCIES = [
  "weekly",
  "bi-weekly", 
  "monthly",
  "quarterly",
  "yearly"
] as const;

export type RecurrenceFrequency = typeof RECURRENCE_FREQUENCIES[number];

// Split type for combined expenses
export const SPLIT_TYPES = ["50-50", "custom"] as const;
export type SplitType = typeof SPLIT_TYPES[number];

// Transactions Table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  statementId: integer("statement_id"), 
  userId: text("user_id").notNull(),
  owner: text("owner").notNull().default("combined"),
  date: timestamp("date").notNull(),
  vendor: text("vendor").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isShared: boolean("is_shared").default(false),
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceFrequency: text("recurrence_frequency"),
  splitType: text("split_type"),
  member1Share: integer("member1_share"),
  member2Share: integer("member2_share"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const statementsRelations = relations(statements, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  statement: one(statements, {
    fields: [transactions.statementId],
    references: [statements.id],
  }),
}));

// Schemas
export const insertStatementSchema = createInsertSchema(statements).omit({ 
  id: true, 
  createdAt: true 
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
}).omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type Statement = typeof statements.$inferSelect;
export type InsertStatement = z.infer<typeof insertStatementSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type CreateTransactionRequest = InsertTransaction;
export type UpdateTransactionRequest = Partial<InsertTransaction>;

export type StatementWithTransactions = Statement & {
  transactions: Transaction[];
};

export interface DashboardStats {
  totalSpending: number;
  categoryBreakdown: { category: string; amount: number }[];
}
