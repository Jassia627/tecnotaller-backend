import { supabase } from '../../config/supabase';
import { CreateWarrantyInput, WarrantyRow } from './warranties.types';

export interface IWarrantyRepository {
  findByWorkOrder(workOrderId: string): Promise<WarrantyRow | null>;
  create(workOrderId: string, input: CreateWarrantyInput): Promise<WarrantyRow>;
}

export class WarrantyRepository implements IWarrantyRepository {
  async findByWorkOrder(workOrderId: string): Promise<WarrantyRow | null> {
    const { data, error } = await supabase
      .from('warranties')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as WarrantyRow;
  }

  async create(workOrderId: string, input: CreateWarrantyInput): Promise<WarrantyRow> {
    const expiresAt = new Date(Date.now() + input.periodDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('warranties')
      .insert({
        work_order_id: workOrderId,
        period_days: input.periodDays,
        expires_at: expiresAt,
        status: 'vigente',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as WarrantyRow;
  }
}
