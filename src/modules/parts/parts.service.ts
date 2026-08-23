import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { IPartRepository } from './parts.repository';
import { AssignPartInput, CreatePartInput, Part, UpdatePartInput } from './parts.types';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';

export class PartService {
  constructor(
    private readonly repository: IPartRepository,
    private readonly workOrderRepository: IWorkOrderRepository,
  ) {}

  async list(options: { page: number; pageSize: number }): Promise<{ items: Part[]; total: number }> {
    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(Part.fromRow), total };
  }

  async getById(id: string): Promise<Part> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Repuesto no encontrado');
    return Part.fromRow(row);
  }

  async create(input: CreatePartInput): Promise<Part> {
    return Part.fromRow(await this.repository.create(input));
  }

  async update(id: string, input: UpdatePartInput): Promise<Part> {
    await this.getById(id);
    return Part.fromRow(await this.repository.update(id, input));
  }

  async assignToWorkOrder(workOrderId: string, input: AssignPartInput): Promise<Part> {
    const order = await this.workOrderRepository.findById(workOrderId);
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    const part = await this.getById(input.partId);
    part.discount(input.quantity);

    try {
      return Part.fromRow(await this.repository.assignToWorkOrder(workOrderId, input.partId, input.quantity));
    } catch (err) {
      throw new BadRequestError('No se pudo asociar el repuesto (stock insuficiente)', err);
    }
  }
}
