import { supabase } from '../../config/supabase';
import { getCurrentTenantId, requireCurrentTenantId } from '../../shared/context/tenant-context';
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
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('diagnostics')
      .select('*')
      .eq('work_order_id', workOrderId);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false });
    if (error) {
      if (error.code === '22P02' || error.code === 'PGRST116') return [];
      throw error;
    }
    return (data as DiagnosticRow[]) ?? [];
  }

  async findById(id: string): Promise<DiagnosticRow | null> {
    const tenantId = getCurrentTenantId();
    let query = supabase
      .from('diagnostics')
      .select('*')
      .eq('id', id);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116' || error.code === '22P02') return null;
      throw error;
    }
    return data as DiagnosticRow;
  }

  async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<DiagnosticRow> {
    const validTechnicianId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(technicianId) ? technicianId : null;

    const { data, error } = await supabase
      .from('diagnostics')
      .insert({
        tenant_id: requireCurrentTenantId(),
        work_order_id: workOrderId,
        technician_id: validTechnicianId,
        observations: input.observations,
        faults: input.faults,
        recommended_actions: input.recommendedActions,
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
    const tenantId = getCurrentTenantId();
    if (Object.keys(patch).length === 0) {
      let findQuery = supabase
        .from('diagnostics')
        .select('*')
        .eq('id', id);
      if (tenantId) {
        findQuery = findQuery.eq('tenant_id', tenantId);
      }
      const { data, error } = await findQuery.single();
      if (error) throw error;
      return data as DiagnosticRow;
    }
    let updateQuery = supabase
      .from('diagnostics')
      .update(patch)
      .eq('id', id);
    if (tenantId) {
      updateQuery = updateQuery.eq('tenant_id', tenantId);
    }
    const { data, error } = await updateQuery
      .select('*')
      .single();
    if (error) throw error;
    return data as DiagnosticRow;
  }

  async setActive(id: string, active: boolean): Promise<DiagnosticRow> {
    const existing = await this.findById(id);
    if (!active && existing) {
      const tenantId = getCurrentTenantId();
      let delQuery = supabase.from('diagnostics').delete().eq('id', id);
      if (tenantId) {
        delQuery = delQuery.eq('tenant_id', tenantId);
      }
      await delQuery;
    }
    return existing ?? ({ id, active } as any);
  }
}
