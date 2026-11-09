import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { IWorkOrderRepository } from './work-orders.repository';
import { GuidGenerator } from '../../shared/utils/guid';
import { AuthorizationFilterFactory } from '../../shared/authorization/filters/authorization-filter-factory';
import {
  AssignTechnicianInput,
  CreateWorkOrderInput,
  ExitRegisterInput,
  OrderStatus,
  StatusHistoryEntry,
  WorkOrder,
} from './work-orders.types';
import { WorkOrderCommandFactory, WorkOrderInvoker } from './work-order-commands';

export class WorkOrderService {
  private readonly commandFactory: WorkOrderCommandFactory;
  private readonly invoker: WorkOrderInvoker;

  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly guid: GuidGenerator,
    commandFactory?: WorkOrderCommandFactory,
    invoker?: WorkOrderInvoker,
  ) {
    this.commandFactory = commandFactory ?? new WorkOrderCommandFactory(this.repository);
    this.invoker = invoker ?? new WorkOrderInvoker();
  }

  async create(input: CreateWorkOrderInput, initialStatus: 'PENDIENTE' | 'ACEPTADA' = 'ACEPTADA', appointmentId?: string): Promise<WorkOrder> {
    const guideNumber = this.guid.generate().slice(0, 8).toUpperCase();
    return WorkOrder.fromRow(await this.repository.create(input, guideNumber, initialStatus, appointmentId));
  }

  async getById(id: string): Promise<WorkOrder> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Orden de servicio no encontrada');
    return WorkOrder.fromRow(row);
  }

  async findByAppointmentId(appointmentId: string): Promise<WorkOrder | null> {
    const row = await this.repository.findByAppointmentId(appointmentId);
    return row ? WorkOrder.fromRow(row) : null;
  }

  async list(options: {
    status?: OrderStatus;
    technicianId?: string;
    customerId?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page: number;
    pageSize: number;
    userTechnicianId?: string;
    userCustomerId?: string;
    userRole?: string;
  }): Promise<{ items: WorkOrder[]; total: number }> {
    // Obtener la estrategia de autorización para el rol del usuario
    const authFilter = AuthorizationFilterFactory.createFilter(options.userRole);
    
    // Aplicar el filtro sin conocer detalles específicos del rol
    authFilter.applyFilter(options);

    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(WorkOrder.fromRow), total };
  }

  async transitionStatus(id: string, to: OrderStatus, userId: string): Promise<WorkOrder> {
    const command = this.commandFactory.createTransitionStatusCommand(id, to, userId);
    return this.invoker.executeCommand(command);
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
    const command = this.commandFactory.createAddPhotoCommand(id, storagePath, kind);
    await this.invoker.executeCommand(command);
  }

  async registerExit(id: string, input: ExitRegisterInput): Promise<WorkOrder> {
    const command = this.commandFactory.createRegisterExitCommand(id, input);
    return this.invoker.executeCommand(command);
  }

  async assignTechnician(id: string, input: AssignTechnicianInput): Promise<WorkOrder> {
    const command = this.commandFactory.createAssignTechnicianCommand(id, input);
    return this.invoker.executeCommand(command);
  }

  /**
   * PATRÓN COMMAND: Deshace la última acción reversible (ej. transición de estado).
   */
  async undoLastAction(): Promise<WorkOrder | null> {
    return this.invoker.undoLastCommand();
  }

  /**
   * PATRÓN COMMAND: Obtiene el historial de comandos ejecutados en memoria.
   */
  getCommandHistory(): Array<{ description: string; executedAt: Date }> {
    return this.invoker.getHistory();
  }

  /**
   * PATRÓN PROTOTYPE: Duplica una orden existente.
   * Útil para:
   * - Órdenes de garantía (mismo dispositivo regresa)
   * - Dispositivos recurrentes (cliente frecuente con mismo equipo)
   * - Crear seguimiento de reparaciones anteriores
   * 
   * @param originalOrderId ID de la orden a duplicar
   * @param newProblemDescription Nueva descripción del problema (opcional)
   * @returns Nueva orden creada basada en la original
   */
  async duplicateOrder(originalOrderId: string, newProblemDescription?: string): Promise<WorkOrder> {
    // Obtener orden original
    const original = await this.getById(originalOrderId);
    
    // PATRÓN PROTOTYPE: Clonar la orden con nueva descripción si se proporciona
    const cloned = newProblemDescription 
      ? original.cloneWith({ problemDescription: newProblemDescription })
      : original.clone();
    
    // Persistir el clon como nueva orden
    return this.create(cloned.toCreateInput(), 'PENDIENTE');
  }
}
