import { z } from 'zod';

export const PAGE_SIZES = [10, 25, 50, 100] as const;

const materialsListInputShape = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // z.coerce so the same schema works for both JSON input (tRPC) and URL
  // query strings (the web app parses those in a later prompt).
  pageSize: z.coerce
    .number()
    .refine(
      (v): v is (typeof PAGE_SIZES)[number] => (PAGE_SIZES as readonly number[]).includes(v),
      { message: `pageSize must be one of ${PAGE_SIZES.join(', ')}` },
    )
    .default(25),
});

// z.preprocess normalises undefined → {} before validation so field-level
// defaults apply whether the caller omits the input entirely or passes {}.
export const materialsListInput = z.preprocess((v) => v ?? {}, materialsListInputShape);

export type MaterialsListInput = z.infer<typeof materialsListInputShape>;
