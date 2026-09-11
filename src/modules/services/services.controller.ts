import { Request, Response } from 'express';
import { ServiceService } from './services.service';
import { createServiceSchema, updateServiceSchema } from './services.types';

export class ServiceController {
  constructor(private readonly service: ServiceService) {}

  async listPublic(_req: Request, res: Response): Promise<void> {
    const items = await this.service.listPublic();
    res.json({ items });
  }

  async listAll(_req: Request, res: Response): Promise<void> {
    const items = await this.service.listAll();
    res.json({ items });
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createServiceSchema.parse(req.body);
    const service = await this.service.create(input);
    res.status(201).json(service);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateServiceSchema.parse(req.body);
    const service = await this.service.update(req.params.id!, input);
    res.json(service);
  }

  async changeStatus(req: Request, res: Response): Promise<void> {
    const { active } = req.body as { active: boolean };
    const service = await this.service.changeStatus(req.params.id!, active);
    res.json(service);
  }

  async delete(req: Request, res: Response): Promise<void> {
    // Soft-delete: desactiva el servicio temporalmente (active: false)
    const service = await this.service.changeStatus(req.params.id!, false);
    res.json(service);
  }
}
