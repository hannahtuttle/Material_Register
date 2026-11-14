import { TRPCError } from '@trpc/server';
import { createTestDb, createTestCaller, truncateAll } from './helpers';
import { manufacturers, materials, plants } from '../src/db/schema';

const testDb = createTestDb();

afterAll(() => testDb.pool.end());

// Inserted OUT OF sort order so tests prove ORDER BY, not insertion order.
// Plants: Sydney (id=1) then Brisbane (id=2).
// Manufacturers: SKF (id=1) then Gates (id=2).
// Materials: scrambled materialNumbers so ORDER BY materialNumber is exercised.
//   Insertion IDs after RESTART IDENTITY:
//     MAT-000012→1, MAT-000006→2, MAT-000001→3, MAT-000009→4,
//     MAT-000003→5, MAT-000007→6, MAT-000011→7, MAT-000002→8,
//     MAT-000005→9, MAT-000010→10, MAT-000004→11, MAT-000008→12
const UPDATED_AT = new Date('2026-01-01T00:00:00.000Z');

beforeEach(async () => {
  await truncateAll(testDb.db);

  await testDb.db.insert(plants).values([
    { code: '2000', name: 'Sydney' },
    { code: '1000', name: 'Brisbane' },
  ]);

  await testDb.db.insert(manufacturers).values([{ name: 'SKF' }, { name: 'Gates' }]);

  await testDb.db.insert(materials).values([
    {
      materialNumber: 'MAT-000012',
      description: 'V-belt, B section',
      materialType: 'Spare Part',
      status: 'Active',
      manufacturerId: 2,
      manufacturerPartNumber: 'B65',
      plantId: 2,
      unitOfMeasure: 'EA',
      unitPrice: '32.80',
      quantityOnHand: 5,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000006',
      description: 'Oil filter',
      materialType: 'Consumable',
      status: 'Obsolete',
      manufacturerId: 1,
      manufacturerPartNumber: 'P502028',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '27.90',
      quantityOnHand: 0,
      updatedAt: UPDATED_AT,
    },
    // This becomes id=3 — fully specified for the exact-equality assertion.
    {
      materialNumber: 'MAT-000001',
      description: 'Bearing, deep groove ball',
      materialType: 'Spare Part',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: '6205-2RS1',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '44.50',
      quantityOnHand: 10,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000009',
      description: 'Grease, EP2',
      materialType: 'Consumable',
      status: 'Active',
      manufacturerId: 2,
      manufacturerPartNumber: 'MBL-EP2-18KG',
      plantId: 2,
      unitOfMeasure: 'KG',
      unitPrice: '94.00',
      quantityOnHand: 3,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000003',
      description: 'V-belt, B section',
      materialType: 'Spare Part',
      status: 'Pending Review',
      manufacturerId: 2,
      manufacturerPartNumber: 'B80',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '32.80',
      quantityOnHand: 8,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000007',
      description: 'Bearing, deep groove ball',
      materialType: 'Spare Part',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: '6208-ZZ',
      plantId: 2,
      unitOfMeasure: 'EA',
      unitPrice: '58.00',
      quantityOnHand: 4,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000011',
      description: 'Oil filter',
      materialType: 'Consumable',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: 'LF3959',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '31.50',
      quantityOnHand: 12,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000002',
      description: 'Grease, EP2',
      materialType: 'Consumable',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: 'MBL-EP2-500G',
      plantId: 2,
      unitOfMeasure: 'KG',
      unitPrice: '18.90',
      quantityOnHand: 20,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000005',
      description: 'V-belt, B section',
      materialType: 'Spare Part',
      status: 'Obsolete',
      manufacturerId: 2,
      manufacturerPartNumber: 'B95',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '36.40',
      quantityOnHand: 0,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000010',
      description: 'Bearing, angular contact',
      materialType: 'Spare Part',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: '7210-BECBP',
      plantId: 2,
      unitOfMeasure: 'EA',
      unitPrice: '210.00',
      quantityOnHand: 2,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000004',
      description: 'Oil filter',
      materialType: 'Consumable',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: 'P553000',
      plantId: 2,
      unitOfMeasure: 'EA',
      unitPrice: '29.60',
      quantityOnHand: 7,
      updatedAt: UPDATED_AT,
    },
    {
      materialNumber: 'MAT-000008',
      description: 'Bearing, deep groove ball',
      materialType: 'Spare Part',
      status: 'Active',
      manufacturerId: 1,
      manufacturerPartNumber: '6306-2Z',
      plantId: 1,
      unitOfMeasure: 'EA',
      unitPrice: '72.00',
      quantityOnHand: 6,
      updatedAt: UPDATED_AT,
    },
  ]);
});

test('materials.list page 1 returns 10 items ordered by materialNumber', async () => {
  const caller = createTestCaller(testDb.db);
  const result = await caller.materials.list({ page: 1, pageSize: 10 });

  expect(result.total).toBe(12);
  expect(result.page).toBe(1);
  expect(result.pageSize).toBe(10);
  expect(result.items).toHaveLength(10);
  expect(result.items[0].materialNumber).toBe('MAT-000001');
  expect(result.items[9].materialNumber).toBe('MAT-000010');

  // Full exact shape of the first row — proves joins, field selection, and types.
  // MAT-000001 is the 3rd insertion, so its serial id=3.
  expect(result.items[0]).toEqual({
    id: 3,
    materialNumber: 'MAT-000001',
    description: 'Bearing, deep groove ball',
    materialType: 'Spare Part',
    status: 'Active',
    manufacturerPartNumber: '6205-2RS1',
    unitOfMeasure: 'EA',
    unitPrice: '44.50',
    quantityOnHand: 10,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    plantCode: '2000',
    plantName: 'Sydney',
    manufacturerName: 'SKF',
  });
});

test('materials.list page 2 returns the remaining 2 items', async () => {
  const caller = createTestCaller(testDb.db);
  const result = await caller.materials.list({ page: 2, pageSize: 10 });

  expect(result.total).toBe(12);
  expect(result.items).toHaveLength(2);
  expect(result.items[0].materialNumber).toBe('MAT-000011');
  expect(result.items[1].materialNumber).toBe('MAT-000012');
});

test('materials.list rejects invalid pageSize with BAD_REQUEST', async () => {
  const caller = createTestCaller(testDb.db);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately testing invalid input
  const err = await caller.materials.list({ page: 1, pageSize: 7 } as any).catch((e) => e);
  expect(err).toBeInstanceOf(TRPCError);
  expect(err.code).toBe('BAD_REQUEST');
});
