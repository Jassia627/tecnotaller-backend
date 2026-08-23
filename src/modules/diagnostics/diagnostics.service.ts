import { NotFoundError } from '../../shared/errors/app-error';
import { IDiagnosticRepository } from './diagnostics.repository';
import { CreateDiagnosticInput, Diagnostic, DiagnosticRow } from './diagnostics.types';
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
      createdAt: row.created_at,
    };
  }

  async listByWorkOrder(workOrderId: string): Promise<Diagnostic[]> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');
    const rows = await this.repository.listByWorkOrder(workOrderId);
    return rows.map((r) => this.mapRow(r));
  }

  async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<Diagnostic> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');
    const row = await this.repository.create(workOrderId, technicianId, input);
    return this.mapRow(row);
  }
}
