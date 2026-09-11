import { supabase } from '../../config/supabase';
import { CreateDiagnosticInput, DiagnosticRow, UpdateDiagnosticInput } from './diagnostics.types';

export interface IDiagnosticRepository {
  listByWorkOrder(workOrderId: string): Promise<DiagnosticRow[]>;
  findById(id: string): Promise<DiagnosticRow | null>;
  create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<DiagnosticRow>;
  update(id: string, input: UpdateDiagnosticInput): Promise<DiagnosticRow>;
  setActive(id: string, active: boolean): Promise<DiagnosticRow>;
}

export class DiagnosticRepository implements IDiagnosticRepository {
  async listByWorkOrder(workOrderId: string): Promise<DiagnosticRow[]> {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DiagnosticRow[]) ?? [];
  }

  async findById(id: string): Promise<DiagnosticRow | null> {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as DiagnosticRow;
  }

  async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<DiagnosticRow> {
    const { data, error } = await supabase
      .from('diagnostics')
      .insert({
        work_order_id: workOrderId,
        technician_id: technicianId,
        observations: input.observations,
        faults: input.faults,
        recommended_actions: input.recommendedActions,
        active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as DiagnosticRow;
  }

  async update(id: string, input: UpdateDiagnosticInput): Promise<DiagnosticRow> {
    const patch = {
      ...(input.observations !== undefined && { observations: input.observations }),
      ...(input.faults !== undefined && { faults: input.faults }),
      ...(input.recommendedActions !== undefined && { recommended_actions: input.recommendedActions }),
    };
    if (Object.keys(patch).length === 0) {
      const { data, error } = await supabase
        .from('diagnostics')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();
      if (error) throw error;
      return data as DiagnosticRow;
    }
    const { data, error } = await supabase
      .from('diagnostics')
      .update(patch)
      .eq('id', id)
      .eq('active', true)
      .select('*')
      .single();
    if (error) throw error;
    return data as DiagnosticRow;
  }

  async setActive(id: string, active: boolean): Promise<DiagnosticRow> {
    const { data, error } = await supabase
      .from('diagnostics')
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as DiagnosticRow;
  }
}
