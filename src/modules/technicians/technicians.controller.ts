import { Request, Response } from 'express';
import { TechnicianService } from './technicians.service';
import { registerTechnicianSchema, setActiveTechnicianSchema, updateTechnicianSchema } from './technicians.types';

export class TechnicianController {
  constructor(private readonly service: TechnicianService) {}

  async list(_req: Request, res: Response): Promise<void> {
    const items = await this.service.list();
    res.json({ items });
  }

  async register(req: Request, res: Response): Promise<void> {
    const input = registerTechnicianSchema.parse(req.body);
    const technician = await this.service.register(input);
    res.status(201).json(technician);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateTechnicianSchema.parse(req.body);
    const technician = await this.service.update(req.params.id!, input);
    res.json(technician);
  }

  async setActive(req: Request, res: Response): Promise<void> {
    const { active } = setActiveTechnicianSchema.parse(req.body);
    const technician = await this.service.setActive(req.params.id!, active);
    res.json(technician);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.service.delete(req.params.id!);
    res.json({ success: true });
  }

  async listWorkOrders(req: Request, res: Response): Promise<void> {
    const items = await this.service.listWorkOrders(req.params.id!);
    res.json({ items });
  }
}
