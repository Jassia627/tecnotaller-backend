import { supabase } from '../../config/supabase';
import { NotificationRow, NotificationStatus } from './notifications.types';

export interface INotificationRepository {
  listByWorkOrder(workOrderId: string): Promise<NotificationRow[]>;
  markSent(id: string): Promise<void>;
  markFailed(id: string): Promise<void>;
}

export class NotificationRepository implements INotificationRepository {
  async listByWorkOrder(workOrderId: string): Promise<NotificationRow[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '22P02' || error.code === 'PGRST116') return [];
      throw error;
    }
    return (data as NotificationRow[]) ?? [];
  }

  async markSent(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'enviada' as NotificationStatus, sent_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async markFailed(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'fallida' as NotificationStatus })
      .eq('id', id);
    if (error) throw error;
  }
}
