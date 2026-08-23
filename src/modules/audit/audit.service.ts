import { IAuditRepository } from './audit.repository';
import { AuditLog, mapAuditLogRow } from './audit.types';

export class AuditService {
  constructor(private readonly repository: IAuditRepository) {}

  async list(options: { entity?: string; userId?: string; page: number; pageSize: number }): Promise<{ items: AuditLog[]; total: number }> {
    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(mapAuditLogRow), total };
  }

  async record(input: { userId: string; action: string; entity: string; entityId?: string | null; details?: unknown }): Promise<void> {
    await this.repository.record(input);
  }
}
