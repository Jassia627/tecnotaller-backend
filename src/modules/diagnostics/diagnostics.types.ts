import { z } from 'zod';

export interface DiagnosticRow {
  id: string;
  work_order_id: string;
  technician_id: string;
  observations: string;
  faults: string;
  recommended_actions: string;
  active?: boolean;
  created_at: string;
}

export interface Diagnostic {
  id: string;
  workOrderId: string;
  technicianId: string;
  observations: string;
  faults: string;
  recommendedActions: string;
  active: boolean;
  createdAt: string;
}

export const createDiagnosticSchema = z.object({
  observations: z.string().min(1).max(1000),
  faults: z.string().min(1).max(1000),
  recommendedActions: z.string().min(1).max(1000),
});

export const updateDiagnosticSchema = createDiagnosticSchema.partial();

export type CreateDiagnosticInput = z.infer<typeof createDiagnosticSchema>;
export type UpdateDiagnosticInput = z.infer<typeof updateDiagnosticSchema>;
