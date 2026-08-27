import { z } from 'zod';

export interface PurchaseRequestRow {
  id: string;
  status: 'PENDIENTE' | 'ORDENADO' | 'RECIBIDO' | 'CANCELADO';
  total_items: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestItemRow {
  id: string;
  purchase_request_id: string;
  product_id: string | null;
  part_id: string | null;
  quantity: number;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  status: 'PENDIENTE' | 'ORDENADO' | 'RECIBIDO' | 'CANCELADO';
  totalItems: number;
  notes: string | null;
  createdBy: string | null;
  items: PurchaseRequestItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseRequestItem {
  id: string;
  purchaseRequestId: string;
  productId: string | null;
  partId: string | null;
  quantity: number;
  createdAt: string;
}

export function mapPurchaseRequestRow(
  row: PurchaseRequestRow,
  items: PurchaseRequestItem[] = [],
): PurchaseRequest {
  return {
    id: row.id,
    status: row.status,
    totalItems: row.total_items,
    notes: row.notes,
    createdBy: row.created_by,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchaseRequestItemRow(row: PurchaseRequestItemRow): PurchaseRequestItem {
  return {
    id: row.id,
    purchaseRequestId: row.purchase_request_id,
    productId: row.product_id,
    partId: row.part_id,
    quantity: row.quantity,
    createdAt: row.created_at,
  };
}

export const createPurchaseRequestItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  partId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
});

export const createPurchaseRequestSchema = z.object({
  items: z.array(createPurchaseRequestItemSchema).min(1),
  notes: z.string().nullable().optional(),
});

export const updatePurchaseRequestStatusSchema = z.object({
  status: z.enum(['PENDIENTE', 'ORDENADO', 'RECIBIDO', 'CANCELADO']),
});

export type CreatePurchaseRequestItemInput = z.infer<typeof createPurchaseRequestItemSchema>;
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestStatusInput = z.infer<typeof updatePurchaseRequestStatusSchema>;
