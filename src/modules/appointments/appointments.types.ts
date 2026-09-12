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

  toJSON() {
    return {
      id: this.id,
      serviceId: this.serviceId,
      customerName: this.customerName,
      phone: this.phone,
      date: this.date.toISOString(),
      status: this._status,
      createdAt: this.createdAt.toISOString(),
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
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
