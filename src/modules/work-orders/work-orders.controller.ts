import { Request, Response } from 'express';
import { WorkOrderService } from './work-orders.service';
import { OrderStatus, createWorkOrderSchema, exitRegisterSchema, transitionStatusSchema } from './work-orders.types';

export class WorkOrderController {
  constructor(private readonly service: WorkOrderService) {}

  async create(req: Request, res: Response): Promise<void> {
    const input = createWorkOrderSchema.parse(req.body);
    const order = await this.service.create(input);
    res.status(201).json(order);
  }

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const { status, technicianId } = req.query as { status?: OrderStatus; technicianId?: string };
    const result = await this.service.list({ status, technicianId, page, pageSize });
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const order = await this.service.getById(req.params.id!);
    res.json(order);
  }

  async transitionStatus(req: Request, res: Response): Promise<void> {
    const { toStatus } = transitionStatusSchema.parse(req.body);
    const order = await this.service.transitionStatus(req.params.id!, toStatus, req.user!.id);
    res.json(order);
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const history = await this.service.getHistory(req.params.id!);
    res.json({ items: history });
  }

  async trackByGuide(req: Request, res: Response): Promise<void> {
    const result = await this.service.trackByGuide(req.params.guideNumber!);
    res.json(result);
  }

  async addPhoto(req: Request, res: Response): Promise<void> {
    const { storagePath, kind } = req.body as { storagePath: string; kind: 'inicial' | 'final' };
    await this.service.addPhoto(req.params.id!, storagePath, kind);
    res.status(201).json({ ok: true });
  }

  async registerExit(req: Request, res: Response): Promise<void> {
    const input = exitRegisterSchema.parse(req.body);
    const order = await this.service.registerExit(req.params.id!, input);
    res.json(order);
  }
}
