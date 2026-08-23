import { Request, Response } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  constructor(private readonly service: AuditService) {}

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const { entity, userId } = req.query as { entity?: string; userId?: string };
    const result = await this.service.list({ entity, userId, page, pageSize });
    res.json(result);
  }
}
