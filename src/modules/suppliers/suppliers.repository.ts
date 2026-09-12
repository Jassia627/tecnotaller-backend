import { supabase } from '../../config/supabase';
import { SupplierRow, CreateSupplierInput, UpdateSupplierInput } from './suppliers.types';

export interface ISupplierRepository {
  list(options: { page: number; pageSize: number }): Promise<{ rows: SupplierRow[]; total: number }>;
  findById(id: string): Promise<SupplierRow | null>;
  create(input: CreateSupplierInput): Promise<SupplierRow>;
  update(id: string, input: UpdateSupplierInput): Promise<SupplierRow>;
  changeStatus(id: string, active: boolean): Promise<SupplierRow>;
}

export class SupplierRepository implements ISupplierRepository {
  async list(options: { page: number; pageSize: number }): Promise<{ rows: SupplierRow[]; total: number }> {
    const from = (options.page - 1) * options.pageSize;
    const to = from + options.pageSize - 1;

    const { data, count, error } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('active', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as SupplierRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<SupplierRow | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as SupplierRow;
  }

  async create(input: CreateSupplierInput): Promise<SupplierRow> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: input.name,
        contact_person: input.contactPerson,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        country: input.country,
        active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as SupplierRow;
  }

  async update(id: string, input: UpdateSupplierInput): Promise<SupplierRow> {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.contactPerson !== undefined) updateData.contact_person = input.contactPerson;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.country !== undefined) updateData.country = input.country;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as SupplierRow;
  }

  async changeStatus(id: string, active: boolean): Promise<SupplierRow> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as SupplierRow;
  }
}
