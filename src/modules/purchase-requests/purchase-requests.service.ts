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
    if (rows.length === 0) {
      return { items: [], total };
    }

    const allItemRows = await this.repository.findItemsByPurchaseRequestIds(rows.map((r) => r.id));
    const itemsByPurchaseId = new Map<string, ReturnType<typeof mapPurchaseRequestItemRow>[]>();

    for (const itemRow of allItemRows) {
      const list = itemsByPurchaseId.get(itemRow.purchase_request_id) ?? [];
      list.push(mapPurchaseRequestItemRow(itemRow));
      itemsByPurchaseId.set(itemRow.purchase_request_id, list);
    }

    const items = rows.map((row) =>
      mapPurchaseRequestRow(row, itemsByPurchaseId.get(row.id) ?? []),
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
    // Validación XOR ya realizada por Zod en schema
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

  async receive(id: string): Promise<PurchaseRequest> {
    // Verificar que existe
    await this.getById(id);
    
    // Marcar como recibida (actualiza stock y crea movimientos)
    const row = await this.repository.markAsReceived(id);
    const itemRows = await this.repository.findItemsById(id);
    return mapPurchaseRequestRow(row, itemRows.map(mapPurchaseRequestItemRow));
  }
}
