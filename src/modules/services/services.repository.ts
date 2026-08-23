import { supabase } from '../../config/supabase';
import {
  CreateServiceInput,
  ServiceRow,
  UpdateServiceInput,
} from './services.types';

export interface IServiceRepository {
  list(includeInactive?: boolean): Promise<ServiceRow[]>;
  findById(id: string): Promise<ServiceRow | null>;
  create(input: CreateServiceInput): Promise<ServiceRow>;
  update(id: string, input: UpdateServiceInput): Promise<ServiceRow>;
  setActive(id: string, active: boolean): Promise<ServiceRow>;
}

export class ServiceRepository implements IServiceRepository {
  async list(includeInactive = false): Promise<ServiceRow[]> {
    let query = supabase.from('services').select('*').order('name');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data as ServiceRow[]) ?? [];
  }

  async findById(id: string): Promise<ServiceRow | null> {
    const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ServiceRow;
  }

  async create(input: CreateServiceInput): Promise<ServiceRow> {
    const { data, error } = await supabase
      .from('services')
      .insert({ name: input.name, description: input.description, price: input.price, active: true })
      .select('*')
      .single();
    if (error) throw error;
    return data as ServiceRow;
  }

  async update(id: string, input: UpdateServiceInput): Promise<ServiceRow> {
    const { data, error } = await supabase
      .from('services')
      .update({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as ServiceRow;
  }

  async setActive(id: string, active: boolean): Promise<ServiceRow> {
    const { data, error } = await supabase
      .from('services')
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as ServiceRow;
  }
}
