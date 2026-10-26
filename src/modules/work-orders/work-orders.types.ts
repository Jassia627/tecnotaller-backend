import { z } from 'zod';

/**
 * PATRÓN PROTOTYPE
 * Interfaz que define el contrato para objetos clonables.
 * Permite crear copias de objetos sin depender de sus clases concretas.
 */
export interface IPrototype<T> {
  clone(): T;
}

export const ORDER_STATUSES = [
  'PENDIENTE',
  'ACEPTADA',
  'EN_REVISION',
  'ESPERANDO_REPUESTO',
  'EN_REPARACION',
  'REPARADO',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Máquina de estados: transiciones válidas (OCP: se extiende sin tocar lógica existente)
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDIENTE: ['ACEPTADA'],
  ACEPTADA: ['EN_REVISION'],
  EN_REVISION: ['ESPERANDO_REPUESTO', 'EN_REPARACION'],
  ESPERANDO_REPUESTO: ['EN_REPARACION'],
  EN_REPARACION: ['REPARADO'],
  REPARADO: ['LISTO_PARA_ENTREGA'],
  LISTO_PARA_ENTREGA: ['ENTREGADO'],
  ENTREGADO: [],
};

export interface WorkOrderRow {
  id: string;
  guide_number: string;
  customer_id: string | null;
  technician_id: string | null;
  device_brand: string;
  device_model: string;
  device_serial: string;
  problem_description: string;
  device_password_encrypted: string | null;
  accessories: string | null;
  scheduled_time: string | null;
  assigned_time: string | null;
  current_status: OrderStatus;
  created_at: string;
  appointment_id: string | null;
}

export interface StatusHistoryRow {
  id: string;
  work_order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  user_id: string;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userId: string;
  createdAt: string;
}

export class WorkOrder implements IPrototype<WorkOrder> {
  private constructor(
    readonly id: string,
    readonly guideNumber: string,
    readonly customerId: string | null,
    readonly technicianId: string | null,
    readonly deviceBrand: string,
    readonly deviceModel: string,
    readonly deviceSerial: string,
    readonly problemDescription: string,
    readonly accessories: string | null,
    readonly scheduledTime: string | null,
    readonly assignedTime: string | null,
    private _currentStatus: OrderStatus,
    readonly createdAt: string,
    readonly appointmentId: string | null,
  ) {}

  static fromRow(row: WorkOrderRow): WorkOrder {
    return new WorkOrder(
      row.id,
      row.guide_number,
      row.customer_id,
      row.technician_id,
      row.device_brand,
      row.device_model,
      row.device_serial,
      row.problem_description,
      row.accessories,
      row.scheduled_time,
      row.assigned_time,
      row.current_status,
      row.created_at,
      row.appointment_id,
    );
  }

  /**
   * PATRÓN PROTOTYPE: Clona la orden de servicio.
   * Crea una copia con IDs vacíos (se generarán al persistir) pero mantiene
   * los datos del dispositivo y cliente.
   * 
   * Casos de uso:
   * - Órdenes de garantía (mismo dispositivo, nuevo problema)
   * - Dispositivos recurrentes (cliente trae el mismo equipo)
   * - Crear seguimientos de reparaciones anteriores
   */
  clone(): WorkOrder {
    return new WorkOrder(
      '',                          // ID vacío (se generará al persistir)
      '',                          // guideNumber vacío (se generará al persistir)
      this.customerId,             // Mismo cliente
      null,                        // Sin técnico asignado (se asignará después)
      this.deviceBrand,            // Misma marca
      this.deviceModel,            // Mismo modelo
      this.deviceSerial,           // Mismo serial
      this.problemDescription,     // Misma descripción (se puede modificar después)
      this.accessories,            // Mismos accesorios
      null,                        // Sin tiempo programado
      null,                        // Sin tiempo asignado
      'PENDIENTE',                 // Estado inicial para nueva orden
      new Date().toISOString(),    // Nueva fecha de creación
      null,                        // Sin cita asociada
    );
  }

  /**
   * PATRÓN PROTOTYPE (variante): Clona la orden con modificaciones específicas.
   * Permite crear variantes de la orden original sobrescribiendo campos específicos.
   */
  cloneWith(overrides: Partial<{
    problemDescription: string;
    accessories: string | null;
    customerId: string | null;
    technicianId: string | null;
  }>): WorkOrder {
    return new WorkOrder(
      '',
      '',
      overrides.customerId ?? this.customerId,
      overrides.technicianId ?? null,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      overrides.problemDescription ?? this.problemDescription,
      overrides.accessories ?? this.accessories,
      null,
      null,
      'PENDIENTE',
      new Date().toISOString(),
      null,
    );
  }

  /**
   * Convierte la orden (o su clon) a un input válido para crear una nueva orden en BD.
   * Útil después de clonar para persistir la nueva orden.
   */
  toCreateInput(): CreateWorkOrderInput {
    return {
      customerId: this.customerId,
      technicianId: this.technicianId,
      deviceBrand: this.deviceBrand,
      deviceModel: this.deviceModel,
      deviceSerial: this.deviceSerial,
      problemDescription: this.problemDescription,
      accessories: this.accessories ?? undefined,
      scheduledTime: this.scheduledTime,
    };
  }

  get currentStatus(): OrderStatus {
    return this._currentStatus;
  }

  canTransitionTo(next: OrderStatus): boolean {
    return STATUS_TRANSITIONS[this._currentStatus].includes(next);
  }

  transitionTo(next: OrderStatus): void {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Transición inválida: ${this._currentStatus} -> ${next}`);
    }
    this._currentStatus = next;
  }

  toJSON() {
    return {
      id: this.id,
      guideNumber: this.guideNumber,
      customerId: this.customerId,
      technicianId: this.technicianId,
      deviceBrand: this.deviceBrand,
      deviceModel: this.deviceModel,
      deviceSerial: this.deviceSerial,
      problemDescription: this.problemDescription,
      accessories: this.accessories,
      scheduledTime: this.scheduledTime,
      assignedTime: this.assignedTime,
      currentStatus: this._currentStatus,
      createdAt: this.createdAt,
      appointmentId: this.appointmentId,
    };
  }
}

const emptyToNullUuid = (v: unknown) => {
  if (v === '' || v === undefined || v === null) return null;
  if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())) {
    return null;
  }
  return typeof v === 'string' ? v.trim() : v;
};

export const createWorkOrderSchema = z.object({
  customerId: z.preprocess(emptyToNullUuid, z.string().uuid().nullable().optional()),
  technicianId: z.preprocess(emptyToNullUuid, z.string().uuid().nullable().optional()),
  deviceBrand: z.string().min(1),
  deviceModel: z.string().min(1),
  deviceSerial: z.string().min(1),
  problemDescription: z.string().min(1),
  devicePassword: z.string().optional(),
  accessories: z.string().optional(),
  scheduledTime: z.string().datetime().nullable().optional(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export const transitionStatusSchema = z.object({
  toStatus: z.enum(ORDER_STATUSES),
});

export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;

export const exitRegisterSchema = z.object({
  finalState: z.string().min(1),
  repairsPerformed: z.string().min(1),
  partsUsed: z.string().optional(),
  observations: z.string().optional(),
});

export type ExitRegisterInput = z.infer<typeof exitRegisterSchema>;

export const assignTechnicianSchema = z.object({
  technicianId: z.string().uuid('El ID del técnico debe ser un UUID válido'),
});

export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;

export const duplicateOrderSchema = z.object({
  problemDescription: z.string().min(1).optional(),
});

export type DuplicateOrderInput = z.infer<typeof duplicateOrderSchema>;
