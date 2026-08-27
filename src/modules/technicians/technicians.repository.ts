import { supabase } from '../../config/supabase';
import { ConflictError } from '../../shared/errors/app-error';
import { RegisterTechnicianInput, Technician } from './technicians.types';

interface TechnicianRow {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
  email?: string;
}

function mapRow(row: TechnicianRow): Technician {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? '',
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
    // serviceRoleKey ya bypassea RLS automáticamente
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, active, created_at')
      .eq('role', 'tecnico')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as TechnicianRow[]).map(mapRow);
  }

  async findById(id: string): Promise<Technician | null> {
    // serviceRoleKey ya bypassea RLS automáticamente
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, active, created_at')
      .eq('id', id)
      .eq('role', 'tecnico')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return mapRow(data as TechnicianRow);
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
    // serviceRoleKey ya bypassea RLS automáticamente
    const { data, error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', id)
      .eq('role', 'tecnico')
      .select('id, full_name, phone, role, active, created_at')
      .single();

    if (error) throw error;
    return mapRow(data as TechnicianRow);
  }

  async listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    const { data, error } = await supabase
      .from('work_orders')
      .select('id, guide_number, current_status')
      .eq('technician_id', technicianId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as { id: string; guide_number: string; current_status: string }[]) ?? [];
  }
}
