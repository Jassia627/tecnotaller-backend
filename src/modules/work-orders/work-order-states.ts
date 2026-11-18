/**
 * PATRÓN STATE - Estados de Órdenes de Servicio TecnoTaller
 * 
 * Este archivo implementa el patrón State para manejar los diferentes
 * estados de una orden de servicio y sus transiciones válidas.
 * 
 * ANTES: Se usaba un diccionario STATUS_TRANSITIONS y métodos con
 * condicionales para validar transiciones.
 * 
 * DESPUÉS: Cada estado es una clase que conoce sus transiciones válidas
 * y puede ejecutar lógica específica al entrar/salir del estado.
 * 
 * Beneficios:
 * - Cada estado encapsula su propio comportamiento
 * - Fácil agregar nuevos estados sin modificar código existente (OCP)
 * - Lógica de transición clara y localizada en cada estado
 * - Posibilidad de ejecutar acciones al entrar/salir de estados
 */

import { OrderStatus } from './work-orders.types';

// ============================================================================
// INTERFAZ STATE
// ============================================================================

/**
 * Interfaz que define el contrato para todos los estados de una orden.
 * Cada estado concreto implementa esta interfaz.
 */
export interface IWorkOrderState {
  /**
   * Nombre del estado (para serialización y logging)
   */
  getName(): OrderStatus;

  /**
   * Descripción legible del estado
   */
  getDescription(): string;

  /**
   * Lista de estados a los que se puede transicionar desde este estado
   */
  getAllowedTransitions(): OrderStatus[];

  /**
   * Verifica si se puede transicionar a un estado específico
   */
  canTransitionTo(nextState: OrderStatus): boolean;

  /**
   * Lógica a ejecutar al entrar en este estado
   */
  onEnter(context: IWorkOrderContext): void;

  /**
   * Lógica a ejecutar al salir de este estado
   */
  onExit(context: IWorkOrderContext): void;

  /**
   * Indica si es un estado terminal (no permite más transiciones)
   */
  isTerminal(): boolean;

  /**
   * Indica si requiere técnico asignado para operar en este estado
   */
  requiresTechnician(): boolean;
}

/**
 * Contexto que se pasa a los estados para acceder a información de la orden
 */
export interface IWorkOrderContext {
  orderId: string;
  guideNumber: string;
  technicianId: string | null;
  customerId: string | null;
  deviceBrand: string;
  deviceModel: string;
}

// ============================================================================
// CLASE BASE ABSTRACTA PARA ESTADOS
// ============================================================================

/**
 * Clase base abstracta que proporciona implementación común para los estados.
 * Los estados concretos extienden esta clase.
 */
abstract class BaseWorkOrderState implements IWorkOrderState {
  abstract getName(): OrderStatus;
  abstract getDescription(): string;
  abstract getAllowedTransitions(): OrderStatus[];

  canTransitionTo(nextState: OrderStatus): boolean {
    return this.getAllowedTransitions().includes(nextState);
  }

  onEnter(context: IWorkOrderContext): void {
    console.log(`[State] Orden ${context.guideNumber} entró a estado: ${this.getName()}`);
  }

  onExit(context: IWorkOrderContext): void {
    console.log(`[State] Orden ${context.guideNumber} salió de estado: ${this.getName()}`);
  }

  isTerminal(): boolean {
    return this.getAllowedTransitions().length === 0;
  }

  requiresTechnician(): boolean {
    return false;
  }
}

// ============================================================================
// ESTADOS CONCRETOS
// ============================================================================

/**
 * Estado PENDIENTE: Orden recién creada, esperando aceptación
 */
export class PendienteState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'PENDIENTE';
  }

  getDescription(): string {
    return 'Orden pendiente de aceptación';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['ACEPTADA'];
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    // Aquí se podría enviar notificación al admin
    console.log(`[State] Nueva orden creada: ${context.deviceBrand} ${context.deviceModel}`);
  }
}

/**
 * Estado ACEPTADA: Orden aceptada, lista para revisión
 */
