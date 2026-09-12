import { z } from 'zod';

export interface SupplierRow {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function mapSupplierRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  contactPerson: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().min(1).max(20),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  contactPerson: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(1).max(20).optional(),
  address: z.string().min(1).max(500).optional(),
  city: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
