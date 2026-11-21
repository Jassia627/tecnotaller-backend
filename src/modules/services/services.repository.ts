import { supabase } from '../../config/supabase';
import { getCurrentTenantId, requireCurrentTenantId } from '../../shared/context/tenant-context';
import { BadRequestError } from '../../shared/errors/app-error';
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
    const tenantId = getCurrentTenantId();
    let query = supabase.from('services').select('*').order('name');
    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data as ServiceRow[]) ?? [];
  }

  async findById(id: string): Promise<ServiceRow | null> {
    const tenantId = getCurrentTenantId();
    let query = supabase.from('services').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ServiceRow;
  }

  async create(input: CreateServiceInput): Promise<ServiceRow> {
    const tenantId = requireCurrentTenantId();
    const { data, error } = await supabase
      .from('services')
      .insert({ tenant_id: tenantId, name: input.name, description: input.description, price: input.price, active: true })
      .select('*')
      .single();
    if (error) throw error;
    return data as ServiceRow;
  }

  async update(id: string, input: UpdateServiceInput): Promise<ServiceRow> {
    const tenantId = getCurrentTenantId();
    const patch = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
    };
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No hay campos para actualizar');
    }
    let query = supabase
      .from('services')
      .update(patch)
      .eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as ServiceRow;
  }

  async setActive(id: string, active: boolean): Promise<ServiceRow> {
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('services')
      .update({ active })
      .eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as ServiceRow;
  }
}
