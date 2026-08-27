import { supabase } from '../../config/supabase';

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  type: 'product' | 'part';
}

export interface IInventoryRepository {
  findLowStockProducts(threshold: number): Promise<LowStockItem[]>;
  findLowStockParts(threshold: number): Promise<LowStockItem[]>;
}

export class InventoryRepository implements IInventoryRepository {
  async findLowStockProducts(threshold: number): Promise<LowStockItem[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock')
      .lte('stock', threshold)
      .eq('active', true)
      .order('stock', { ascending: true });

    if (error) throw error;
    return (
      (data as { id: string; name: string; sku: string; stock: number }[])?.map((item) => ({
        ...item,
        type: 'product' as const,
      })) ?? []
    );
  }

  async findLowStockParts(threshold: number): Promise<LowStockItem[]> {
    const { data, error } = await supabase
      .from('parts')
      .select('id, name, sku, stock')
      .lte('stock', threshold)
      .eq('active', true)
      .order('stock', { ascending: true });

    if (error) throw error;
    return (
      (data as { id: string; name: string; sku: string; stock: number }[])?.map((item) => ({
        ...item,
        type: 'part' as const,
      })) ?? []
    );
  }
}
