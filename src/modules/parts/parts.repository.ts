import { supabase } from '../../config/supabase';
import { getCurrentTenantId, requireCurrentTenantId } from '../../shared/context/tenant-context';
import { BadRequestError } from '../../shared/errors/app-error';
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
    const tenantId = getCurrentTenantId();

    let query = supabase
      .from('parts')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to);
    if (tenantId) query = query.eq('tenant_id', tenantId);

    const { data, count, error } = await query;

    if (error) throw error;
    return { rows: (data as PartRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<PartRow | null> {
    const tenantId = getCurrentTenantId();
    let query = supabase.from('parts').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as PartRow;
  }

  async create(input: CreatePartInput): Promise<PartRow> {
    const tenantId = requireCurrentTenantId();
    const { data, error } = await supabase
      .from('parts')
      .insert({
        tenant_id: tenantId,
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
    const tenantId = getCurrentTenantId();
    const patch = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.purchasePrice !== undefined && { purchase_price: input.purchasePrice }),
      ...(input.salePrice !== undefined && { sale_price: input.salePrice }),
    };
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No hay campos para actualizar');
    }
    let query = supabase
      .from('parts')
      .update(patch)
      .eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as PartRow;
  }

  async assignToWorkOrder(workOrderId: string, partId: string, quantity: number): Promise<PartRow> {
    const { data, error } = await supabase.rpc('assign_part_to_order', {
      p_work_order_id: workOrderId,
      p_part_id: partId,
      p_quantity: quantity,
    });

    if (error) throw error;
    return data as PartRow;
  }
}
