import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { IWorkOrderRepository } from './work-orders.repository';
import { GuidGenerator } from '../../shared/utils/guid';
import {
  CreateWorkOrderInput,
  ExitRegisterInput,
  OrderStatus,
  StatusHistoryEntry,
  WorkOrder,
} from './work-orders.types';

export class WorkOrderService {
  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly guid: GuidGenerator,
  ) {}

  async create(input: CreateWorkOrderInput, initialStatus: 'PENDIENTE' | 'ACEPTADA' = 'ACEPTADA'): Promise<WorkOrder> {
    const guideNumber = this.guid.generate().slice(0, 8).toUpperCase();
    return WorkOrder.fromRow(await this.repository.create(input, guideNumber, initialStatus));
  }

  async getById(id: string): Promise<WorkOrder> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Orden de servicio no encontrada');
    return WorkOrder.fromRow(row);
  }

  async list(options: {
    status?: OrderStatus;
    technicianId?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page: number;
    pageSize: number;
    userTechnicianId?: string;
    userRole?: string;
  }): Promise<{ items: WorkOrder[]; total: number }> {
    // Validar ownership: si es técnico, solo ver sus órdenes
    if (options.userRole === 'tecnico' && !options.technicianId) {
      options.technicianId = options.userTechnicianId;
    }

    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(WorkOrder.fromRow), total };
  }

  async transitionStatus(id: string, to: OrderStatus, userId: string): Promise<WorkOrder> {
    const order = await this.getById(id);
    if (!order.canTransitionTo(to)) {
      throw new ForbiddenError(`Transición de estado inválida: ${order.currentStatus} -> ${to}`);
    }
    const row = await this.repository.transitionStatus(id, order.currentStatus, to, userId);
    return WorkOrder.fromRow(row);
  }

  async getHistory(id: string): Promise<StatusHistoryEntry[]> {
    await this.getById(id);
    const rows = await this.repository.listHistory(id);
    return rows.map((r) => ({
      id: r.id,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      userId: r.user_id,
      createdAt: r.created_at,
    }));
  }

  async trackByGuide(guideNumber: string, customerId?: string): Promise<{ order: WorkOrder; history: StatusHistoryEntry[] }> {
    const row = await this.repository.findByGuideNumber(guideNumber);
    if (!row) throw new NotFoundError('No se encontró ninguna orden con esa guía');
    
    // Si se proporciona customerId, validar que coincida (para clientes)
    if (customerId && row.customer_id !== customerId) {
      throw new ForbiddenError('No tienes permiso para rastrear esta orden');
    }
    
    const history = await this.repository.listHistoryByGuide(guideNumber);
    return {
      order: WorkOrder.fromRow(row),
      history: history.map((r) => ({
        id: r.id,
        fromStatus: r.from_status,
        toStatus: r.to_status,
        userId: r.user_id,
        createdAt: r.created_at,
      })),
    };
  }

  async addPhoto(id: string, storagePath: string, kind: 'inicial' | 'final'): Promise<void> {
    await this.getById(id);
    await this.repository.addPhoto(id, storagePath, kind);
  }

  async registerExit(id: string, input: ExitRegisterInput): Promise<WorkOrder> {
    // Obtener la orden actual para validar su estado
    const order = await this.getById(id);
    
    // Validar que la orden esté en LISTO_PARA_ENTREGA
    if (order.currentStatus !== 'LISTO_PARA_ENTREGA') {
      throw new ForbiddenError(
        `No se puede registrar salida. La orden debe estar en estado LISTO_PARA_ENTREGA, pero está en ${order.currentStatus}`
      );
    }

    const row = await this.repository.registerExit(id, input);
    return WorkOrder.fromRow(row);
  }
}
