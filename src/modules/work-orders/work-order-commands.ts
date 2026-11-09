/**
 * PATRÓN COMMAND - Órdenes de Servicio TecnoTaller
 * 
 * Este archivo implementa el patrón Command para encapsular las operaciones
 * sobre órdenes de servicio como objetos independientes.
 * 
 * Beneficios:
 * - Desacoplamiento entre quien solicita la operación y quien la ejecuta
 * - Permite implementar undo/redo, colas de comandos, logging
 * - Facilita agregar nuevas operaciones sin modificar código existente (OCP)
 * - Cada comando puede validarse y ejecutarse de forma independiente
 */

import { IWorkOrderRepository } from './work-orders.repository';
import { 
  OrderStatus, 
  WorkOrder, 
  ExitRegisterInput, 
  AssignTechnicianInput,
  STATUS_TRANSITIONS 
} from './work-orders.types';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';

// ============================================================================
// INTERFAZ COMMAND
// ============================================================================

/**
 * Interfaz base para todos los comandos de órdenes de servicio.
 * Define el contrato que todos los comandos concretos deben cumplir.
 */
export interface IWorkOrderCommand {
  /**
   * Ejecuta el comando y retorna la orden modificada.
   */
  execute(): Promise<WorkOrder>;
  
  /**
   * Descripción del comando para logging/auditoría.
   */
  getDescription(): string;
}

/**
 * Interfaz para comandos que soportan deshacer (undo).
 * Extiende IWorkOrderCommand con capacidad de reversión.
 */
export interface IUndoableCommand extends IWorkOrderCommand {
  /**
   * Deshace la operación realizada por execute().
   */
  undo(): Promise<WorkOrder>;
  
  /**
   * Indica si el comando puede deshacerse en el estado actual.
   */
  canUndo(): boolean;
}

// ============================================================================
// COMANDOS CONCRETOS
// ============================================================================

/**
 * Comando para transicionar el estado de una orden de servicio.
 * Encapsula la lógica de validación de máquina de estados y persistencia.
 */
export class TransitionStatusCommand implements IUndoableCommand {
  private previousStatus: OrderStatus | null = null;
  private order: WorkOrder | null = null;

  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly orderId: string,
    private readonly toStatus: OrderStatus,
    private readonly userId: string
  ) {}

  async execute(): Promise<WorkOrder> {
    // Obtener orden actual
    const row = await this.repository.findById(this.orderId);
    if (!row) {
      throw new NotFoundError('Orden de servicio no encontrada');
    }
    
    this.order = WorkOrder.fromRow(row);
    this.previousStatus = this.order.currentStatus;

    // Validar transición usando la máquina de estados
    if (!this.order.canTransitionTo(this.toStatus)) {
      throw new ForbiddenError(
        `Transición de estado inválida: ${this.order.currentStatus} -> ${this.toStatus}`
      );
    }

    // Ejecutar transición
    const updatedRow = await this.repository.transitionStatus(
      this.orderId,
      this.order.currentStatus,
      this.toStatus,
      this.userId
    );

    return WorkOrder.fromRow(updatedRow);
  }

  async undo(): Promise<WorkOrder> {
    if (!this.canUndo()) {
      throw new ForbiddenError('No se puede deshacer esta transición de estado');
    }

    // Revertir al estado anterior
    const updatedRow = await this.repository.transitionStatus(
      this.orderId,
      this.toStatus,
      this.previousStatus!,
      this.userId
    );

    return WorkOrder.fromRow(updatedRow);
  }

  canUndo(): boolean {
    // Solo se puede deshacer si conocemos el estado anterior
    // y la transición inversa es válida
    if (!this.previousStatus) return false;
    
    // Verificar si existe transición inversa válida
    return STATUS_TRANSITIONS[this.toStatus]?.includes(this.previousStatus) || false;
  }

  getDescription(): string {
    return `Transición de estado: ${this.previousStatus || '?'} -> ${this.toStatus} (Orden: ${this.orderId})`;
  }
}

