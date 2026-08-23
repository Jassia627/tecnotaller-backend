import { supabase } from '../../config/supabase';
import { DateRange } from './reports.types';

export interface IReportRepository {
  countServices(filters: DateRange): Promise<{ total: number; byService: { name: string; count: number }[] }>;
  inventorySnapshot(): Promise<{ products: { name: string; sku: string; stock: number }[]; parts: { name: string; sku: string; stock: number }[] }>;
  ordersByStatus(filters: DateRange): Promise<{ status: string; count: number }[]>;
}

export class ReportRepository implements IReportRepository {
  async countServices(filters: DateRange): Promise<{ total: number; byService: { name: string; count: number }[] }> {
    let query = supabase.from('work_orders').select('*', { count: 'exact' });
    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { count, error } = await query;
    if (error) throw error;

    return { total: count ?? 0, byService: [] };
  }

  async inventorySnapshot(): Promise<{ products: { name: string; sku: string; stock: number }[]; parts: { name: string; sku: string; stock: number }[] }> {
    const [productsRes, partsRes] = await Promise.all([
      supabase.from('products').select('name, sku, stock').order('name'),
      supabase.from('parts').select('name, sku, stock').order('name'),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (partsRes.error) throw partsRes.error;

    return {
      products: (productsRes.data ?? []) as { name: string; sku: string; stock: number }[],
      parts: (partsRes.data ?? []) as { name: string; sku: string; stock: number }[],
    };
  }

  async ordersByStatus(filters: DateRange): Promise<{ status: string; count: number }[]> {
    let query = supabase
      .from('work_orders')
      .select('current_status, count', { count: 'exact' });

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;

    const counts = new Map<string, number>();
    for (const row of (data as { current_status: string }[]) ?? []) {
      counts.set(row.current_status, (counts.get(row.current_status) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }
}
