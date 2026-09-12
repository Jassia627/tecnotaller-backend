import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { IDiagnosticRepository } from './diagnostics.repository';
import { CreateDiagnosticInput, Diagnostic, DiagnosticRow, UpdateDiagnosticInput } from './diagnostics.types';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';

export class DiagnosticService {
  constructor(
    private readonly repository: IDiagnosticRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  private mapRow(row: DiagnosticRow): Diagnostic {
    return {
      id: row.id,
      workOrderId: row.work_order_id,
      technicianId: row.technician_id,
      observations: row.observations,
      faults: row.faults,
      recommendedActions: row.recommended_actions,
      active: row.active ?? true,
      createdAt: row.created_at,
    };
  }

  async listByWorkOrder(workOrderId: string, userTechnicianId: string, userRole: string): Promise<Diagnostic[]> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    // Validar ownership: solo técnico asignado o admin pueden ver diagnósticos
    if (userRole === 'tecnico' && (order as any).technician_id !== userTechnicianId) {
      throw new ForbiddenError('No tienes permiso para ver diagnósticos de esta orden');
    }

    const rows = await this.repository.listByWorkOrder(workOrderId);
    return rows.map((r) => this.mapRow(r));
  }

  async getById(id: string, userTechnicianId: string, userRole: string): Promise<Diagnostic> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Diagnóstico no encontrado');

    const order = await this.workOrderRepository.findById(row.work_order_id);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    // Validar ownership
    if (userRole === 'tecnico' && (order as any).technician_id !== userTechnicianId) {
      throw new ForbiddenError('No tienes permiso para acceder a este diagnóstico');
    }

    return this.mapRow(row);
  }

  async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput, userTechnicianId: string, userRole: string): Promise<Diagnostic> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    // Validar ownership: solo técnico asignado o admin pueden crear diagnósticos
    if (userRole === 'tecnico' && (order as any).technician_id !== userTechnicianId) {
      throw new ForbiddenError('No tienes permiso para crear diagnósticos en esta orden');
    }

    const row = await this.repository.create(workOrderId, technicianId, input);
    return this.mapRow(row);
  }

  async update(id: string, input: UpdateDiagnosticInput, userTechnicianId: string, userRole: string): Promise<Diagnostic> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Diagnóstico no encontrado');

    const order = await this.workOrderRepository.findById(row.work_order_id);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    // Validar ownership
    if (userRole === 'tecnico' && (order as any).technician_id !== userTechnicianId) {
      throw new ForbiddenError('No tienes permiso para actualizar este diagnóstico');
    }

    const updated = await this.repository.update(id, input);
    return this.mapRow(updated);
  }

  async delete(id: string, userTechnicianId: string, userRole: string): Promise<Diagnostic> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Diagnóstico no encontrado');

    const order = await this.workOrderRepository.findById(row.work_order_id);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    // Validar ownership
    if (userRole === 'tecnico' && (order as any).technician_id !== userTechnicianId) {
      throw new ForbiddenError('No tienes permiso para eliminar este diagnóstico');
    }

    // Soft-delete: marcar como inactivo
    const deleted = await this.repository.setActive(id, false);
    return this.mapRow(deleted);
  }
}