export class AceptadaState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'ACEPTADA';
  }

  getDescription(): string {
    return 'Orden aceptada, pendiente de asignación a técnico';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['EN_REVISION'];
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    // Se podría notificar al cliente que su orden fue aceptada
    console.log(`[State] Orden ${context.guideNumber} aceptada para procesamiento`);
  }
}

/**
 * Estado EN_REVISION: Técnico revisando el dispositivo
 */
export class EnRevisionState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'EN_REVISION';
  }

  getDescription(): string {
    return 'Dispositivo en revisión por técnico';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['ESPERANDO_REPUESTO', 'EN_REPARACION'];
  }

  requiresTechnician(): boolean {
    return true;
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    if (!context.technicianId) {
      console.warn(`[State] ⚠️ Orden ${context.guideNumber} en revisión sin técnico asignado`);
    }
  }
}

/**
 * Estado ESPERANDO_REPUESTO: Reparación pausada esperando piezas
 */
export class EsperandoRepuestoState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'ESPERANDO_REPUESTO';
  }

  getDescription(): string {
    return 'Esperando llegada de repuestos';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['EN_REPARACION'];
  }

  requiresTechnician(): boolean {
    return true;
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    // Aquí se podría disparar una solicitud de compra de repuestos
    console.log(`[State] Orden ${context.guideNumber} en espera de repuestos`);
  }
}

/**
 * Estado EN_REPARACION: Técnico reparando el dispositivo
 */
export class EnReparacionState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'EN_REPARACION';
  }

  getDescription(): string {
    return 'Dispositivo en proceso de reparación';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['REPARADO'];
  }

  requiresTechnician(): boolean {
    return true;
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    console.log(`[State] Iniciando reparación de orden ${context.guideNumber}`);
  }
}

/**
 * Estado REPARADO: Reparación completada, pendiente de control de calidad
 */
export class ReparadoState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'REPARADO';
  }

  getDescription(): string {
    return 'Reparación completada, pendiente de entrega';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['LISTO_PARA_ENTREGA'];
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    // Aquí se podría notificar que la reparación está lista
    console.log(`[State] Reparación completada para orden ${context.guideNumber}`);
  }
}

/**
 * Estado LISTO_PARA_ENTREGA: Dispositivo listo para ser recogido
 */
export class ListoParaEntregaState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'LISTO_PARA_ENTREGA';
  }

  getDescription(): string {
    return 'Dispositivo listo para entrega al cliente';
  }

  getAllowedTransitions(): OrderStatus[] {
    return ['ENTREGADO'];
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    // Aquí se notifica al cliente que puede recoger su dispositivo
    console.log(`[State] Orden ${context.guideNumber} lista para entrega - Notificar cliente`);
  }
}

/**
 * Estado ENTREGADO: Orden finalizada, dispositivo entregado
 */
export class EntregadoState extends BaseWorkOrderState {
  getName(): OrderStatus {
    return 'ENTREGADO';
  }

  getDescription(): string {
    return 'Dispositivo entregado al cliente - Orden cerrada';
  }

  getAllowedTransitions(): OrderStatus[] {
    return []; // Estado terminal
  }

  isTerminal(): boolean {
    return true;
  }

  onEnter(context: IWorkOrderContext): void {
    super.onEnter(context);
    console.log(`[State] ✅ Orden ${context.guideNumber} completada - Dispositivo entregado`);
  }

  onExit(context: IWorkOrderContext): void {
    // No debería salir de este estado
    console.error(`[State] ❌ Intento de salir del estado terminal ENTREGADO`);
  }
}

// ============================================================================
// FACTORY DE ESTADOS
// ============================================================================

/**
 * Factory que crea instancias de estados según el nombre.
 * Implementa el patrón Factory Method para la creación de estados.
 */
export class WorkOrderStateFactory {
  private static stateInstances: Map<OrderStatus, IWorkOrderState> = new Map();

  /**
   * Obtiene una instancia del estado correspondiente.
   * Usa Singleton por estado para optimizar memoria.
   */
  static getState(status: OrderStatus): IWorkOrderState {
    if (!this.stateInstances.has(status)) {
      this.stateInstances.set(status, this.createState(status));
    }
    return this.stateInstances.get(status)!;
  }

