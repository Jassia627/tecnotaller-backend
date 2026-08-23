import { supabase } from '../../config/supabase';
import {
  AppointmentRow,
  AppointmentStatus,
  CreateAppointmentInput,
} from './appointments.types';

export interface IAppointmentRepository {
  findById(id: string): Promise<AppointmentRow | null>;
  list(options: { from?: string; to?: string; status?: AppointmentStatus }): Promise<AppointmentRow[]>;
  create(input: CreateAppointmentInput): Promise<AppointmentRow>;
  setStatus(id: string, status: AppointmentStatus): Promise<AppointmentRow>;
  cancelExpired(thresholdMinutes: number): Promise<number>;
  hasOverlap(serviceId: string, date: string): Promise<boolean>;
}

export class AppointmentRepository implements IAppointmentRepository {
  async findById(id: string): Promise<AppointmentRow | null> {
    const { data, error } = await supabase.from('appointments').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as AppointmentRow;
  }

  async list(options: { from?: string; to?: string; status?: AppointmentStatus }): Promise<AppointmentRow[]> {
    let query = supabase.from('appointments').select('*').order('date', { ascending: true });
    if (options.from) query = query.gte('date', options.from);
    if (options.to) query = query.lte('date', options.to);
    if (options.status) query = query.eq('status', options.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data as AppointmentRow[]) ?? [];
  }

  async create(input: CreateAppointmentInput): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        service_id: input.serviceId,
        customer_name: input.customerName,
        phone: input.phone,
        date: input.date,
        status: 'pendiente',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as AppointmentRow;
  }

  async setStatus(id: string, status: AppointmentStatus): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as AppointmentRow;
  }

  async cancelExpired(thresholdMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - thresholdMinutes * 60_000).toISOString();
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelada' })
      .eq('status', 'pendiente')
      .lt('date', cutoff)
      .select('id');

    if (error) throw error;
    return data?.length ?? 0;
  }

  async hasOverlap(serviceId: string, date: string): Promise<boolean> {
    const start = new Date(new Date(date).getTime() - 15 * 60_000).toISOString();
    const end = new Date(new Date(date).getTime() + 15 * 60_000).toISOString();

    const { data, error, count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .in('status', ['pendiente', 'confirmada'])
      .gte('date', start)
      .lte('date', end);

    if (error) throw error;
    return (count ?? 0) > 0;
  }
}
