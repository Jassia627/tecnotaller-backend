import { Request, Response } from 'express';
import { InventoryService } from './inventory.service';
import { BadRequestError } from '../../shared/errors/app-error';

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  async getLowStock(req: Request, res: Response): Promise<void> {
    const threshold = Number(req.query.threshold ?? 10);
    const type = (req.query.type ?? 'all') as string;

    if (isNaN(threshold) || threshold < 0) {
      throw new BadRequestError('threshold debe ser un número no negativo');
    }

    if (!['products', 'parts', 'all'].includes(type)) {
      throw new BadRequestError('type debe ser: products, parts o all');
    }

    const result = await this.service.getLowStock(threshold, type);
    res.json(result);
  }
}
