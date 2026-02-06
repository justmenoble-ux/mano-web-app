import { db } from "./db";
import {
  users,
  statements,
  transactions,
  households,
  type User,
  type Statement,
  type InsertStatement,
  type Transaction,
  type InsertTransaction,
  type UpdateTransactionRequest,
  type StatementWithTransactions,
  type Household,
  type InsertHousehold,
} from "@shared/schema";
import { eq, desc, and, sql, inArray, max } from "drizzle-orm";
import { addMonths, addWeeks, addYears } from "date-fns";

// Owner mapping for backward compatibility
// Maps new dynamic values to include legacy equivalents when querying
function expandOwnerFilter(owner: string): string[] {
  const mapping: Record<string, string[]> = {
    member1: ["member1", "noble"],  // member1 queries also include legacy 'noble'
    member2: ["member2", "maria"],  // member2 queries also include legacy 'maria'
    noble: ["noble", "member1"],    // legacy queries also include new values
    maria: ["maria", "member2"],
  };
  return mapping[owner] || [owner];
}

export interface TransactionFilters {
  month?: string;
  monthFrom?: string;
  monthTo?: string;
  category?: string;
  owner?: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;

  getHousehold(userId: string): Promise<Household | undefined>;
  createHousehold(household: InsertHousehold): Promise<Household>;
  updateHousehold(userId: string, updates: Partial<InsertHousehold>): Promise<Household>;

  createStatement(statement: InsertStatement): Promise<Statement>;
  getStatements(userId: string): Promise<Statement[]>;
  getStatement(id: number): Promise<StatementWithTransactions | undefined>;
  updateStatementStatus(id: number, status: string, content?: string): Promise<Statement>;
  deleteStatement(id: number): Promise<void>;

  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactions(filters?: TransactionFilters): Promise<Transaction[]>;
  updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction>;
  deleteTransaction(id: number): Promise<void>;
  deleteMultipleTransactions(ids: number[], userId: string): Promise<void>;
  generateMissingRecurringTransactions(): Promise<void>;
  
  getStats(filters?: TransactionFilters): Promise<any>;
}

