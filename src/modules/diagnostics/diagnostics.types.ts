import { z } from 'zod';

export interface DiagnosticRow {
  id: string;
  work_order_id: string;
  technician_id: string;
  observations: string;
  faults: string;
  recommended_actions: string;
  created_at: string;
}

export interface Diagnostic {
  id: string;
  workOrderId: string;
  technicianId: string;
  observations: string;
  faults: string;
  recommendedActions: string;
  createdAt: string;
}

export const createDiagnosticSchema = z.object({
  observations: z.string().min(1),
  faults: z.string().min(1),
  recommendedActions: z.string().min(1),
});

export type CreateDiagnosticInput = z.infer<typeof createDiagnosticSchema>;
