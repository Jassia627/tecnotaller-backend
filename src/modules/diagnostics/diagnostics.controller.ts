import { Request, Response } from 'express';
import { DiagnosticService } from './diagnostics.service';
import { createDiagnosticSchema, updateDiagnosticSchema } from './diagnostics.types';

export class DiagnosticController {
  constructor(private readonly service: DiagnosticService) {}

  async list(req: Request, res: Response): Promise<void> {
    const items = await this.service.listByWorkOrder(
      req.params.id!,
      req.user!.id,
      req.user!.role
    );
    res.json({ items });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const diagnostic = await this.service.getById(
      req.params.diagnosticId!,
      req.user!.id,
      req.user!.role
    );
    res.json(diagnostic);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createDiagnosticSchema.parse(req.body);
    const diagnostic = await this.service.create(
      req.params.id!,
      req.user!.id,
      input,
      req.user!.id,
      req.user!.role
    );
    res.status(201).json(diagnostic);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateDiagnosticSchema.parse(req.body);
    const diagnostic = await this.service.update(
      req.params.diagnosticId!,
      input,
      req.user!.id,
      req.user!.role
    );
    res.json(diagnostic);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const diagnostic = await this.service.delete(
      req.params.diagnosticId!,
      req.user!.id,
      req.user!.role
    );
    res.json(diagnostic);
  }
}
