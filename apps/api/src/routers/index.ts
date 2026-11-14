import { router } from '../trpc';
import { materialsRouter } from './materials';

export const appRouter = router({
  materials: materialsRouter,
});

// Type-only export — the web app imports this for end-to-end type safety
// without bundling any server code.
export type AppRouter = typeof appRouter;
