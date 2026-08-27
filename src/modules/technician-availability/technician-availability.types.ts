import { z } from 'zod';

export interface TechnicianAvailabilityRow {
  id: string;
  technician_id: string;
  available: boolean;
  unavailable_until: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechnicianAvailability {
  id: string;
  technicianId: string;
  available: boolean;
  unavailableUntil: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export function mapTechnicianAvailabilityRow(row: TechnicianAvailabilityRow): TechnicianAvailability {
  return {
    id: row.id,
    technicianId: row.technician_id,
    available: row.available,
    unavailableUntil: row.unavailable_until,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const updateTechnicianAvailabilitySchema = z.object({
  available: z.boolean(),
  unavailableUntil: z.string().datetime().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export type UpdateTechnicianAvailabilityInput = z.infer<typeof updateTechnicianAvailabilitySchema>;
