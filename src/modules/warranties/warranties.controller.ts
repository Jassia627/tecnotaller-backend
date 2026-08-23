import { Request, Response } from 'express';
import { WarrantyService } from './warranties.service';
import { createWarrantySchema } from './warranties.types';

export class WarrantyController {
  constructor(private readonly service: WarrantyService) {}

  async create(req: Request, res: Response): Promise<void> {
    const input = createWarrantySchema.parse(req.body);
    const warranty = await this.service.create(req.params.id!, input);
    res.status(201).json(warranty);
  }

  async get(req: Request, res: Response): Promise<void> {
    const warranty = await this.service.getByWorkOrder(req.params.id!);
    res.json({ warranty });
  }
}
