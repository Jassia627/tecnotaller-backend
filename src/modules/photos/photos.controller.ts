import { Request, Response } from 'express';
import { PhotoService } from './photos.service';

export class PhotoController {
  constructor(private readonly service: PhotoService) {}

  async upload(req: Request, res: Response): Promise<void> {
    const workOrderId = req.params.id!;
    const kind = req.body.kind as 'inicial' | 'final';

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const photo = await this.service.upload(
      workOrderId,
      kind,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json(photo);
  }

  async listByWorkOrder(req: Request, res: Response): Promise<void> {
    const workOrderId = req.params.id!;
    const photos = await this.service.listByWorkOrder(workOrderId);
    res.json({ items: photos });
  }
}
