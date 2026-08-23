import { z } from 'zod';

export type WarrantyStatus = 'vigente' | 'vencida';

export interface WarrantyRow {
  id: string;
  work_order_id: string;
  period_days: number;
  expires_at: string;
  status: WarrantyStatus;
  created_at: string;
}

export interface Warranty {
  id: string;
  workOrderId: string;
  periodDays: number;
  expiresAt: string;
  status: WarrantyStatus;
  createdAt: string;
  isActive: boolean;
}

export function mapWarrantyRow(row: WarrantyRow): Warranty {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    periodDays: row.period_days,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
    isActive: row.status === 'vigente',
  };
}

export const createWarrantySchema = z.object({
  periodDays: z.number().int().min(1),
});

export type CreateWarrantyInput = z.infer<typeof createWarrantySchema>;
