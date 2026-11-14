import { initTRPC } from '@trpc/server';
import type { DbClient } from './db/client';

export interface Context {
  db: DbClient;
  requestId: string;
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, ctx }) {
    return {
      ...shape,
      // Hide internal details; leave other codes (BAD_REQUEST etc.) as-is.
      message: error.code === 'INTERNAL_SERVER_ERROR' ? 'Something went wrong' : shape.message,
      data: {
        ...shape.data,
        requestId: ctx?.requestId ?? 'unknown',
        stack: undefined, // never send a stack trace to clients
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
