import { supabase } from '../../config/supabase';
import {
  PurchaseRequestRow,
  PurchaseRequestItemRow,
  CreatePurchaseRequestInput,
  UpdatePurchaseRequestStatusInput,
  CreatePurchaseRequestItemInput,
} from './purchase-requests.types';

export interface IPurchaseRequestRepository {
  list(options: { page: number; pageSize: number }): Promise<{ rows: PurchaseRequestRow[]; total: number }>;
  findById(id: string): Promise<PurchaseRequestRow | null>;
  findItemsById(purchaseRequestId: string): Promise<PurchaseRequestItemRow[]>;
  create(input: CreatePurchaseRequestInput, userId: string): Promise<PurchaseRequestRow>;
  updateStatus(id: string, input: UpdatePurchaseRequestStatusInput): Promise<PurchaseRequestRow>;
}

export class PurchaseRequestRepository implements IPurchaseRequestRepository {
  async list(options: { page: number; pageSize: number }): Promise<{ rows: PurchaseRequestRow[]; total: number }> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    const { data, count, error } = await supabase
      .from('purchase_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as PurchaseRequestRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<PurchaseRequestRow | null> {
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PurchaseRequestRow;
  }

  async findItemsById(purchaseRequestId: string): Promise<PurchaseRequestItemRow[]> {
    const { data, error } = await supabase
      .from('purchase_request_items')
      .select('*')
      .eq('purchase_request_id', purchaseRequestId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as PurchaseRequestItemRow[]) ?? [];
  }

  async create(input: CreatePurchaseRequestInput, userId: string): Promise<PurchaseRequestRow> {
    // Crear la solicitud de compra
    const { data: purchaseRequest, error: prError } = await supabase
      .from('purchase_requests')
      .insert({
        status: 'PENDIENTE',
        total_items: input.items.length,
        notes: input.notes ?? null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (prError) throw prError;

    // Crear los items
    const itemsToInsert = input.items.map((item) => ({
      purchase_request_id: purchaseRequest.id,
      product_id: item.productId ?? null,
      part_id: item.partId ?? null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { error: itemsError } = await supabase.from('purchase_request_items').insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return purchaseRequest as PurchaseRequestRow;
  }

  async updateStatus(id: string, input: UpdatePurchaseRequestStatusInput): Promise<PurchaseRequestRow> {
    const { data, error } = await supabase
      .from('purchase_requests')
      .update({ status: input.status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as PurchaseRequestRow;
  }
}
