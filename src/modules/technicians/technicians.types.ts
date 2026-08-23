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

export type RegisterTechnicianInput = z.infer<typeof registerTechnicianSchema>;