// Helper function to calculate next date based on frequency
function getNextRecurringDate(date: Date, frequency: string): Date {
  switch (frequency) {
    case "weekly":
      return addWeeks(date, 1);
    case "bi-weekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getHousehold(userId: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.userId, userId));
    return household;
  }

  async createHousehold(household: InsertHousehold): Promise<Household> {
    const [newHousehold] = await db.insert(households).values(household).returning();
    return newHousehold;
  }

  async updateHousehold(userId: string, updates: Partial<InsertHousehold>): Promise<Household> {
    const [updated] = await db.update(households)
      .set(updates)
      .where(eq(households.userId, userId))
      .returning();
    return updated;
  }

  async createStatement(statement: InsertStatement): Promise<Statement> {
    const [newItem] = await db.insert(statements).values(statement).returning();
    return newItem;
  }

  async getStatements(userId: string): Promise<Statement[]> {
    return db.select().from(statements)
      .where(eq(statements.userId, userId))
      .orderBy(desc(statements.createdAt));
  }

  async getStatement(id: number): Promise<StatementWithTransactions | undefined> {
    const [statement] = await db.select().from(statements).where(eq(statements.id, id));
    if (!statement) return undefined;

    const txs = await db.select().from(transactions).where(eq(transactions.statementId, id));
    return { ...statement, transactions: txs };
  }

  async updateStatementStatus(id: number, status: string, content?: string): Promise<Statement> {
    const [updated] = await db.update(statements)
      .set({ status, content })
      .where(eq(statements.id, id))
      .returning();
    return updated;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newItem] = await db.insert(transactions).values(transaction).returning();
    return newItem;
  }

  async getTransactions(filters?: TransactionFilters): Promise<Transaction[]> {
    let conditions: any[] = [];
    
    if (filters?.month) {
      const [year, m] = filters.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(m) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(m), 0, 23, 59, 59);
      conditions.push(and(
        sql`${transactions.date} >= ${startDate.toISOString()}`,
        sql`${transactions.date} <= ${endDate.toISOString()}`
      ));
    }
    
    if (filters?.monthFrom && filters?.monthTo) {
      const [yearFrom, mFrom] = filters.monthFrom.split('-');
      const [yearTo, mTo] = filters.monthTo.split('-');
      const startDate = new Date(parseInt(yearFrom), parseInt(mFrom) - 1, 1);
      const endDate = new Date(parseInt(yearTo), parseInt(mTo), 0, 23, 59, 59);
      conditions.push(and(
        sql`${transactions.date} >= ${startDate.toISOString()}`,
        sql`${transactions.date} <= ${endDate.toISOString()}`
      ));
    }

    if (filters?.category) {
      conditions.push(eq(transactions.category, filters.category));
    }

    if (filters?.owner && filters.owner !== "combined") {
      const expandedOwners = expandOwnerFilter(filters.owner);
      conditions.push(inArray(transactions.owner, expandedOwners));
    }
    
    return db.select().from(transactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.date));
  }

  async updateTransaction(id: number, updates: UpdateTransactionRequest): Promise<Transaction> {
    const [updated] = await db.update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return updated;
  }

  async deleteTransaction(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async deleteMultipleTransactions(ids: number[], userId: string): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(transactions).where(
      and(
        inArray(transactions.id, ids),
        eq(transactions.userId, userId)
      )
    );
  }

  async deleteStatement(id: number): Promise<void> {
    await db.delete(transactions).where(eq(transactions.statementId, id));
    await db.delete(statements).where(eq(statements.id, id));
  }

  async generateMissingRecurringTransactions(): Promise<void> {
    const now = new Date();
    
    // Get all recurring transactions
    const recurringTxs = await db.select().from(transactions)
      .where(eq(transactions.isRecurring, true))
      .orderBy(desc(transactions.date));
    
    if (recurringTxs.length === 0) return;
    
    // Group by unique recurring "template" (vendor + amount + frequency + userId + owner)
    const groups = new Map<string, typeof recurringTxs>();
    
    for (const tx of recurringTxs) {
      if (!tx.recurrenceFrequency) continue;
      const key = `${tx.userId}|${tx.vendor}|${tx.amount}|${tx.recurrenceFrequency}|${tx.owner}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }
    
    // For each group, check if we need to generate new entries
    const groupEntries = Array.from(groups.entries());
    for (const [_key, txList] of groupEntries) {
      // Find the latest date in this group
      const latestTx = txList.reduce((latest: Transaction, tx: Transaction) => {
        const txDate = new Date(tx.date);
        const latestDate = new Date(latest.date);
        return txDate > latestDate ? tx : latest;
      });
      
      const latestDate = new Date(latestTx.date);
      const frequency = latestTx.recurrenceFrequency!;
      
      // Calculate next expected date
      let nextDate = getNextRecurringDate(latestDate, frequency);
      
      // Only generate entries up to the current date (not into the future)
      let entriesCreated = 0;
      const maxNewEntries = 52; // Safety limit for catching up (1 year of weekly)
      
      while (nextDate <= now && entriesCreated < maxNewEntries) {
        // Check if this date already exists
        const existingOnDate = txList.find((tx: Transaction) => {
          const txDate = new Date(tx.date);
          return txDate.toDateString() === nextDate.toDateString();
        });
        
        if (!existingOnDate) {
          // Create new entry
          await db.insert(transactions).values({
            userId: latestTx.userId,
            owner: latestTx.owner,
            vendor: latestTx.vendor,
            amount: latestTx.amount,
            category: latestTx.category,
            isShared: latestTx.isShared,
            notes: latestTx.notes,
            isRecurring: true,
            recurrenceFrequency: frequency,
            splitType: latestTx.splitType,
            member1Share: latestTx.member1Share,
            member2Share: latestTx.member2Share,
            date: nextDate,
            statementId: null,
          });
          entriesCreated++;
        }
        
        nextDate = getNextRecurringDate(nextDate, frequency);
      }
    }
  }

  async getStats(filters?: TransactionFilters): Promise<any> {
    // For individual views, we need ALL transactions to calculate combined shares
    const ownerFilter = filters?.owner;
    const isIndividualView = ownerFilter && ownerFilter !== "combined";
    const isCombinedView = ownerFilter === "combined";
    
    // Get transactions without owner filter first if individual view
    const baseFilters = { ...filters };
    if (isIndividualView) {
      delete baseFilters.owner;
    }
    
    const allTxs = await this.getTransactions(baseFilters);
    
    // Calculate effective amount for each transaction based on owner filter
    const getEffectiveAmount = (t: Transaction): number => {
      const amount = Number(t.amount);
      
      if (isCombinedView) {
        // Combined view: only show expenses tagged as "combined"
        return t.owner === "combined" ? amount : 0;
      }
      
      if (!isIndividualView) {
        // No filter: show full amounts
        return amount;
      }
      
      // Individual view
      const expandedOwners = expandOwnerFilter(ownerFilter);
      
      if (expandedOwners.includes(t.owner)) {
        // Transaction belongs to this individual: full amount
        return amount;
      }
      
      if (t.owner === "combined") {
        // Combined expense: calculate this individual's share
        const member1Share = t.member1Share ?? 50;
        const member2Share = t.member2Share ?? 50;
        
        // Check which member we're filtering for
        const isMember1 = ownerFilter === "member1" || ownerFilter === "noble";
        const sharePercent = isMember1 ? member1Share : member2Share;
        
        return (amount * sharePercent) / 100;
      }
      
      // Transaction belongs to the other individual: exclude
      return 0;
    };
    
    // Filter and calculate amounts
    const spendingData = allTxs.map(t => ({
      ...t,
      effectiveAmount: getEffectiveAmount(t)
    })).filter(t => t.effectiveAmount > 0);
    
    const totalSpending = spendingData.reduce((sum, t) => sum + t.effectiveAmount, 0);
    
    const categoryBreakdown = Object.values(spendingData.reduce((acc, t) => {
      acc[t.category] = acc[t.category] || { category: t.category, amount: 0 };
      acc[t.category].amount += t.effectiveAmount;
      return acc;
    }, {} as Record<string, { category: string; amount: number }>));

    return {
      totalSpending,
      categoryBreakdown,
      whoOwesWhom: { debtor: "None", creditor: "None", amount: 0 }
    };
  }
}

export const storage = new DatabaseStorage();
