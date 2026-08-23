import { supabase } from '../../config/supabase';
import { CreatePartInput, PartRow, UpdatePartInput } from './parts.types';

export interface IPartRepository {
  list(options: { page: number; pageSize: number }): Promise<{ rows: PartRow[]; total: number }>;
  findById(id: string): Promise<PartRow | null>;
  create(input: CreatePartInput): Promise<PartRow>;
  update(id: string, input: UpdatePartInput): Promise<PartRow>;
  assignToWorkOrder(workOrderId: string, partId: string, quantity: number): Promise<PartRow>;
}

export class PartRepository implements IPartRepository {
  async list(options: { page: number; pageSize: number }): Promise<{ rows: PartRow[]; total: number }> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    const { data, count, error } = await supabase
      .from('parts')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to);

    if (error) throw error;
    return { rows: (data as PartRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<PartRow | null> {
    const { data, error } = await supabase.from('parts').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PartRow;
  }

  async create(input: CreatePartInput): Promise<PartRow> {
    const { data, error } = await supabase
      .from('parts')
      .insert({
        name: input.name,
        sku: input.sku,
        stock: input.stock,
        purchase_price: input.purchasePrice,
        sale_price: input.salePrice,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as PartRow;
  }

  async update(id: string, input: UpdatePartInput): Promise<PartRow> {
    const { data, error } = await supabase
      .from('parts')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.purchasePrice !== undefined && { purchase_price: input.purchasePrice }),
        ...(input.salePrice !== undefined && { sale_price: input.salePrice }),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as PartRow;
  }

  async assignToWorkOrder(workOrderId: string, partId: string, quantity: number): Promise<PartRow> {
    // RPC transaccional: descuenta stock + registra en order_parts (RNF-14)
    const { data, error } = await supabase.rpc('assign_part_to_order', {
      p_work_order_id: workOrderId,
      p_part_id: partId,
      p_quantity: quantity,
    });

    if (error) throw error;
    return data as PartRow;
  }
}
