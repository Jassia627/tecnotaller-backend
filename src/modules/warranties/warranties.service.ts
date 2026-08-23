import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { IWarrantyRepository } from './warranties.repository';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';
import { CreateWarrantyInput, Warranty, mapWarrantyRow } from './warranties.types';

export class WarrantyService {
  constructor(
    private readonly repository: IWarrantyRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async create(workOrderId: string, input: CreateWarrantyInput): Promise<Warranty> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    const existing = await this.repository.findByWorkOrder(workOrderId);
    if (existing && existing.status === 'vigente') {
      throw new ConflictError('La orden ya tiene una garantía vigente');
    }

    return mapWarrantyRow(await this.repository.create(workOrderId, input));
  }

  async getByWorkOrder(workOrderId: string): Promise<Warranty | null> {
    const row = await this.repository.findByWorkOrder(workOrderId);
    return row ? mapWarrantyRow(row) : null;
  }
}
