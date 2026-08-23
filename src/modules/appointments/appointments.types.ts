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
}

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  customerName: z.string().min(1),
  phone: z.string().min(1),
  date: z.string().datetime(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
