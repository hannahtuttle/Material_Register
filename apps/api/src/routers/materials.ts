import { count, eq, asc } from 'drizzle-orm';
import { materialsListInput } from '@material-register/shared';
import { publicProcedure, router } from '../trpc';
import { materials, plants, manufacturers } from '../db/schema';

// See docs/API.md — materials.list
export const materialsRouter = router({
  list: publicProcedure.input(materialsListInput).query(async ({ ctx, input }) => {
    const { page, pageSize } = input;

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
        .orderBy(asc(materials.materialNumber), asc(materials.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),

      ctx.db.select({ total: count() }).from(materials),
    ]);

    return { items, total: countResult[0].total, page, pageSize };
  }),
});
