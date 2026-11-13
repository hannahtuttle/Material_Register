export const MATERIAL_TYPES = ['Spare Part', 'Consumable', 'Raw Material', 'Tool'] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const MATERIAL_STATUSES = ['Active', 'Obsolete', 'Pending Review'] as const;
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number];
