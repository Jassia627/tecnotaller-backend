import { Request, Response } from 'express';
import { TechnicianAvailabilityService } from './technician-availability.service';
import { updateTechnicianAvailabilitySchema } from './technician-availability.types';

export class TechnicianAvailabilityController {
  constructor(private readonly service: TechnicianAvailabilityService) {}

  async getByTechnicianId(req: Request, res: Response): Promise<void> {
    const availability = await this.service.getByTechnicianId(req.params.id!);
    res.json(availability);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateTechnicianAvailabilitySchema.parse(req.body);
    const availability = await this.service.update(req.params.id!, input);
    res.json(availability);
  }
}