  private static createState(status: OrderStatus): IWorkOrderState {
    switch (status) {
      case 'PENDIENTE':
        return new PendienteState();
      case 'ACEPTADA':
        return new AceptadaState();
      case 'EN_REVISION':
        return new EnRevisionState();
      case 'ESPERANDO_REPUESTO':
        return new EsperandoRepuestoState();
      case 'EN_REPARACION':
        return new EnReparacionState();
      case 'REPARADO':
        return new ReparadoState();
      case 'LISTO_PARA_ENTREGA':
        return new ListoParaEntregaState();
      case 'ENTREGADO':
        return new EntregadoState();
      default:
        throw new Error(`Estado desconocido: ${status}`);
    }
  }

  /**
   * Obtiene todos los estados disponibles
   */
  static getAllStates(): IWorkOrderState[] {
    const allStatuses: OrderStatus[] = [
      'PENDIENTE', 'ACEPTADA', 'EN_REVISION', 'ESPERANDO_REPUESTO',
      'EN_REPARACION', 'REPARADO', 'LISTO_PARA_ENTREGA', 'ENTREGADO'
    ];
    return allStatuses.map(status => this.getState(status));
  }
}

// ============================================================================
// GESTOR DE ESTADOS (STATE MANAGER)
// ============================================================================

/**
 * Clase que gestiona las transiciones de estado de una orden.
 * Actúa como el "Context" del patrón State.
 */
export class WorkOrderStateManager {
  private currentState: IWorkOrderState;
  private context: IWorkOrderContext;
  private stateHistory: Array<{ from: OrderStatus; to: OrderStatus; timestamp: Date }> = [];

  constructor(initialStatus: OrderStatus, context: IWorkOrderContext) {
    this.currentState = WorkOrderStateFactory.getState(initialStatus);
    this.context = context;
  }

  /**
   * Obtiene el estado actual
   */
  getCurrentState(): IWorkOrderState {
    return this.currentState;
  }

  /**
   * Obtiene el nombre del estado actual
   */
  getCurrentStatus(): OrderStatus {
    return this.currentState.getName();
  }

  /**
   * Verifica si se puede transicionar a un estado específico
   */
  canTransitionTo(nextStatus: OrderStatus): boolean {
    return this.currentState.canTransitionTo(nextStatus);
  }

  /**
   * Obtiene las transiciones válidas desde el estado actual
   */
  getAvailableTransitions(): OrderStatus[] {
    return this.currentState.getAllowedTransitions();
  }

  /**
   * Realiza la transición a un nuevo estado
   */
  transitionTo(nextStatus: OrderStatus): void {
    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(
        `Transición inválida: ${this.currentState.getName()} -> ${nextStatus}. ` +
        `Transiciones permitidas: ${this.currentState.getAllowedTransitions().join(', ')}`
      );
    }

    const previousStatus = this.currentState.getName();
    
    // Ejecutar lógica de salida del estado actual
    this.currentState.onExit(this.context);
    
    // Cambiar al nuevo estado
    this.currentState = WorkOrderStateFactory.getState(nextStatus);
    
    // Registrar en historial
    this.stateHistory.push({
      from: previousStatus,
      to: nextStatus,
      timestamp: new Date(),
    });
    
    // Ejecutar lógica de entrada al nuevo estado
    this.currentState.onEnter(this.context);
  }

  /**
   * Obtiene el historial de transiciones
   */
  getTransitionHistory(): Array<{ from: OrderStatus; to: OrderStatus; timestamp: Date }> {
    return [...this.stateHistory];
  }

  /**
   * Verifica si la orden está en estado terminal
   */
  isCompleted(): boolean {
    return this.currentState.isTerminal();
  }

  /**
   * Verifica si el estado actual requiere técnico
   */
  requiresTechnician(): boolean {
    return this.currentState.requiresTechnician();
  }

  /**
   * Actualiza el contexto (cuando cambian datos de la orden)
   */
  updateContext(updates: Partial<IWorkOrderContext>): void {
    this.context = { ...this.context, ...updates };
  }
}
