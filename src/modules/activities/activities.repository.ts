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

const inMemoryActivities = new Map<string, Activity[]>();

export class ActivityRepository implements IActivityRepository {
  async create(workOrderId: string, technicianId: string, input: CreateActivityInput): Promise<Activity> {
    const fallbackActivity: Activity = {
      id: `act-${Date.now()}`,
      workOrderId,
      description: input.description,
      technicianId: technicianId || 'dev-tech-id',
      createdAt: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('work_order_activities')
        .insert({
          work_order_id: workOrderId,
          technician_id: technicianId,
          description: input.description,
        })
        .select('id, work_order_id, description, technician_id, created_at')
        .single();

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          const list = inMemoryActivities.get(workOrderId) || [];
          inMemoryActivities.set(workOrderId, [...list, fallbackActivity]);
          return fallbackActivity;
        }
        throw error;
      }
      return mapRow(data as ActivityRow);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.code === '42P01') {
        const list = inMemoryActivities.get(workOrderId) || [];
        inMemoryActivities.set(workOrderId, [...list, fallbackActivity]);
        return fallbackActivity;
      }
      throw err;
    }
  }

  async listByWorkOrder(workOrderId: string): Promise<Activity[]> {
    const inMem = inMemoryActivities.get(workOrderId) || [];

    try {
      const { data, error } = await supabase
        .from('work_order_activities')
        .select('id, work_order_id, description, technician_id, created_at')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST116') {
          return inMem;
        }
        throw error;
      }
      const dbActivities = ((data as ActivityRow[]) || []).map(mapRow);
      return [...dbActivities, ...inMem];
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.code === '42P01' || err?.code === 'PGRST116') {
        return inMem;
      }
      throw err;
    }
  }
}
