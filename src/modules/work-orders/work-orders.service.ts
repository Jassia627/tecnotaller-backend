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
import { 
  WorkOrderStateManager, 
  WorkOrderStateFactory,
  IWorkOrderContext 
} from './work-order-states';
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

  /**
   * PATRÓN STATE: Crea el contexto para el StateManager a partir de una orden
   */
  private createStateContext(order: WorkOrder): IWorkOrderContext {
    return {
      orderId: order.id,
      guideNumber: order.guideNumber,
      technicianId: order.technicianId,
      customerId: order.customerId,
      deviceBrand: order.deviceBrand,
      deviceModel: order.deviceModel,
    };
  }

  /**
   * PATRÓN STATE: Crea un StateManager para una orden existente
   */
  private createStateManager(order: WorkOrder): WorkOrderStateManager {
    return new WorkOrderStateManager(
      order.currentStatus,
      this.createStateContext(order)
    );
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
    const authFilter = AuthorizationFilterFactory.createFilter(options.userRole);
    authFilter.applyFilter(options);

    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(WorkOrder.fromRow), total };
  }

  /**
   * PATRÓN STATE + COMMAND: Transición de estado usando StateManager para validación
   * y Command para ejecución con historial.
   */
  async transitionStatus(id: string, to: OrderStatus, userId: string): Promise<WorkOrder> {
    const order = await this.getById(id);
    const stateManager = this.createStateManager(order);
    const currentState = stateManager.getCurrentState();
    
    if (!stateManager.canTransitionTo(to)) {
      const allowedTransitions = stateManager.getAvailableTransitions();
      throw new ForbiddenError(
        `Transición de estado inválida: ${currentState.getName()} -> ${to}. ` +
        `Transiciones permitidas desde ${currentState.getName()}: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'ninguna (estado terminal)'}`
      );
    }

    const targetState = WorkOrderStateFactory.getState(to);
    if (targetState.requiresTechnician() && !order.technicianId) {
      throw new ForbiddenError(
        `El estado ${to} requiere que la orden tenga un técnico asignado`
      );
    }

    stateManager.transitionTo(to);
    
    const command = this.commandFactory.createTransitionStatusCommand(id, to, userId);
    return this.invoker.executeCommand(command);
  }

  /**
   * PATRÓN STATE: Obtiene las transiciones disponibles para una orden
   */
  async getAvailableTransitions(id: string): Promise<{ 
    currentStatus: OrderStatus; 
    availableTransitions: OrderStatus[];
    stateDescription: string;
    isTerminal: boolean;
    requiresTechnician: boolean;
  }> {
    const order = await this.getById(id);
    const stateManager = this.createStateManager(order);
    const currentState = stateManager.getCurrentState();

    return {
      currentStatus: currentState.getName(),
      availableTransitions: stateManager.getAvailableTransitions(),
      stateDescription: currentState.getDescription(),
      isTerminal: currentState.isTerminal(),
      requiresTechnician: currentState.requiresTechnician(),
    };
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
    const order = await this.getById(id);
    const stateManager = this.createStateManager(order);
    const currentState = stateManager.getCurrentState();
    
    if (currentState.getName() !== 'LISTO_PARA_ENTREGA') {
      throw new ForbiddenError(
        `No se puede registrar salida. La orden debe estar en estado LISTO_PARA_ENTREGA, ` +
        `pero está en ${currentState.getName()} (${currentState.getDescription()})`
      );
    }

    const command = this.commandFactory.createRegisterExitCommand(id, input);
    return this.invoker.executeCommand(command);
  }

  async assignTechnician(id: string, input: AssignTechnicianInput): Promise<WorkOrder> {
    const order = await this.getById(id);
    const stateManager = this.createStateManager(order);
    const currentState = stateManager.getCurrentState();
    
    if (order.technicianId !== null) {
      throw new ForbiddenError(
        'Esta orden de servicio ya tiene un técnico asignado. No se puede reasignar.'
      );
    }

    if (currentState.isTerminal()) {
      throw new ForbiddenError(
        `No se puede asignar técnico a una orden en estado terminal (${currentState.getName()})`
      );
    }

    const command = this.commandFactory.createAssignTechnicianCommand(id, input);
    return this.invoker.executeCommand(command);
  }

  async undoLastAction(): Promise<WorkOrder | null> {
    return this.invoker.undoLastCommand();
  }

  getCommandHistory(): Array<{ description: string; executedAt: Date }> {
    return this.invoker.getHistory();
  }

  async duplicateOrder(originalOrderId: string, newProblemDescription?: string): Promise<WorkOrder> {
    const original = await this.getById(originalOrderId);
    
    const cloned = newProblemDescription 
      ? original.cloneWith({ problemDescription: newProblemDescription })
      : original.clone();
    
    return this.create(cloned.toCreateInput(), 'PENDIENTE');
  }
}
