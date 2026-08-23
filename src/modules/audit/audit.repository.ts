import { supabase } from '../../config/supabase';
import { AuditLogRow } from './audit.types';

export interface IAuditRepository {
  list(options: { entity?: string; userId?: string; page: number; pageSize: number }): Promise<{ rows: AuditLogRow[]; total: number }>;
  record(input: { userId: string; action: string; entity: string; entityId?: string | null; details?: unknown }): Promise<void>;
}

export class AuditRepository implements IAuditRepository {
  async list(options: { entity?: string; userId?: string; page: number; pageSize: number }): Promise<{ rows: AuditLogRow[]; total: number }> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    let query = supabase.from('audit_logs').select('*', { count: 'exact' });
    if (options.entity) query = query.eq('entity', options.entity);
    if (options.userId) query = query.eq('user_id', options.userId);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as AuditLogRow[]) ?? [], total: count ?? 0 };
  }

  async record(input: { userId: string; action: string; entity: string; entityId?: string | null; details?: unknown }): Promise<void> {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: input.userId,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      details: input.details ?? null,
    });
    if (error) throw error;
  }
}
