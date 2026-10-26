import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { IAppointmentRepository } from './appointments.repository';
import { WorkOrderService } from '../work-orders/work-orders.service';
import { WorkOrder } from '../work-orders/work-orders.types';
import {
  Appointment,
  AppointmentStatus,
  CompleteAppointmentInput,
  ConvertToOrderInput,
  CreateAppointmentInput,
} from './appointments.types';

export class AppointmentService {
  constructor(
    private readonly repository: IAppointmentRepository,
    private readonly workOrderService?: WorkOrderService,
  ) {}

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

  async getById(id: string): Promise<Appointment> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Cita no encontrada');
    return Appointment.fromRow(row);
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

  /**
   * Completa una cita cuando el servicio se realiza en el momento
   * (no requiere ingreso al taller)
   */
  async complete(id: string, input: CompleteAppointmentInput): Promise<Appointment> {
    const appointment = await this.getById(id);
    
    if (appointment.status !== 'confirmada') {
      throw new ForbiddenError('Solo se puede completar una cita confirmada');
    }

    return Appointment.fromRow(await this.repository.complete(id, input));
  }

  /**
   * Convierte una cita confirmada en una orden de servicio.
   * Es idempotente: si ya existe una orden para esta cita, la devuelve.
   */
  async convertToOrder(id: string, input: ConvertToOrderInput): Promise<{ appointment: Appointment; workOrder: WorkOrder }> {
    if (!this.workOrderService) {
      throw new Error('WorkOrderService no configurado en AppointmentService');
    }

    const appointment = await this.getById(id);

    if (appointment.status !== 'confirmada') {
      throw new ForbiddenError('Solo se puede convertir una cita confirmada en orden de servicio');
    }

    // Verificar idempotencia: si ya existe una orden para esta cita, devolverla
    const existingOrder = await this.workOrderService.findByAppointmentId(id);
    if (existingOrder) {
      return { appointment, workOrder: existingOrder };
    }

    // Combinar datos de la cita con los datos proporcionados
    const deviceBrand = input.deviceBrand || appointment.deviceBrand;
    const deviceModel = input.deviceModel || appointment.deviceModel;
    const problemDescription = input.problemDescription || appointment.problemDescription;

    if (!deviceBrand) {
      throw new ForbiddenError('Debe proporcionar la marca del dispositivo (deviceBrand)');
    }
    if (!deviceModel) {
      throw new ForbiddenError('Debe proporcionar el modelo del dispositivo (deviceModel)');
    }
    if (!problemDescription) {
      throw new ForbiddenError('Debe proporcionar la descripción del problema (problemDescription)');
    }

    // Serial: usar el proporcionado o generar uno provisional
    // El serial provisional indica claramente que está pendiente de recepción
    const deviceSerial = input.deviceSerial || `PENDIENTE-${Date.now()}`;

    // customerId: usar el proporcionado en el input (puede venir del frontend)
    const customerId = input.customerId ?? null;

    // Crear la orden de servicio
    const workOrder = await this.workOrderService.create(
      {
        deviceBrand,
        deviceModel,
        deviceSerial,
        problemDescription,
        technicianId: input.technicianId ?? null,
        devicePassword: input.devicePassword,
        accessories: input.accessories,
        customerId,
        scheduledTime: appointment.date.toISOString(),
      },
      'ACEPTADA',
      id, // appointmentId para idempotencia
    );

    return { appointment, workOrder };
  }
}
