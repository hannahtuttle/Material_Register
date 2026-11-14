import { sql } from 'drizzle-orm';
import { createDb } from './client';
import { materials, manufacturers, plants } from './schema';
import { BASE_PRODUCTS, MANUFACTURER_SEEDS, PLANT_SEEDS } from './seed-data';

// Fixed — do not change. Altering this value shifts every generated record.
const PRNG_SEED = 0xdeadbeef;

// All updated_at values are relative to this anchor so they are stable
// across runs regardless of when the seed is executed.
const ANCHOR_DATE = new Date('2026-11-01T00:00:00Z');
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

const TOTAL = 5000;
const BATCH_SIZE = 500;

// mulberry32 — a fast, deterministic 32-bit PRNG by Tommy Ettinger.
// Returns a function that produces uniform floats in [0, 1).
function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let z = Math.imul(s ^ (s >>> 15), 1 | s);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick<T>(
  rand: () => number,
  options: readonly { value: T; weight: number }[],
): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let r = rand() * total;
  for (const option of options) {
    r -= option.weight;
    if (r <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

function intBetween(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

const STATUS_WEIGHTS = [
  { value: 'Active' as const, weight: 80 },
  { value: 'Obsolete' as const, weight: 12 },
  { value: 'Pending Review' as const, weight: 8 },
] as const;

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — run via npm run db:seed');

  const { db, pool } = createDb(url);
  const start = Date.now();

  try {
    await db.transaction(async (tx) => {
      // Clear all three tables and reset their id sequences so IDs are
      // identical on every run. CASCADE handles the FK order automatically.
      await tx.execute(
        sql`TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE`,
      );

      const plantRows = await tx
        .insert(plants)
        .values(PLANT_SEEDS.map((p) => ({ code: p.code, name: p.name })))
        .returning();

      const manufacturerRows = await tx
        .insert(manufacturers)
        .values(MANUFACTURER_SEEDS.map((name) => ({ name })))
        .returning();

      const rand = mulberry32(PRNG_SEED);
      const records = [];

      for (let i = 1; i <= TOTAL; i++) {
        const product = pick(rand, BASE_PRODUCTS);
        const updatedAt = new Date(ANCHOR_DATE.getTime() - Math.floor(rand() * TWO_YEARS_MS));

        records.push({
          materialNumber: `MAT-${String(i).padStart(6, '0')}`,
          description: product.description,
          materialType: product.materialType,
          status: weightedPick(rand, STATUS_WEIGHTS),
          manufacturerId: pick(rand, manufacturerRows).id,
          manufacturerPartNumber: product.mpn,
          plantId: pick(rand, plantRows).id,
          unitOfMeasure: product.unitOfMeasure,
          unitPrice: product.unitPrice,
          // ~10% of records sit at zero stock to represent out-of-stock items.
          quantityOnHand: rand() < 0.1 ? 0 : intBetween(rand, 1, 500),
          updatedAt,
        });
      }

      // Insert in batches of 500. Postgres's bind-parameter limit is 65,535;
      // 500 rows × 11 columns = 5,500 params per batch.
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        await tx.insert(materials).values(records.slice(i, i + BATCH_SIZE));
      }
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(
      `Seeded: ${PLANT_SEEDS.length} plants, ${MANUFACTURER_SEEDS.length} manufacturers, ${TOTAL} materials in ${elapsed}s`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
