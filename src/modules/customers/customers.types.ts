import { z } from 'zod';

export interface CustomerRow {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  createdAt: string;
}

export function mapCustomerRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    createdAt: row.created_at,
  };
}

export const createCustomerSchema = z.object({
  email: z.string().email().nullable().optional(),
  fullName: z.string().min(1),
  phone: z.string().nullable().optional(),
});

export const updateCustomerSchema = z.object({
  email: z.string().email().nullable().optional(),
  fullName: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
