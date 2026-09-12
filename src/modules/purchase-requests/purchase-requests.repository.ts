import { supabase } from '../../config/supabase';
import {
  PurchaseRequestRow,
  PurchaseRequestItemRow,
  CreatePurchaseRequestInput,
  UpdatePurchaseRequestStatusInput,
  CreatePurchaseRequestItemInput,
  PURCHASE_STATUS_TRANSITIONS,
} from './purchase-requests.types';
import { BadRequestError } from '../../shared/errors/app-error';

export interface IPurchaseRequestRepository {
  list(options: { page: number; pageSize: number }): Promise<{ rows: PurchaseRequestRow[]; total: number }>;
  findById(id: string): Promise<PurchaseRequestRow | null>;
  findItemsById(purchaseRequestId: string): Promise<PurchaseRequestItemRow[]>;
  create(input: CreatePurchaseRequestInput, userId: string): Promise<PurchaseRequestRow>;
  updateStatus(id: string, input: UpdatePurchaseRequestStatusInput): Promise<PurchaseRequestRow>;
  markAsReceived(id: string): Promise<PurchaseRequestRow>;
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
    // Calcular totales
    const totalAmount = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Crear la solicitud de compra
    const { data: purchaseRequest, error: prError } = await supabase
      .from('purchase_requests')
      .insert({
        supplier_id: input.supplierId ?? null,
        status: 'PENDIENTE',
        total_items: input.items.length,
        subtotal: totalAmount,
        total: totalAmount, // Por ahora subtotal = total (sin impuestos/envío)
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
    const current = await this.findById(id);
    if (!current) throw new Error('Compra no encontrada');

    // Validar transición
    const validNextStates = PURCHASE_STATUS_TRANSITIONS[current.status];
    if (!validNextStates.includes(input.status)) {
      throw new BadRequestError(
        `Transición inválida: ${current.status} -> ${input.status}`,
      );
    }

    const { data, error } = await supabase
      .from('purchase_requests')
      .update({ status: input.status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as PurchaseRequestRow;
  }

  async markAsReceived(id: string): Promise<PurchaseRequestRow> {
    // Obtener la compra y sus items
    const purchase = await this.findById(id);
    if (!purchase) throw new Error('Compra no encontrada');

    const items = await this.findItemsById(id);

    // Actualizar stock para cada item
    for (const item of items) {
      if (item.product_id) {
        // Actualizar stock de producto
        const currentProduct = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product_id)
          .single();

        if (!currentProduct.error && currentProduct.data) {
          const newStock = (currentProduct.data.stock || 0) + item.quantity;
          
          await supabase
            .from('products')
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id);
        }

        // Registrar movimiento de inventario
        await supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          type: 'IN',
          quantity: item.quantity,
          reason: `Compra recibida: ${id}`,
          user_id: purchase.created_by,
        });
      } else if (item.part_id) {
        // Actualizar stock de repuesto
        const currentPart = await supabase
          .from('parts')
          .select('stock')
          .eq('id', item.part_id)
          .single();

        if (!currentPart.error && currentPart.data) {
          const newStock = (currentPart.data.stock || 0) + item.quantity;
          
          await supabase
            .from('parts')
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.part_id);
        }

        // Registrar movimiento de inventario para repuestos
        await supabase.from('inventory_movements_parts').insert({
          part_id: item.part_id,
          type: 'IN',
          quantity: item.quantity,
          reason: `Compra recibida: ${id}`,
          user_id: purchase.created_by,
        });
      }
    }

    // Cambiar estado a RECIBIDO
    return this.updateStatus(id, { status: 'RECIBIDO' });
  }
}
