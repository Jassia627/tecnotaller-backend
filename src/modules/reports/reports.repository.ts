import { supabase } from '../../config/supabase';
import { DateRange } from './reports.types';

export interface IReportRepository {
  countServices(filters: DateRange): Promise<{ total: number; byService: { name: string; count: number }[] }>;
  inventorySnapshot(): Promise<{ products: { name: string; sku: string; stock: number }[]; parts: { name: string; sku: string; stock: number }[] }>;
  ordersByStatus(filters: DateRange): Promise<{ status: string; count: number }[]>;
  salesReport(filters: DateRange): Promise<{ totalSales: number; byProduct: { name: string; quantity: number; revenue: number }[] }>;
  revenueReport(filters: DateRange): Promise<{ totalRevenue: number; byService: { name: string; revenue: number }[] }>;
  trendsReport(filters: DateRange): Promise<{ trend: string; data: { date: string; value: number }[] }[]>;
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
    // Obtener todas las órdenes con su estado
    let query = supabase
      .from('work_orders')
      .select('current_status');

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por estado en código
    const counts = new Map<string, number>();
    for (const row of (data as { current_status: string }[]) ?? []) {
      counts.set(row.current_status, (counts.get(row.current_status) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }

  async salesReport(filters: DateRange): Promise<{ totalSales: number; byProduct: { name: string; quantity: number; revenue: number }[] }> {
    // Obtener ventas de productos y repuestos desde work_orders
    let query = supabase
      .from('work_orders')
      .select('id, total_cost');

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    const totalSales = (orders as { total_cost: number }[])?.reduce((sum, order) => sum + (order.total_cost || 0), 0) ?? 0;

    return {
      totalSales,
      byProduct: [],
    };
  }

  async revenueReport(filters: DateRange): Promise<{ totalRevenue: number; byService: { name: string; revenue: number }[] }> {
    // Obtener ingresos por servicio desde work_orders
    let query = supabase
      .from('work_orders')
      .select('service_id, total_cost, services(name)');

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;

    const revenueByService = new Map<string, number>();
    let totalRevenue = 0;

    for (const row of (data as any[]) ?? []) {
      const serviceName = row.services?.name || 'Sin servicio';
      const cost = row.total_cost || 0;
      revenueByService.set(serviceName, (revenueByService.get(serviceName) ?? 0) + cost);
      totalRevenue += cost;
    }

    return {
      totalRevenue,
      byService: Array.from(revenueByService.entries()).map(([name, revenue]) => ({ name, revenue })),
    };
  }

  async trendsReport(filters: DateRange): Promise<{ trend: string; data: { date: string; value: number }[] }[]> {
    // Obtener tendencias de órdenes y servicios por día
    let query = supabase
      .from('work_orders')
      .select('created_at');

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    // Agrupar órdenes por fecha
    const ordersByDate = new Map<string, number>();
    for (const order of (orders as { created_at: string }[]) ?? []) {
      const date = new Date(order.created_at).toISOString().split('T')[0] || 'sin-fecha';
      ordersByDate.set(date, (ordersByDate.get(date) ?? 0) + 1);
    }

    const trendData = Array.from(ordersByDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, value]) => ({ date, value }));

    return [
      {
        trend: 'ordenes_por_dia',
        data: trendData,
      },
    ];
  }
}
