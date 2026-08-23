import { supabase } from '../../config/supabase';
import { CreateCustomerInput, CustomerRow } from './customers.types';

export interface ICustomerRepository {
  list(options: { page: number; pageSize: number }): Promise<{ rows: CustomerRow[]; total: number }>;
  findById(id: string): Promise<CustomerRow | null>;
  create(input: CreateCustomerInput): Promise<CustomerRow>;
  listWorkOrders(customerId: string): Promise<{ id: string; guide_number: string; current_status: string }[]>;
}

export class CustomerRepository implements ICustomerRepository {
  async list(options: { page: number; pageSize: number }): Promise<{ rows: CustomerRow[]; total: number }> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    const { data, count, error } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as CustomerRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<CustomerRow | null> {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as CustomerRow;
  }

  async create(input: CreateCustomerInput): Promise<CustomerRow> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        email: input.email ?? null,
        full_name: input.fullName,
        phone: input.phone ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as CustomerRow;
  }

  async listWorkOrders(customerId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, guide_number, current_status')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as { id: string; guide_number: string; current_status: string }[]) ?? [];
  }
}
