import { z } from 'zod';

export interface Activity {
  id: string;
  workOrderId: string;
  description: string;
  technicianId: string;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  work_order_id: string;
  description: string;
  technician_id: string;
  created_at: string;
}

export const createActivitySchema = z.object({
  description: z
    .string()
    .min(10, 'Descripción debe tener al menos 10 caracteres')
    .max(500, 'Descripción no puede exceder 500 caracteres'),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
