import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { MATERIAL_STATUSES, MATERIAL_TYPES } from '@material-register/shared';

// Postgres enums built from the shared as-const arrays so DB, Zod (prompt 06)
// and the UI all draw from one definition.
export const materialTypeEnum = pgEnum('material_type', MATERIAL_TYPES);
export const materialStatusEnum = pgEnum('material_status', MATERIAL_STATUSES);

export const plants = pgTable('plants', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

export const manufacturers = pgTable('manufacturers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const materials = pgTable(
  'materials',
  {
    id: serial('id').primaryKey(),
    materialNumber: text('material_number').notNull().unique(),
    description: text('description').notNull(),
    materialType: materialTypeEnum('material_type').notNull(),
    status: materialStatusEnum('status').notNull(),
    manufacturerId: integer('manufacturer_id')
      .notNull()
      .references(() => manufacturers.id),
    manufacturerPartNumber: text('manufacturer_part_number').notNull(),
    plantId: integer('plant_id')
      .notNull()
      .references(() => plants.id),
    unitOfMeasure: text('unit_of_measure').notNull(),
    // numeric stays in string mode (default) — JS floats can't represent
    // high-precision decimals accurately; format on the front end instead.
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    quantityOnHand: integer('quantity_on_hand').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (cols) => [
    index('materials_status_idx').on(cols.status),
    index('materials_material_type_idx').on(cols.materialType),
    index('materials_plant_id_idx').on(cols.plantId),
    index('materials_manufacturer_id_idx').on(cols.manufacturerId),
    index('materials_unit_price_idx').on(cols.unitPrice),
    index('materials_updated_at_idx').on(cols.updatedAt),
    index('materials_description_idx').on(cols.description),
    index('materials_quantity_on_hand_idx').on(cols.quantityOnHand),
  ],
);
