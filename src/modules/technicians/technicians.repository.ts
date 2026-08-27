import { supabase } from '../../config/supabase';
import { ConflictError } from '../../shared/errors/app-error';
import { RegisterTechnicianInput, Technician } from './technicians.types';

interface TechnicianRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

function mapRow(row: TechnicianRow): Technician {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone,
    active: row.active,
    createdAt: row.created_at,
  };
}

export interface ITechnicianRepository {
  list(): Promise<Technician[]>;
  findById(id: string): Promise<Technician | null>;
  register(input: RegisterTechnicianInput): Promise<Technician>;
  setActive(id: string, active: boolean): Promise<Technician>;
  listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]>;
}

export class TechnicianRepository implements ITechnicianRepository {
  async list(): Promise<Technician[]> {
    // Usar RPC function para evitar RLS recursiva
    const { data, error } = await supabase
      .rpc('get_technicians', {}, { head: false });

    if (error) throw error;
    return (data as TechnicianRow[]).map(mapRow);
  }

  async findById(id: string): Promise<Technician | null> {
    // Usar RPC function para evitar RLS recursiva
    const { data, error } = await supabase
      .rpc('get_technician_by_id', { technician_id: id }, { head: false });

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data || data.length === 0) return null;
    return mapRow(data[0] as TechnicianRow);
  }

  async register(input: RegisterTechnicianInput): Promise<Technician> {
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ?? null,
        role: 'tecnico',
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        throw new ConflictError('El correo ya está registrado');
      }
      throw error;
    }

    const tech = await this.findById(data.user.id);
    if (!tech) throw new Error('No se pudo crear el técnico');
    return tech;
  }

  async setActive(id: string, active: boolean): Promise<Technician> {
    // Usar RPC function para obtener el email correctamente
    const { data, error } = await supabase
      .rpc('set_technician_active', { technician_id: id, is_active: active }, { head: false });

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Técnico no encontrado');
    
    return mapRow(data[0] as TechnicianRow);
  }

  async listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    const { data, error } = await supabase
      .rpc('get_technician_work_orders', { technician_id: technicianId }, { head: false });

    if (error) throw error;
    return (data as { id: string; guide_number: string; current_status: string }[]) ?? [];
  }
}
