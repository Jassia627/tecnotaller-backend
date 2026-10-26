import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { IAppointmentRepository } from './appointments.repository';
import { ICustomerRepository } from '../customers/customers.repository';
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
    private readonly customerRepository?: ICustomerRepository,
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
   * 
   * Búsqueda de cliente:
   * 1. Si se proporciona customerId en el input, se usa ese
   * 2. Si no, se busca un cliente registrado por teléfono normalizado
   * 3. Si no se encuentra, la orden queda sin cliente asignado
   */
  async convertToOrder(id: string, input: ConvertToOrderInput): Promise<{ appointment: Appointment; workOrder: WorkOrder; customerFound: boolean }> {
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
      return { appointment, workOrder: existingOrder, customerFound: existingOrder.customerId !== null };
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
    const deviceSerial = input.deviceSerial || `PENDIENTE-${Date.now()}`;

    // Determinar customerId:
    // 1. Si viene en el input, usarlo
    // 2. Si no, buscar por teléfono normalizado
    let customerId: string | null = input.customerId ?? null;
    let customerFound = customerId !== null;

    if (!customerId && this.customerRepository && appointment.phone) {
      const customer = await this.customerRepository.findByPhone(appointment.phone);
      if (customer) {
        customerId = customer.id;
        customerFound = true;
      }
    }

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

    return { appointment, workOrder, customerFound };
  }
}
