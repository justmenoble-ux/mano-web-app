import { z } from 'zod';
import { insertTransactionSchema, insertStatementSchema, transactions, statements, CATEGORIES } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  statements: {
    upload: {
      method: 'POST' as const,
      path: '/api/statements/upload',
      responses: {
        201: z.custom<typeof statements.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/statements',
      responses: {
        200: z.array(z.custom<typeof statements.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/statements/:id',
      responses: {
        200: z.custom<typeof statements.$inferSelect & { transactions: typeof transactions.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    process: {
      method: 'POST' as const,
      path: '/api/statements/:id/process',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/statements/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      input: z.object({
        month: z.string().optional(), 
        category: z.string().optional(),
        userId: z.string().optional(),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions',
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/transactions/:id',
      input: insertTransactionSchema.partial(),
      responses: {
        200: z.custom<typeof transactions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transactions/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    deleteMultiple: {
      method: 'DELETE' as const,
      path: '/api/transactions/bulk',
      input: z.object({ ids: z.array(z.number()) }),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
      },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats',
      input: z.object({
        month: z.string().optional(),
        userId: z.string().optional(), // Noble or Maria or Combined (undefined)
      }).optional(),
      responses: {
        200: z.object({
          totalSpending: z.number(),
          categoryBreakdown: z.array(z.object({ category: z.string(), amount: z.number() })),
          whoOwesWhom: z.object({
            debtor: z.string(),
            creditor: z.string(),
            amount: z.number(),
          }),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
