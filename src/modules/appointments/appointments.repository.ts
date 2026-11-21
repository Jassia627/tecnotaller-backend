import { supabase } from '../../config/supabase';
import { getCurrentTenantId, requireCurrentTenantId } from '../../shared/context/tenant-context';
import {
  AppointmentRow,
  AppointmentStatus,
  CompleteAppointmentInput,
  CreateAppointmentInput,
} from './appointments.types';

export interface IAppointmentRepository {
  findById(id: string): Promise<AppointmentRow | null>;
  list(options: { from?: string; to?: string; status?: AppointmentStatus }): Promise<AppointmentRow[]>;
  create(input: CreateAppointmentInput): Promise<AppointmentRow>;
  setStatus(id: string, status: AppointmentStatus): Promise<AppointmentRow>;
  cancelExpired(thresholdMinutes: number): Promise<number>;
  hasOverlap(serviceId: string, date: string): Promise<boolean>;
  complete(id: string, input: CompleteAppointmentInput): Promise<AppointmentRow>;
}

export class AppointmentRepository implements IAppointmentRepository {
  async findById(id: string): Promise<AppointmentRow | null> {
    const tenantId = getCurrentTenantId();
    let query = supabase.from('appointments').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116' || error.code === '22P02') return null;
      throw error;
    }
    return data as AppointmentRow;
  }

  async list(options: { from?: string; to?: string; status?: AppointmentStatus }): Promise<AppointmentRow[]> {
    const tenantId = getCurrentTenantId();
    let query = supabase.from('appointments').select('*').order('date', { ascending: true });
    if (tenantId) query = query.eq('tenant_id', tenantId);
    if (options.from) query = query.gte('date', options.from);
    if (options.to) query = query.lte('date', options.to);
    if (options.status) query = query.eq('status', options.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data as AppointmentRow[]) ?? [];
  }

  async create(input: CreateAppointmentInput): Promise<AppointmentRow> {
    const tenantId = requireCurrentTenantId();
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        service_id: input.serviceId,
        customer_name: input.customerName,
        phone: input.phone,
        date: input.date,
        status: 'pendiente',
        device_brand: input.deviceBrand ?? null,
        device_model: input.deviceModel ?? null,
        problem_description: input.problemDescription ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as AppointmentRow;
  }

  async setStatus(id: string, status: AppointmentStatus): Promise<AppointmentRow> {
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return data as AppointmentRow;
  }

  async cancelExpired(thresholdMinutes: number): Promise<number> {
    const tenantId = getCurrentTenantId();
    const cutoff = new Date(Date.now() - thresholdMinutes * 60_000).toISOString();
    let query = supabase
      .from('appointments')
      .update({ status: 'cancelada' })
      .eq('status', 'pendiente')
      .lt('date', cutoff);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.select('id');

    if (error) throw error;
    return data?.length ?? 0;
  }

  async hasOverlap(serviceId: string, date: string): Promise<boolean> {
    const tenantId = getCurrentTenantId();
    const start = new Date(new Date(date).getTime() - 15 * 60_000).toISOString();
    const end = new Date(new Date(date).getTime() + 15 * 60_000).toISOString();

    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .in('status', ['pendiente', 'confirmada'])
      .gte('date', start)
      .lte('date', end);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { error, count } = await query;

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  async complete(id: string, input: CompleteAppointmentInput): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completada',
        completed_services: input.completedServices,
        completed_notes: input.completedNotes ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as AppointmentRow;
  }
}
