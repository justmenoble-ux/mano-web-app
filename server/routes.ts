import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { batchProcess } from "./replit_integrations/batch";
import { openai } from "./replit_integrations/image";
import { z } from "zod";
import multer from "multer";
import { CATEGORIES, CATEGORY_KEYWORDS, InsertTransaction } from "@shared/schema";
import * as XLSX from "xlsx";
import { addMonths, addWeeks, addDays, addYears } from "date-fns";

const upload = multer({ storage: multer.memoryStorage() });

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

// Create recurring transaction entries only up to current date (not into the future)
async function createRecurringTransactions(baseTransaction: InsertTransaction): Promise<void> {
  if (!baseTransaction.isRecurring || !baseTransaction.recurrenceFrequency) {
    return;
  }

  const now = new Date();
  let currentDate = new Date(baseTransaction.date);
  const maxOccurrences = 52; // Safety limit for catching up
  let created = 0;

  while (created < maxOccurrences) {
    currentDate = getNextRecurringDate(currentDate, baseTransaction.recurrenceFrequency);
    
    // Only create entries up to the current date
    if (currentDate > now) {
      break;
    }
    
    await storage.createTransaction({
      userId: baseTransaction.userId,
      owner: baseTransaction.owner,
      vendor: baseTransaction.vendor,
      amount: baseTransaction.amount,
      category: baseTransaction.category,
      isShared: baseTransaction.isShared,
      notes: baseTransaction.notes,
      isRecurring: true,
      recurrenceFrequency: baseTransaction.recurrenceFrequency,
      splitType: baseTransaction.splitType,
      member1Share: baseTransaction.member1Share,
      member2Share: baseTransaction.member2Share,
      date: currentDate,
      statementId: null,
    });
    created++;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth & Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Statements
  app.post(api.statements.upload.path, isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      
      const owner = req.body.owner || "combined";
      const filename = req.file.originalname.toLowerCase();
      let content = "";
      
      // Extract text content based on file type
      if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        try {
          const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
          const sheetNames = workbook.SheetNames;
          const allData: string[] = [];
          
          for (const sheetName of sheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csvData = XLSX.utils.sheet_to_csv(sheet);
            allData.push(csvData);
          }
          content = allData.join('\n\n');
        } catch (xlsErr) {
          console.error("Excel parsing error:", xlsErr);
          return res.status(400).json({ message: "Failed to parse Excel file" });
        }
      } else if (filename.endsWith('.csv')) {
        content = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload CSV or Excel files." });
      }
      
      const statement = await storage.createStatement({
        userId: req.user.claims.sub,
        owner,
        filename: req.file.originalname,
        content,
        status: "pending",
      });
      
      res.status(201).json(statement);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload statement" });
    }
  });

  app.post(api.statements.process.path, isAuthenticated, async (req: any, res) => {
    try {
      const statementId = parseInt(req.params.id);
      const statement = await storage.getStatement(statementId);
      
      if (!statement) return res.status(404).json({ message: "Statement not found" });
      if (statement.status === "processed") return res.json({ message: "Already processed" });

      await storage.updateStatementStatus(statementId, "processing");

      // AI Processing Logic
      const systemPrompt = `You are a financial statement parser. Extract transactions from the following text. 
      Return a JSON object with a 'transactions' array. 
      Each transaction must have: date (ISO string), vendor, amount (number), category (one of: ${CATEGORIES.join(", ")}), and isShared (boolean).
      
      Base categorization on these keywords where possible: ${JSON.stringify(CATEGORY_KEYWORDS)}. 
      If unsure, use 'Miscellaneous'.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: statement.content || "" }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{"transactions": []}');
      
      for (const tx of result.transactions) {
        await storage.createTransaction({
          statementId,
          userId: req.user.claims.sub,
          owner: statement.owner,
          date: new Date(tx.date),
          vendor: tx.vendor,
          amount: String(tx.amount),
          category: tx.category,
          isShared: tx.isShared || false,
          notes: tx.notes || null,
        });
      }

      await storage.updateStatementStatus(statementId, "processed");
      res.json({ message: "Processing complete" });
    } catch (err) {
      console.error("Processing error:", err);
      res.status(500).json({ message: "Processing failed" });
    }
  });

  app.get(api.statements.list.path, isAuthenticated, async (req: any, res) => {
    const statements = await storage.getStatements(req.user.claims.sub);
    res.json(statements);
  });

  app.get(api.statements.get.path, isAuthenticated, async (req: any, res) => {
    const statement = await storage.getStatement(Number(req.params.id));
    if (!statement) return res.status(404).json({ message: "Statement not found" });
    res.json(statement);
  });

  app.delete(api.statements.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteStatement(parseInt(req.params.id));
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Delete failed" });
    }
  });

  // Transactions
  app.get(api.transactions.list.path, isAuthenticated, async (req: any, res) => {
    // Auto-generate any missing recurring transactions
    await storage.generateMissingRecurringTransactions();
    
    const transactions = await storage.getTransactions({
      month: req.query.month as string,
      category: req.query.category as string,
      owner: req.query.owner as string
    });
    res.json(transactions);
  });

  app.post(api.transactions.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const body = {
        ...req.body,
        userId: req.user.claims.sub,
        statementId: req.body.statementId || null,
      };
      const input = api.transactions.create.input.parse(body);
      
      const transaction = await storage.createTransaction(input);
      
      // Create future recurring transactions if this is a recurring expense
      if (input.isRecurring && input.recurrenceFrequency) {
        await createRecurringTransactions(input);
      }
      
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Transaction create error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.put(api.transactions.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.transactions.update.input.parse(req.body);
      const transaction = await storage.updateTransaction(Number(req.params.id), input);
      res.json(transaction);
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // Bulk delete must come BEFORE single delete to prevent /bulk being matched as :id
  app.delete(api.transactions.deleteMultiple.path, isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = api.transactions.deleteMultiple.input.parse(req.body);
      await storage.deleteMultipleTransactions(ids, req.user.claims.sub);
      res.status(204).send();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Bulk delete failed" });
    }
  });

  app.delete(api.transactions.delete.path, isAuthenticated, async (req: any, res) => {
    await storage.deleteTransaction(Number(req.params.id));
    res.status(204).send();
  });

  // Stats
  app.get(api.stats.get.path, isAuthenticated, async (req: any, res) => {
    const stats = await storage.getStats({
      monthFrom: req.query.monthFrom as string,
      monthTo: req.query.monthTo as string,
      owner: req.query.owner as string
    });
    res.json(stats);
  });

  // Household
  app.get("/api/household", isAuthenticated, async (req: any, res) => {
    const household = await storage.getHousehold(req.user.claims.sub);
    if (!household) {
      return res.json(null);
    }
    res.json(household);
  });

  app.patch("/api/household", isAuthenticated, async (req: any, res) => {
    try {
      const { name, member1Name, member2Name } = req.body;
      const household = await storage.updateHousehold(req.user.claims.sub, {
        name,
        member1Name,
        member2Name
      });
      res.json(household);
    } catch (err) {
      console.error("Household update error:", err);
      res.status(500).json({ message: "Failed to update household" });
    }
  });

  app.post("/api/household", isAuthenticated, async (req: any, res) => {
    try {
      const { name, member1Name, member2Name } = req.body;
      
      const existing = await storage.getHousehold(req.user.claims.sub);
      if (existing) {
        const updated = await storage.updateHousehold(req.user.claims.sub, { name, member1Name, member2Name });
        return res.json(updated);
      }
      
      const household = await storage.createHousehold({
        userId: req.user.claims.sub,
        name,
        member1Name,
        member2Name: member2Name || null,
      });
      res.status(201).json(household);
    } catch (err) {
      console.error("Household error:", err);
      res.status(500).json({ message: "Failed to save household" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: any, res) => {
    req.logout?.(() => {});
    req.session?.destroy?.(() => {});
    res.json({ message: "Logged out" });
  });
  
  return httpServer;
}
