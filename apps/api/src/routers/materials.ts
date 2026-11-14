import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { materialsListInput } from '@material-register/shared';
import { publicProcedure, router } from '../trpc';
import { materials, plants, manufacturers } from '../db/schema';

// Escape ILIKE special characters so user input is treated as a literal string.
// Without this, a search like "50%" would match any value starting with "50".
function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const sortColumns = {
  materialNumber: materials.materialNumber,
  description: materials.description,
  unitPrice: materials.unitPrice,
  quantityOnHand: materials.quantityOnHand,
  updatedAt: materials.updatedAt,
} as const;

// See docs/API.md — materials.list
export const materialsRouter = router({
  list: publicProcedure.input(materialsListInput).query(async ({ ctx, input }) => {
    const { page, pageSize, search, materialType, status, sortBy, sortDir } = input;

    const pattern = search ? `%${escapeLike(search)}%` : undefined;

    const where = and(
      pattern
        ? or(
            ilike(materials.materialNumber, pattern),
            ilike(materials.description, pattern),
            ilike(materials.manufacturerPartNumber, pattern),
          )
        : undefined,
      materialType ? eq(materials.materialType, materialType) : undefined,
      status ? eq(materials.status, status) : undefined,
    );

    const sortCol = sortColumns[sortBy];
    const orderBy = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

    const [items, countResult] = await Promise.all([
      ctx.db
        .select({
          id: materials.id,
          materialNumber: materials.materialNumber,
          description: materials.description,
          materialType: materials.materialType,
          status: materials.status,
          manufacturerPartNumber: materials.manufacturerPartNumber,
          unitOfMeasure: materials.unitOfMeasure,
          unitPrice: materials.unitPrice,
          quantityOnHand: materials.quantityOnHand,
          updatedAt: materials.updatedAt,
          plantCode: plants.code,
          plantName: plants.name,
          manufacturerName: manufacturers.name,
        })
        .from(materials)
        .innerJoin(plants, eq(plants.id, materials.plantId))
        .innerJoin(manufacturers, eq(manufacturers.id, materials.manufacturerId))
        .where(where)
        .orderBy(orderBy, asc(materials.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),

      ctx.db.select({ total: count() }).from(materials).where(where),
    ]);

    return { items, total: countResult[0].total, page, pageSize };
  }),
});
