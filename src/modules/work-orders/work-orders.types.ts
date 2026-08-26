import { z } from 'zod';

export const ORDER_STATUSES = [
  'INGRESADO',
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
  INGRESADO: ['EN_REVISION'],
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
  current_status: OrderStatus;
  created_at: string;
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

export class WorkOrder {
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
    private _currentStatus: OrderStatus,
    readonly createdAt: string,
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
      row.current_status,
      row.created_at,
    );
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
      currentStatus: this._currentStatus,
      createdAt: this.createdAt,
    };
  }
}

export const createWorkOrderSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  deviceBrand: z.string().min(1),
  deviceModel: z.string().min(1),
  deviceSerial: z.string().min(1),
  problemDescription: z.string().min(1),
  devicePassword: z.string().optional(),
  accessories: z.string().optional(),
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
