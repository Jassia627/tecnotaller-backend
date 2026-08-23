import { z } from 'zod';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: unknown;
  created_at: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  createdAt: string;
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

export const recordAuditSchema = z.object({
  action: z.string().min(1),
  entity: z.string().min(1),
  entityId: z.string().nullable().optional(),
  details: z.unknown().optional(),
});

export type RecordAuditInput = z.infer<typeof recordAuditSchema>;
