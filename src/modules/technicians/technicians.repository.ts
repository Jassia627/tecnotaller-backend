import { supabase } from '../../config/supabase';
import { ConflictError } from '../../shared/errors/app-error';
import { RegisterTechnicianInput, Technician, UpdateTechnicianInput } from './technicians.types';

interface TechnicianRow {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  active: boolean;
  created_at: string;
}

interface AuthUser {
  id: string;
  email: string;
}

async function getTechnicianWithEmail(id: string): Promise<Technician | null> {
  // Obtener perfil de técnico
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, active, created_at')
    .eq('id', id)
    .eq('role', 'tecnico')
    .single();

  if (profileError || !profile) return null;

  // Obtener email desde auth.users usando admin API
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find((u) => u.id === id);

  return mapRow(profile as TechnicianRow, authUser?.email || '');
}

function mapRow(row: TechnicianRow, email: string = ''): Technician {
  return {
    id: row.id,
    fullName: row.full_name,
    email: email,
    phone: row.phone,
    active: row.active,
    createdAt: row.created_at,
  };
}

export interface ITechnicianRepository {
  list(): Promise<Technician[]>;
  findById(id: string): Promise<Technician | null>;
  register(input: RegisterTechnicianInput): Promise<Technician>;
  update(id: string, input: UpdateTechnicianInput): Promise<Technician>;
  setActive(id: string, active: boolean): Promise<Technician>;
  delete(id: string): Promise<void>;
  listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]>;
}

export class TechnicianRepository implements ITechnicianRepository {
  async list(): Promise<Technician[]> {
    // Obtener todos los técnicos de profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role, active, created_at')
      .eq('role', 'tecnico')
      .order('created_at', { ascending: false });

    if (profileError) throw profileError;
    if (!profiles) return [];

    // Obtener todos los usuarios de auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const userEmailMap = new Map(authData?.users?.map((u) => [u.id, u.email]) ?? []);

    // Mapear perfiles con sus emails
    return profiles.map((p) => mapRow(p as TechnicianRow, userEmailMap.get(p.id) || ''));
  }

  async findById(id: string): Promise<Technician | null> {
    return getTechnicianWithEmail(id);
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
    // Actualizar perfil
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', id)
      .eq('role', 'tecnico')
      .select('id, full_name, phone, role, active, created_at')
      .single();

    if (updateError) throw updateError;

    // Obtener email desde auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users?.find((u) => u.id === id);

    return mapRow(profile as TechnicianRow, authUser?.email || '');
  }

  async update(id: string, input: UpdateTechnicianInput): Promise<Technician> {
    const updateData: Record<string, unknown> = {};
    if (input.fullName !== undefined) updateData.full_name = input.fullName;
    if (input.phone !== undefined) updateData.phone = input.phone ?? null;

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'tecnico')
      .select('id, full_name, phone, role, active, created_at')
      .single();

    if (updateError) throw updateError;

    // Obtener email desde auth.users
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData?.users?.find((u) => u.id === id);

    return mapRow(profile as TechnicianRow, authUser?.email || '');
  }

  async delete(id: string): Promise<void> {
    // Marcar como inactivo en lugar de borrar
    const { error } = await supabase
      .from('profiles')
      .update({ active: false })
      .eq('id', id)
      .eq('role', 'tecnico');

    if (error) throw error;
  }

  async listWorkOrders(technicianId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    const { data, error } = await supabase
      .rpc('get_technician_work_orders', { technician_id: technicianId }, { head: false });

    if (error) throw error;
    return (data as { id: string; guide_number: string; current_status: string }[]) ?? [];
  }
}
