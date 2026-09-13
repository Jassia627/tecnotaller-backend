import { Request, Response } from 'express';
import { WorkOrderService } from './work-orders.service';
import { OrderStatus, createWorkOrderSchema, exitRegisterSchema, transitionStatusSchema } from './work-orders.types';
import { ActivityService } from '../activities/activities.service';
import { ActivityRepository } from '../activities/activities.repository';
import { createActivitySchema } from '../activities/activities.types';

export class WorkOrderController {
  private readonly activityService: ActivityService;

  constructor(private readonly service: WorkOrderService) {
    const activityRepository = new ActivityRepository();
    this.activityService = new ActivityService(activityRepository);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createWorkOrderSchema.parse(req.body);
    // Cuando admin/técnico crea desde panel: estado ACEPTADA directamente
    const order = await this.service.create(input, 'ACEPTADA');
    res.status(201).json(order);
  }

  async createAsClient(req: Request, res: Response): Promise<void> {
    const input = createWorkOrderSchema.parse(req.body);
    // Auto-asignar customerId al cliente autenticado
    // Estado: PENDIENTE (pendiente de aceptación por admin/técnico)
    const inputWithCustomer = {
      ...input,
      customerId: req.user!.id,
      technicianId: null, // El cliente no puede asignar técnico
    };
    const order = await this.service.create(inputWithCustomer, 'PENDIENTE');
    res.status(201).json(order);
  }

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const { status, technicianId, fromDate, toDate, searchText } = req.query as {
      status?: OrderStatus;
      technicianId?: string;
      fromDate?: string;
      toDate?: string;
      searchText?: string;
    };
    // Pasar userTechnicianId y userRole para validación de ownership
    const result = await this.service.list({ 
      status, 
      technicianId, 
      fromDate, 
      toDate, 
      searchText, 
      page, 
      pageSize,
      userTechnicianId: req.user!.id,
      userRole: req.user!.role,
    });
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
    // Pasar customerId si es cliente autenticado
    const customerId = req.user?.role === 'cliente' ? req.user?.id : undefined;
    const result = await this.service.trackByGuide(req.params.guideNumber!, customerId);
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

  async createActivity(req: Request, res: Response): Promise<void> {
    const input = createActivitySchema.parse(req.body);
    const activity = await this.activityService.create(req.params.id!, req.user!.id, input);
    res.status(201).json(activity);
  }

  async listActivities(req: Request, res: Response): Promise<void> {
    const activities = await this.activityService.listByWorkOrder(req.params.id!);
    res.json({ items: activities });
  }
}
