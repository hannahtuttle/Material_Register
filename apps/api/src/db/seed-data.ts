import type { MaterialType } from '@material-register/shared';

export const PLANT_SEEDS = [
  { code: '1000', name: 'Brisbane' },
  { code: '2000', name: 'Sydney' },
  { code: '3000', name: 'Perth' },
  { code: '4000', name: 'Melbourne' },
  { code: '5000', name: 'Newcastle' },
] as const;

export const MANUFACTURER_SEEDS = ['SKF', 'Gates', 'Mobil', '3M', 'Makita'] as const;

export interface BaseProduct {
  description: string;
  materialType: MaterialType;
  mpn: string;
  unitOfMeasure: string;
  unitPrice: string;
}

export const BASE_PRODUCTS: BaseProduct[] = [
  {
    description: 'Bearing, deep groove ball, 25mm bore',
    materialType: 'Spare Part',
    mpn: '6205-2RS1',
    unitOfMeasure: 'EA',
    unitPrice: '44.50',
  },
  {
    description: 'V-belt, classical B section, 1200mm',
    materialType: 'Spare Part',
    mpn: 'B65',
    unitOfMeasure: 'EA',
    unitPrice: '32.80',
  },
  {
    description: 'Oil filter, spin-on',
    materialType: 'Consumable',
    mpn: 'P502028',
    unitOfMeasure: 'EA',
    unitPrice: '27.90',
  },
  {
    description: 'Grease, lithium complex EP2, 18kg pail',
    materialType: 'Consumable',
    mpn: 'MBL-EP2-18KG',
    unitOfMeasure: 'KG',
    unitPrice: '94.00',
  },
  {
    description: 'Circuit breaker, thermal magnetic, 16A 3P',
    materialType: 'Spare Part',
    mpn: 'LC1D18BD',
    unitOfMeasure: 'EA',
    unitPrice: '118.50',
  },
  {
    description: 'Hydraulic hose assembly, 2-wire braid, 100bar WP, 1m',
    materialType: 'Spare Part',
    mpn: 'PFC100B1H',
    unitOfMeasure: 'EA',
    unitPrice: '84.00',
  },
  {
    description: 'Steel plate, structural grade 350, 6mm x 1200mm x 2400mm',
    materialType: 'Raw Material',
    mpn: 'BSPL-6-1200-2400',
    unitOfMeasure: 'EA',
    unitPrice: '310.00',
  },
  {
    description: 'Angle grinder, 125mm disc, 1200W',
    materialType: 'Tool',
    mpn: 'MKT-GA5020-230',
    unitOfMeasure: 'EA',
    unitPrice: '179.00',
  },
  {
    description: 'PTFE thread seal tape, 12mm x 10m roll',
    materialType: 'Consumable',
    mpn: '3M-PTFE-12-10',
    unitOfMeasure: 'ROLL',
    unitPrice: '11.90',
  },
  {
    description: 'Pneumatic cylinder, double-acting, 50mm bore x 200mm stroke',
    materialType: 'Spare Part',
    mpn: 'DSBC-50-200-PPSA-N3',
    unitOfMeasure: 'EA',
    unitPrice: '215.00',
  },
];
