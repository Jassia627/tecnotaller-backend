import { Request, Response } from 'express';
import { ActivityService } from './activities.service';
import { createActivitySchema } from './activities.types';

export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  async create(req: Request, res: Response): Promise<void> {
    const workOrderId = req.params.id;
    const input = createActivitySchema.parse(req.body);

    const activity = await this.service.create(workOrderId, req.user!.id, input);
    res.status(201).json(activity);
  }

  async listByWorkOrder(req: Request, res: Response): Promise<void> {
    const workOrderId = req.params.id;
    const activities = await this.service.listByWorkOrder(workOrderId);
    res.json({ items: activities });
  }
}
