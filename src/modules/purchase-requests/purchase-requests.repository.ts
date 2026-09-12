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

    try {
      // PASO 1: Crear la solicitud de compra
      const { data: purchaseRequest, error: prError } = await supabase
        .from('purchase_requests')
        .insert({
          supplier_id: input.supplierId ?? null,
          status: 'PENDIENTE',
          total_items: input.items.length,
          subtotal: totalAmount,
          total: totalAmount,
          notes: input.notes ?? null,
          created_by: userId,
        })
        .select('*')
        .single();

      if (prError) throw prError;
      if (!purchaseRequest) throw new Error('Error al crear compra');

      // PASO 2: Crear los items
      const itemsToInsert = input.items.map((item) => ({
        purchase_request_id: purchaseRequest.id,
        product_id: item.productId ?? null,
        part_id: item.partId ?? null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase.from('purchase_request_items').insert(itemsToInsert);

      if (itemsError) {
        // ROLLBACK: Eliminar compra si falla inserción de items
        await supabase.from('purchase_requests').delete().eq('id', purchaseRequest.id);
        throw itemsError;
      }

      return purchaseRequest as PurchaseRequestRow;
    } catch (error) {
      throw error;
    }
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
    // PASO 1: Validaciones previas
    const purchase = await this.findById(id);
    if (!purchase) throw new Error('Compra no encontrada');

    // Validar que no esté ya RECIBIDA (idempotencia)
    if (purchase.status === 'RECIBIDO') {
      throw new BadRequestError('Compra ya fue recibida. No se puede recibir dos veces.');
    }

    // Validar que está en estado ORDENADO
    if (purchase.status !== 'ORDENADO') {
      throw new BadRequestError(
        `No se puede recibir una compra en estado ${purchase.status}. Debe estar en ORDENADO.`,
      );
    }

    const items = await this.findItemsById(id);
    if (!items || items.length === 0) {
      throw new BadRequestError('Compra sin items. No se puede recibir.');
    }

    // PASO 2: Actualizar estado a RECIBIDO primero (marcar transacción iniciada)
    const { data: updatedPurchase, error: statusError } = await supabase
      .from('purchase_requests')
      .update({ status: 'RECIBIDO' })
      .eq('id', id)
      .select('*')
      .single();

    if (statusError) throw statusError;

    // PASO 3: Actualizar stock para cada item (con validaciones)
    try {
      for (const item of items) {
        if (item.product_id) {
          // Obtener producto actual
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, stock')
            .eq('id', item.product_id)
            .single();

          if (productError || !product) {
            throw new Error(`Producto ${item.product_id} no encontrado`);
          }

          const newStock = product.stock + item.quantity;

          // Actualizar stock de producto
          const { error: updateError } = await supabase
            .from('products')
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product_id);

          if (updateError) throw updateError;

          // Registrar movimiento de inventario
          const { error: movementError } = await supabase.from('inventory_movements').insert({
            product_id: item.product_id,
            type: 'IN',
            quantity: item.quantity,
            reason: `Compra recibida: ${id}`,
            user_id: purchase.created_by,
          });

          if (movementError) throw movementError;
        } else if (item.part_id) {
          // Obtener repuesto actual
          const { data: part, error: partError } = await supabase
            .from('parts')
            .select('id, stock')
            .eq('id', item.part_id)
            .single();

          if (partError || !part) {
            throw new Error(`Repuesto ${item.part_id} no encontrado`);
          }

          const newStock = part.stock + item.quantity;

          // Actualizar stock de repuesto
          const { error: updateError } = await supabase
            .from('parts')
            .update({
              stock: newStock,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.part_id);

          if (updateError) throw updateError;

          // Registrar movimiento de inventario para repuestos
          const { error: movementError } = await supabase.from('inventory_movements_parts').insert({
            part_id: item.part_id,
            type: 'IN',
            quantity: item.quantity,
            reason: `Compra recibida: ${id}`,
            user_id: purchase.created_by,
          });

          if (movementError) throw movementError;
        }
      }

      return updatedPurchase as PurchaseRequestRow;
    } catch (error) {
      // ROLLBACK: Revertir estado a ORDENADO si algo falla
      await supabase
        .from('purchase_requests')
        .update({ status: 'ORDENADO' })
        .eq('id', id);

      throw error;
    }
  }
}
