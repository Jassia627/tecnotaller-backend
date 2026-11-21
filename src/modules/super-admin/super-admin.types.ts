import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(2, 'El nombre del plan es obligatorio'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'El slug solo permite minúsculas, números y guiones'),
  maxTechnicians: z.coerce.number().int().min(1),
  maxMonthlyOrders: z.coerce.number().int().min(1),
  maxProducts: z.coerce.number().int().min(1),
  priceMonthly: z.coerce.number().min(0),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(2, 'El nombre del taller es obligatorio'),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'El slug solo permite minúsculas, números y guiones'),
  planId: z.string().uuid('Plan inválido'),
  whatsappNumber: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  // Datos del administrador inicial del taller
  adminFullName: z.string().min(2, 'El nombre del administrador es obligatorio'),
  adminEmail: z.string().email('Email de administrador inválido'),
  adminPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  planId: z.string().uuid().optional(),
  whatsappNumber: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
