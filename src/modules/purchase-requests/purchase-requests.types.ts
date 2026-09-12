import { z } from 'zod';

export const PURCHASE_REQUEST_STATUSES = [
  'PENDIENTE',
  'ORDENADO',
  'RECIBIDO',
  'CANCELADO',
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

// Máquina de estados para compras
export const PURCHASE_STATUS_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  PENDIENTE: ['ORDENADO', 'CANCELADO'],
  ORDENADO: ['RECIBIDO', 'CANCELADO'],
  RECIBIDO: [], // No se puede cambiar de estado desde RECIBIDO
  CANCELADO: [], // No se puede cambiar de estado desde CANCELADO
};

export interface PurchaseRequestRow {
  id: string;
  supplier_id: string | null;
  status: PurchaseRequestStatus;
  total_items: number;
  subtotal: number;
  total: number;
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
  unit_price: number;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  supplierId: string | null;
  status: PurchaseRequestStatus;
  totalItems: number;
  subtotal: number;
  total: number;
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
  unitPrice: number;
  subtotal: number; // quantity × unitPrice
  createdAt: string;
}

export function mapPurchaseRequestRow(
  row: PurchaseRequestRow,
  items: PurchaseRequestItem[] = [],
): PurchaseRequest {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    status: row.status,
    totalItems: row.total_items,
    subtotal: row.subtotal,
    total: row.total,
    notes: row.notes,
    createdBy: row.created_by,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPurchaseRequestItemRow(row: PurchaseRequestItemRow): PurchaseRequestItem {
  const subtotal = row.quantity * row.unit_price;
  return {
    id: row.id,
    purchaseRequestId: row.purchase_request_id,
    productId: row.product_id,
    partId: row.part_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    subtotal,
    createdAt: row.created_at,
  };
}

export const createPurchaseRequestItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  partId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
}).refine(
  (item) => {
    // XOR: exactamente uno debe estar presente
    const hasProduct = item.productId != null;
    const hasPart = item.partId != null;
    return hasProduct !== hasPart; // true si solo uno está presente
  },
  {
    message: 'Debe especificar productId O partId, pero no ambos',
    path: ['productId'], // Mostrar error en productId
  },
);

export const createPurchaseRequestSchema = z.object({
  supplierId: z.string().uuid().nullable().optional(),
  items: z.array(createPurchaseRequestItemSchema).min(1),
  notes: z.string().nullable().optional(),
});

export const updatePurchaseRequestStatusSchema = z.object({
  status: z.enum(PURCHASE_REQUEST_STATUSES),
});

export type CreatePurchaseRequestItemInput = z.infer<typeof createPurchaseRequestItemSchema>;
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;
export type UpdatePurchaseRequestStatusInput = z.infer<typeof updatePurchaseRequestStatusSchema>;
