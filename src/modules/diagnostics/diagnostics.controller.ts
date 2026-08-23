import { Request, Response } from 'express';
import { DiagnosticService } from './diagnostics.service';
import { createDiagnosticSchema } from './diagnostics.types';

export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}

  async list(req: Request, res: Response): Promise<void> {
    const items = await this.service.listByWorkOrder(req.params.id!);
    res.json({ items });
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createDiagnosticSchema.parse(req.body);
    const diagnostic = await this.service.create(req.params.id!, req.user!.id, input);
    res.status(201).json(diagnostic);
  }
}
