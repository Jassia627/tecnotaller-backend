import { supabase } from '../../config/supabase';
import { DateRange } from './reports.types';

export interface IReportRepository {
  countServices(filters: DateRange): Promise<{ total: number; byService: { name: string; count: number }[] }>;
  inventorySnapshot(): Promise<{ products: { name: string; sku: string; stock: number }[]; parts: { name: string; sku: string; stock: number }[] }>;
  ordersByStatus(filters: DateRange): Promise<{ status: string; count: number }[]>;
  salesReport(filters: DateRange): Promise<{ totalSales: number; byProduct: { name: string; quantity: number; revenue: number }[]; byService: { name: string; quantity: number; revenue: number }[] }>;
  revenueReport(filters: DateRange): Promise<{ totalRevenue: number; byTechnician: { technicianId: string; technicianName: string; revenue: number }[]; byStatus: { status: string; revenue: number }[] }>;
  trendsReport(filters: DateRange): Promise<{ timeSeries: { date: string; value: number }[]; summary: { total: number; average: number; min: number; max: number } }>;
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

  async salesReport(filters: DateRange): Promise<{ totalSales: number; byProduct: { name: string; quantity: number; revenue: number }[]; byService: { name: string; quantity: number; revenue: number }[] }> {
    // Obtener ventas de productos desde work_orders_products
    let query = supabase
      .from('work_orders_products')
      .select('product_id, quantity, products(name)');

    // Nota: Los filtros se aplicarían en el join con work_orders si lo permitiera Supabase
    const { data: productSales, error: productError } = await query;
    if (productError) throw productError;

    const salesByProduct = new Map<string, { quantity: number; revenue: number }>();

    for (const row of (productSales as any[]) ?? []) {
      const productName = row.products?.name || 'Sin producto';
      const quantity = row.quantity || 0;
      // Calcular revenue requeriría el precio del producto, que se obtendría de otra manera
      const current = salesByProduct.get(productName) || { quantity: 0, revenue: 0 };
      current.quantity += quantity;
      salesByProduct.set(productName, current);
    }

    const totalSales = Array.from(salesByProduct.values()).reduce((sum, item) => sum + item.revenue, 0);

    return {
      totalSales,
      byProduct: Array.from(salesByProduct.entries()).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue,
      })),
      byService: [],
    };
  }

  async revenueReport(filters: DateRange): Promise<{ totalRevenue: number; byTechnician: { technicianId: string; technicianName: string; revenue: number }[]; byStatus: { status: string; revenue: number }[] }> {
    // Obtener ingresos por técnico y estado desde work_orders
    let query = supabase
      .from('work_orders')
      .select('id, technician_id, current_status, total_cost, profiles(full_name)');

    if (filters.from) query = query.gte('created_at', filters.from);
    if (filters.to) query = query.lte('created_at', filters.to);

    const { data, error } = await query;
    if (error) throw error;

    const revenueByTechnician = new Map<string, { name: string; revenue: number }>();
    const revenueByStatus = new Map<string, number>();
    let totalRevenue = 0;

    for (const row of (data as any[]) ?? []) {
      const cost = row.total_cost || 0;
      const status = row.current_status || 'sin-estado';
      const technicianId = row.technician_id || 'sin-tecnico';
      const technicianName = row.profiles?.full_name || 'Sin técnico';

      // Acumular por técnico
      const techCurrent = revenueByTechnician.get(technicianId) || { name: technicianName, revenue: 0 };
      techCurrent.revenue += cost;
      revenueByTechnician.set(technicianId, techCurrent);

      // Acumular por estado
      revenueByStatus.set(status, (revenueByStatus.get(status) ?? 0) + cost);

      totalRevenue += cost;
    }

    return {
      totalRevenue,
      byTechnician: Array.from(revenueByTechnician.entries()).map(([technicianId, data]) => ({
        technicianId,
        technicianName: data.name,
        revenue: data.revenue,
      })),
      byStatus: Array.from(revenueByStatus.entries()).map(([status, revenue]) => ({ status, revenue })),
    };
  }

  async trendsReport(filters: DateRange): Promise<{ timeSeries: { date: string; value: number }[]; summary: { total: number; average: number; min: number; max: number } }> {
    // Obtener tendencias de órdenes por período
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

    const timeSeries = Array.from(ordersByDate.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, value]) => ({ date, value }));

    const values = timeSeries.map((item) => item.value);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length > 0 ? total / values.length : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;

    return {
      timeSeries,
      summary: { total, average, min, max },
    };
  }
}