/**
 * Comando para asignar un técnico a una orden de servicio.
 * Valida que la orden no tenga ya un técnico asignado.
 */
export class AssignTechnicianCommand implements IUndoableCommand {
  private previousTechnicianId: string | null = null;
  private wasAssigned: boolean = false;

  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly orderId: string,
    private readonly input: AssignTechnicianInput
  ) {}

  async execute(): Promise<WorkOrder> {
    // Obtener orden actual
    const row = await this.repository.findById(this.orderId);
    if (!row) {
      throw new NotFoundError('Orden de servicio no encontrada');
    }

    const order = WorkOrder.fromRow(row);
    this.previousTechnicianId = order.technicianId;

    // Validar que no tenga técnico asignado
    if (order.technicianId !== null) {
      throw new ForbiddenError(
        'Esta orden de servicio ya tiene un técnico asignado. No se puede reasignar.'
      );
    }

    // Asignar técnico
    const updatedRow = await this.repository.assignTechnician(
      this.orderId,
      this.input.technicianId
    );

    this.wasAssigned = true;
    return WorkOrder.fromRow(updatedRow);
  }

  async undo(): Promise<WorkOrder> {
    if (!this.canUndo()) {
      throw new ForbiddenError('No se puede deshacer la asignación de técnico');
    }

    // Nota: En un sistema real, necesitaríamos un método para desasignar técnico
    // Por ahora, lanzamos error indicando que no es soportado
    throw new ForbiddenError('Desasignación de técnico no implementada');
  }

  canUndo(): boolean {
    // Solo se puede deshacer si se asignó y antes no había técnico
    return this.wasAssigned && this.previousTechnicianId === null;
  }

  getDescription(): string {
    return `Asignar técnico ${this.input.technicianId} a orden ${this.orderId}`;
  }
}

/**
 * Comando para registrar la salida/entrega de un dispositivo.
 * Valida que la orden esté en estado LISTO_PARA_ENTREGA.
 */
export class RegisterExitCommand implements IWorkOrderCommand {
  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly orderId: string,
    private readonly input: ExitRegisterInput
  ) {}

  async execute(): Promise<WorkOrder> {
    // Obtener orden actual
    const row = await this.repository.findById(this.orderId);
    if (!row) {
      throw new NotFoundError('Orden de servicio no encontrada');
    }

    const order = WorkOrder.fromRow(row);

    // Validar estado
    if (order.currentStatus !== 'LISTO_PARA_ENTREGA') {
      throw new ForbiddenError(
        `No se puede registrar salida. La orden debe estar en estado LISTO_PARA_ENTREGA, pero está en ${order.currentStatus}`
      );
    }

    // Registrar salida
    const updatedRow = await this.repository.registerExit(this.orderId, {
      finalState: this.input.finalState,
      repairsPerformed: this.input.repairsPerformed,
      partsUsed: this.input.partsUsed,
      observations: this.input.observations,
    });

    return WorkOrder.fromRow(updatedRow);
  }

  getDescription(): string {
    return `Registrar salida de orden ${this.orderId} - Estado final: ${this.input.finalState}`;
  }
}

/**
 * Comando para agregar una foto a una orden de servicio.
 */
export class AddPhotoCommand implements IWorkOrderCommand {
  constructor(
    private readonly repository: IWorkOrderRepository,
    private readonly orderId: string,
    private readonly storagePath: string,
    private readonly kind: 'inicial' | 'final'
  ) {}

  async execute(): Promise<WorkOrder> {
    // Verificar que la orden existe
    const row = await this.repository.findById(this.orderId);
    if (!row) {
      throw new NotFoundError('Orden de servicio no encontrada');
    }

    // Agregar foto
    await this.repository.addPhoto(this.orderId, this.storagePath, this.kind);

    // Retornar orden (sin cambios en datos principales)
    return WorkOrder.fromRow(row);
  }

