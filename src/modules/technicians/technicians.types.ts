import { z } from 'zod';

export interface Technician {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

export const registerTechnicianSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional(),
});

export const setActiveTechnicianSchema = z.object({
  active: z.boolean().describe('Estado activo/inactivo del técnico'),
});

export const updateTechnicianSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
});

export type RegisterTechnicianInput = z.infer<typeof registerTechnicianSchema>;
export type SetActiveTechnicianInput = z.infer<typeof setActiveTechnicianSchema>;
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianSchema>;

export interface DeleteTechnicianResponse {
  success: boolean;
}
