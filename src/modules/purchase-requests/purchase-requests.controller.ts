import { Request, Response } from 'express';
import { PurchaseRequestService } from './purchase-requests.service';
import { createPurchaseRequestSchema, updatePurchaseRequestStatusSchema } from './purchase-requests.types';

export class PurchaseRequestController {
  constructor(private readonly service: PurchaseRequestService) {}

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.list({ page, pageSize });
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const purchaseRequest = await this.service.getById(req.params.id!);
    res.json(purchaseRequest);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createPurchaseRequestSchema.parse(req.body);
    const purchaseRequest = await this.service.create(input, req.user?.id!);
    res.status(201).json(purchaseRequest);
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const input = updatePurchaseRequestStatusSchema.parse(req.body);
    const purchaseRequest = await this.service.updateStatus(req.params.id!, input);
    res.json(purchaseRequest);
  }
}
