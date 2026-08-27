import { supabase } from '../../config/supabase';
import { TechnicianAvailabilityRow, UpdateTechnicianAvailabilityInput } from './technician-availability.types';

export interface ITechnicianAvailabilityRepository {
  getByTechnicianId(technicianId: string): Promise<TechnicianAvailabilityRow | null>;
  update(technicianId: string, input: UpdateTechnicianAvailabilityInput): Promise<TechnicianAvailabilityRow>;
}

export class TechnicianAvailabilityRepository implements ITechnicianAvailabilityRepository {
  async getByTechnicianId(technicianId: string): Promise<TechnicianAvailabilityRow | null> {
    const { data, error } = await supabase
      .from('technician_availability')
      .select('*')
      .eq('technician_id', technicianId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as TechnicianAvailabilityRow;
  }

  async update(technicianId: string, input: UpdateTechnicianAvailabilityInput): Promise<TechnicianAvailabilityRow> {
    // Primero, verificar si existe el registro
    let availability = await this.getByTechnicianId(technicianId);

    if (!availability) {
      // Crear nuevo registro
      const { data, error } = await supabase
        .from('technician_availability')
        .insert({
          technician_id: technicianId,
          available: input.available,
          unavailable_until: input.unavailableUntil ?? null,
          reason: input.reason ?? null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as TechnicianAvailabilityRow;
    } else {
      // Actualizar registro existente
      const { data, error } = await supabase
        .from('technician_availability')
        .update({
          available: input.available,
          unavailable_until: input.unavailableUntil ?? null,
          reason: input.reason ?? null,
        })
        .eq('technician_id', technicianId)
        .select('*')
        .single();

      if (error) throw error;
      return data as TechnicianAvailabilityRow;
    }
  }
}
