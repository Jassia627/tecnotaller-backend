import { Request, Response } from 'express';
import { NotificationService } from './notifications.service';

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  async listByWorkOrder(req: Request, res: Response): Promise<void> {
    const items = await this.service.listByWorkOrder(req.params.id!);
    res.json({ items });
  }
}
