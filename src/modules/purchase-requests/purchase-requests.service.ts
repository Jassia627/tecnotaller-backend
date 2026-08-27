import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { IPurchaseRequestRepository } from './purchase-requests.repository';
import {
  CreatePurchaseRequestInput,
  UpdatePurchaseRequestStatusInput,
  PurchaseRequest,
  mapPurchaseRequestRow,
  mapPurchaseRequestItemRow,
} from './purchase-requests.types';

export class PurchaseRequestService {
  constructor(private readonly repository: IPurchaseRequestRepository) {}

  async list(options: { page: number; pageSize: number }): Promise<{ items: PurchaseRequest[]; total: number }> {
    const { rows, total } = await this.repository.list(options);

    const items = await Promise.all(
      rows.map(async (row) => {
        const itemRows = await this.repository.findItemsById(row.id);
        return mapPurchaseRequestRow(row, itemRows.map(mapPurchaseRequestItemRow));
      }),
    );

    return { items, total };
  }

  async getById(id: string): Promise<PurchaseRequest> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Solicitud de compra no encontrada');

    const itemRows = await this.repository.findItemsById(id);
    return mapPurchaseRequestRow(row, itemRows.map(mapPurchaseRequestItemRow));
  }

  async create(input: CreatePurchaseRequestInput, userId: string): Promise<PurchaseRequest> {
    // Validar que al menos un producto o repuesto esté presente en cada item
    for (const item of input.items) {
      if (!item.productId && !item.partId) {
        throw new BadRequestError('Cada item debe tener un productId o partId');
      }
    }

    const row = await this.repository.create(input, userId);
    const itemRows = await this.repository.findItemsById(row.id);
    return mapPurchaseRequestRow(row, itemRows.map(mapPurchaseRequestItemRow));
  }

  async updateStatus(id: string, input: UpdatePurchaseRequestStatusInput): Promise<PurchaseRequest> {
    await this.getById(id);
    const row = await this.repository.updateStatus(id, input);
    const itemRows = await this.repository.findItemsById(id);
    return mapPurchaseRequestRow(row, itemRows.map(mapPurchaseRequestItemRow));
  }
}
