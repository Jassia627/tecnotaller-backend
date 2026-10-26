import { z } from 'zod';

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface AppointmentRow {
  id: string;
  service_id: string;
  customer_name: string;
  phone: string;
  date: string;
  status: AppointmentStatus;
  created_at: string;
  // Nuevos campos de dispositivo (opcionales)
  device_brand: string | null;
  device_model: string | null;
  problem_description: string | null;
  // Campos de servicio completado en el momento
  completed_services: string | null;
  completed_notes: string | null;
  completed_at: string | null;
}

export class Appointment {
  private constructor(
    readonly id: string,
    readonly serviceId: string,
    readonly customerName: string,
    readonly phone: string,
    readonly date: Date,
    private _status: AppointmentStatus,
    readonly createdAt: Date,
    // Nuevos campos de dispositivo
    readonly deviceBrand: string | null,
    readonly deviceModel: string | null,
    readonly problemDescription: string | null,
    // Campos de servicio completado
    readonly completedServices: string | null,
    readonly completedNotes: string | null,
    readonly completedAt: Date | null,
  ) {}

  static fromRow(row: AppointmentRow): Appointment {
    return new Appointment(
      row.id,
      row.service_id,
      row.customer_name,
      row.phone,
      new Date(row.date),
      row.status,
      new Date(row.created_at),
      row.device_brand,
      row.device_model,
      row.problem_description,
      row.completed_services,
      row.completed_notes,
      row.completed_at ? new Date(row.completed_at) : null,
    );
  }

  get status(): AppointmentStatus {
    return this._status;
  }

  confirm(): void {
    if (this._status === 'cancelada') throw new Error('No se puede confirmar una cita cancelada');
    this._status = 'confirmada';
  }

  cancel(): void {
    this._status = 'cancelada';
  }

  complete(): void {
    if (this._status !== 'confirmada') throw new Error('Solo se puede completar una cita confirmada');
    this._status = 'completada';
  }

  /** Verifica si la cita tiene datos suficientes para crear una orden de servicio */
  hasDeviceData(): boolean {
    return !!(this.deviceBrand && this.deviceModel && this.problemDescription);
  }

  toJSON() {
    return {
      id: this.id,
      serviceId: this.serviceId,
      customerName: this.customerName,
      phone: this.phone,
      date: this.date.toISOString(),
      status: this._status,
      createdAt: this.createdAt.toISOString(),
      deviceBrand: this.deviceBrand,
      deviceModel: this.deviceModel,
      problemDescription: this.problemDescription,
      completedServices: this.completedServices,
      completedNotes: this.completedNotes,
      completedAt: this.completedAt?.toISOString() ?? null,
    };
  }
}

const normalizeDate = (val: unknown): unknown => {
  if (typeof val !== 'string') return val;

  const str = val.trim();

  // Si viene en formato DD-MM-YYYY o DD/MM/YYYY (ej: "05-06-2027")
  const parts = str.split(/[-/]/);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2] && parts[2].length === 4) {
    const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const d = new Date(formatted);
    if (d instanceof Date && !isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // Si se puede parsear directamente como fecha válida (ej: "2027-06-05" o ISO datetime)
  const d = new Date(str);
  if (d instanceof Date && !isNaN(d.getTime())) {
    return d.toISOString();
  }

  return val;
};

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  date: z.preprocess(normalizeDate, z.string().datetime()),
  // Campos opcionales de dispositivo (para citas que requieren ingreso al taller)
  deviceBrand: z.string().min(1).optional(),
  deviceModel: z.string().min(1).optional(),
  problemDescription: z.string().min(1).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// Schema para completar una cita (servicio realizado en el momento)
export const completeAppointmentSchema = z.object({
  completedServices: z.string().min(1, 'Debe especificar los servicios realizados'),
  completedNotes: z.string().optional(),
});

export type CompleteAppointmentInput = z.infer<typeof completeAppointmentSchema>;

// Schema para convertir cita a orden (opcional: permite agregar datos faltantes)
export const convertToOrderSchema = z.object({
  deviceBrand: z.string().min(1).optional(),
  deviceModel: z.string().min(1).optional(),
  deviceSerial: z.string().min(1, 'El serial del dispositivo es obligatorio'),
  problemDescription: z.string().min(1).optional(),
  technicianId: z.string().uuid().nullable().optional(),
  devicePassword: z.string().optional(),
  accessories: z.string().optional(),
});

export type ConvertToOrderInput = z.infer<typeof convertToOrderSchema>;