  getDescription(): string {
    return `Agregar foto ${this.kind} a orden ${this.orderId}`;
  }
}

// ============================================================================
// INVOKER - EJECUTOR DE COMANDOS
// ============================================================================

/**
 * WorkOrderInvoker actúa como el "invocador" del patrón Command.
 * Mantiene un historial de comandos ejecutados para auditoría y potencial undo.
 */
export class WorkOrderInvoker {
  private commandHistory: Array<{
    command: IWorkOrderCommand;
    executedAt: Date;
    result: WorkOrder | null;
  }> = [];

  /**
   * Ejecuta un comando y lo registra en el historial.
   */
  async executeCommand(command: IWorkOrderCommand): Promise<WorkOrder> {
    console.log(`[Command] Ejecutando: ${command.getDescription()}`);
    
    const result = await command.execute();
    
    this.commandHistory.push({
      command,
      executedAt: new Date(),
      result,
    });

    console.log(`[Command] Completado: ${command.getDescription()}`);
    return result;
  }

  /**
   * Deshace el último comando si es posible.
   */
  async undoLastCommand(): Promise<WorkOrder | null> {
    const lastEntry = this.commandHistory.pop();
    if (!lastEntry) {
      console.log('[Command] No hay comandos para deshacer');
      return null;
    }

    const command = lastEntry.command;
    
    // Verificar si el comando soporta undo
    if (!this.isUndoable(command)) {
      console.log(`[Command] El comando no soporta undo: ${command.getDescription()}`);
      // Restaurar en el historial ya que no podemos deshacerlo
      this.commandHistory.push(lastEntry);
      throw new ForbiddenError('Este comando no puede deshacerse');
    }

    if (!command.canUndo()) {
      console.log(`[Command] No se puede deshacer en el estado actual: ${command.getDescription()}`);
      this.commandHistory.push(lastEntry);
      throw new ForbiddenError('No se puede deshacer este comando en el estado actual');
    }

    console.log(`[Command] Deshaciendo: ${command.getDescription()}`);
    return await command.undo();
  }

  /**
   * Retorna el historial de comandos ejecutados.
   */
  getHistory(): Array<{ description: string; executedAt: Date }> {
    return this.commandHistory.map(entry => ({
      description: entry.command.getDescription(),
      executedAt: entry.executedAt,
    }));
  }

  /**
   * Limpia el historial de comandos.
   */
  clearHistory(): void {
    this.commandHistory = [];
  }

  /**
   * Type guard para verificar si un comando es undoable.
   */
  private isUndoable(command: IWorkOrderCommand): command is IUndoableCommand {
    return 'undo' in command && 'canUndo' in command;
  }
}

// ============================================================================
// FACTORY DE COMANDOS (Opcional - para simplificar creación)
// ============================================================================

/**
 * Factory para crear comandos de órdenes de servicio.
 * Centraliza la creación de comandos y sus dependencias.
 */
export class WorkOrderCommandFactory {
  constructor(private readonly repository: IWorkOrderRepository) {}

  createTransitionStatusCommand(
    orderId: string,
    toStatus: OrderStatus,
    userId: string
  ): TransitionStatusCommand {
    return new TransitionStatusCommand(this.repository, orderId, toStatus, userId);
  }

  createAssignTechnicianCommand(
    orderId: string,
    input: AssignTechnicianInput
  ): AssignTechnicianCommand {
    return new AssignTechnicianCommand(this.repository, orderId, input);
  }

  createRegisterExitCommand(
    orderId: string,
    input: ExitRegisterInput
  ): RegisterExitCommand {
    return new RegisterExitCommand(this.repository, orderId, input);
  }

  createAddPhotoCommand(
    orderId: string,
    storagePath: string,
    kind: 'inicial' | 'final'
  ): AddPhotoCommand {
    return new AddPhotoCommand(this.repository, orderId, storagePath, kind);
  }
}
