import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { IAppointmentRepository } from './appointments.repository';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
} from './appointments.types';

export class AppointmentService {
  constructor(private readonly repository: IAppointmentRepository) {}

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const overlap = await this.repository.hasOverlap(input.serviceId, input.date);
    if (overlap) {
      throw new ConflictError('Ya existe una cita cercana para ese servicio y horario');
    }
    return Appointment.fromRow(await this.repository.create(input));
  }

  async list(options: { from?: string; to?: string; status?: AppointmentStatus }): Promise<Appointment[]> {
    const rows = await this.repository.list(options);
    return rows.map(Appointment.fromRow);
  }

  async confirm(id: string): Promise<Appointment> {
    const appointment = await this.getById(id);
    appointment.confirm();
    return Appointment.fromRow(await this.repository.setStatus(id, 'confirmada'));
  }

  async cancel(id: string): Promise<Appointment> {
    await this.getById(id);
    return Appointment.fromRow(await this.repository.setStatus(id, 'cancelada'));
  }

  async cancelExpired(thresholdMinutes = 15): Promise<number> {
    return this.repository.cancelExpired(thresholdMinutes);
  }

  private async getById(id: string): Promise<Appointment> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Cita no encontrada');
    return Appointment.fromRow(row);
  }
}
