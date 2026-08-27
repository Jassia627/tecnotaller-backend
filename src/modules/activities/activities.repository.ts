import { supabase } from '../../config/supabase';
import { Activity, ActivityRow, CreateActivityInput } from './activities.types';

function mapRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    workOrderId: row.work_order_id,
    description: row.description,
    technicianId: row.technician_id,
    createdAt: row.created_at,
  };
}

export interface IActivityRepository {
  create(workOrderId: string, technicianId: string, input: CreateActivityInput): Promise<Activity>;
  listByWorkOrder(workOrderId: string): Promise<Activity[]>;
}

export class ActivityRepository implements IActivityRepository {
  async create(workOrderId: string, technicianId: string, input: CreateActivityInput): Promise<Activity> {
    const { data, error } = await supabase
      .from('work_order_activities')
      .insert({
        work_order_id: workOrderId,
        technician_id: technicianId,
        description: input.description,
      })
      .select('id, work_order_id, description, technician_id, created_at')
      .single();

    if (error) throw error;
    return mapRow(data as ActivityRow);
  }

  async listByWorkOrder(workOrderId: string): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('work_order_activities')
      .select('id, work_order_id, description, technician_id, created_at')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data as ActivityRow[]).map(mapRow);
  }
}
