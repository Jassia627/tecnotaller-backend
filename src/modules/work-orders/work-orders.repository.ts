import { supabase } from '../../config/supabase';
import {
  CreateWorkOrderInput,
  OrderStatus,
  StatusHistoryRow,
  WorkOrderRow,
} from './work-orders.types';

export interface IWorkOrderRepository {
  findById(id: string): Promise<WorkOrderRow | null>;
  findByGuideNumber(guideNumber: string): Promise<WorkOrderRow | null>;
  list(options: { status?: OrderStatus; technicianId?: string; page: number; pageSize: number }): Promise<{ rows: WorkOrderRow[]; total: number }>;
  create(input: CreateWorkOrderInput, guideNumber: string): Promise<WorkOrderRow>;
  transitionStatus(id: string, from: OrderStatus, to: OrderStatus, userId: string): Promise<WorkOrderRow>;
  listHistory(id: string): Promise<StatusHistoryRow[]>;
  listHistoryByGuide(guideNumber: string): Promise<StatusHistoryRow[]>;
  addPhoto(workOrderId: string, storagePath: string, kind: 'inicial' | 'final'): Promise<void>;
  registerExit(id: string, data: { finalState: string; repairsPerformed: string; partsUsed?: string; observations?: string }): Promise<WorkOrderRow>;
}

export class WorkOrderRepository implements IWorkOrderRepository {
  async findById(id: string): Promise<WorkOrderRow | null> {
    const { data, error } = await supabase.from('work_orders').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as WorkOrderRow;
  }

  async findByGuideNumber(guideNumber: string): Promise<WorkOrderRow | null> {
    const { data, error } = await supabase.from('work_orders').select('*').eq('guide_number', guideNumber).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as WorkOrderRow;
  }

  async list(options: {
    status?: OrderStatus;
    technicianId?: string;
    fromDate?: string;
    toDate?: string;
    searchText?: string;
    page: number;
    pageSize: number;
  }): Promise<{ rows: WorkOrderRow[]; total: number }> {
    const { page, pageSize } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('work_orders').select('*', { count: 'exact' });

    // Aplicar filtros
    if (options.status) query = query.eq('current_status', options.status);
    if (options.technicianId) query = query.eq('technician_id', options.technicianId);

    // Filtro por rango de fechas
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }
    if (options.toDate) {
      // Agregar 1 día al toDate para incluir todo el día
      const endOfDay = new Date(options.toDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query = query.lt('created_at', endOfDay.toISOString());
    }

    // Búsqueda por texto (en device_brand, device_model, device_serial, problem_description, guide_number)
    if (options.searchText) {
      const searchPattern = `%${options.searchText}%`;
      query = query.or(
        `device_brand.ilike.${searchPattern},device_model.ilike.${searchPattern},device_serial.ilike.${searchPattern},problem_description.ilike.${searchPattern},guide_number.ilike.${searchPattern}`
      );
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as WorkOrderRow[]) ?? [], total: count ?? 0 };
  }

  async create(input: CreateWorkOrderInput, guideNumber: string): Promise<WorkOrderRow> {
    const { data, error } = await supabase
      .from('work_orders')
      .insert({
        guide_number: guideNumber,
        customer_id: input.customerId,
        technician_id: input.technicianId,
        device_brand: input.deviceBrand,
        device_model: input.deviceModel,
        device_serial: input.deviceSerial,
        problem_description: input.problemDescription,
        accessories: input.accessories ?? null,
        current_status: 'INGRESADO',
      })
      .select('*')
      .single();

    if (error) throw error;

    const created = data as WorkOrderRow;

    if (input.devicePassword) {
      await this.encryptAndStorePassword(created.id, input.devicePassword);
    }

    await supabase.from('order_status_history').insert({
      work_order_id: created.id,
      from_status: 'INGRESADO',
      to_status: 'INGRESADO',
      user_id: null,
    });

    return created;
  }

  async transitionStatus(id: string, from: OrderStatus, to: OrderStatus, userId: string): Promise<WorkOrderRow> {
    const { data, error } = await supabase.rpc('transition_order_status', {
      p_work_order_id: id,
      p_from_status: from,
      p_to_status: to,
      p_user_id: userId,
    });

    if (error) throw error;
    return data as WorkOrderRow;
  }

  async listHistory(id: string): Promise<StatusHistoryRow[]> {
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as StatusHistoryRow[]) ?? [];
  }

  async listHistoryByGuide(guideNumber: string): Promise<StatusHistoryRow[]> {
    const order = await this.findByGuideNumber(guideNumber);
    if (!order) return [];
    return this.listHistory(order.id);
  }

  async addPhoto(workOrderId: string, storagePath: string, kind: 'inicial' | 'final'): Promise<void> {
    const { error } = await supabase.from('order_photos').insert({
      work_order_id: workOrderId,
      storage_path: storagePath,
      kind,
    });
    if (error) throw error;
  }

  async registerExit(id: string, data: { finalState: string; repairsPerformed: string; partsUsed?: string; observations?: string }): Promise<WorkOrderRow> {
    const { data: row, error } = await supabase
      .from('work_orders')
      .update({
        exit_final_state: data.finalState,
        exit_repairs_performed: data.repairsPerformed,
        exit_parts_used: data.partsUsed ?? null,
        exit_observations: data.observations ?? null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return row as WorkOrderRow;
  }

  private async encryptAndStorePassword(workOrderId: string, password: string): Promise<void> {
    // Cifrado en la BD (RNF-05): nunca se almacena en texto plano.
    const { error } = await supabase.rpc('encrypt_order_password', {
      p_work_order_id: workOrderId,
      p_password: password,
    });
    if (error) throw error;
  }
}
