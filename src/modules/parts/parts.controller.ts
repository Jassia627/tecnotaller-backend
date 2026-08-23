import { Request, Response } from 'express';
import { PartService } from './parts.service';
import { assignPartSchema, createPartSchema, updatePartSchema } from './parts.types';

export class PartController {
  constructor(private readonly service: PartService) {}

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.list({ page, pageSize });
    res.json(result);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createPartSchema.parse(req.body);
    const part = await this.service.create(input);
    res.status(201).json(part);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updatePartSchema.parse(req.body);
    const part = await this.service.update(req.params.id!, input);
    res.json(part);
  }

  async assign(req: Request, res: Response): Promise<void> {
    const input = assignPartSchema.parse(req.body);
    const part = await this.service.assignToWorkOrder(req.params.id!, input);
    res.status(201).json(part);
  }
}
