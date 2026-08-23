import { supabase } from '../../config/supabase';
import { CreateDiagnosticInput, DiagnosticRow } from './diagnostics.types';

export interface IDiagnosticRepository {
  listByWorkOrder(workOrderId: string): Promise<DiagnosticRow[]>;
  create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<DiagnosticRow>;
}

export class DiagnosticRepository implements IDiagnosticRepository {
  async listByWorkOrder(workOrderId: string): Promise<DiagnosticRow[]> {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as DiagnosticRow[]) ?? [];
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
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as DiagnosticRow;
  }
}
