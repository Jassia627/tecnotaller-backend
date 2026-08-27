import { supabase } from '../../config/supabase';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error';
import {
  CreateProductInput,
  InventoryMovement,
  InventoryMovementInput,
  Product,
  ProductRow,
  UpdateProductInput,
} from './products.types';

export interface IProductRepository {
  list(options: { page: number; pageSize: number; includeInactive?: boolean }): Promise<{ rows: ProductRow[]; total: number }>;
  findById(id: string): Promise<ProductRow | null>;
  create(input: CreateProductInput): Promise<ProductRow>;
  update(id: string, input: UpdateProductInput): Promise<ProductRow>;
  setActive(id: string, active: boolean): Promise<ProductRow>;
  listMovements(productId: string): Promise<InventoryMovement[]>;
  registerMovement(productId: string, input: InventoryMovementInput, userId: string): Promise<ProductRow>;
  findByStockThreshold(threshold: number): Promise<ProductRow[]>;
}

export class ProductRepository implements IProductRepository {
  async list(options: { page: number; pageSize: number; includeInactive?: boolean }): Promise<{ rows: ProductRow[]; total: number }> {
    const { page, pageSize, includeInactive } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows: (data as ProductRow[]) ?? [], total: count ?? 0 };
  }

  async findById(id: string): Promise<ProductRow | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as ProductRow;
  }

  async create(input: CreateProductInput): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku: input.sku,
        name: input.name,
        description: input.description,
        image_url: input.imageUrl,
        category_id: input.categoryId,
        purchase_price: input.purchasePrice,
        sale_price: input.salePrice,
        stock: input.stock,
        active: true,
      })
      .select('*')
      .single();

    if (error) {
      // Supabase retorna código 23505 para violación de única
      if (error.code === '23505' && error.message?.includes('sku')) {
        throw new ConflictError('El SKU ya existe');
      }
      throw error;
    }
    return data as ProductRow;
  }

  async update(id: string, input: UpdateProductInput): Promise<ProductRow> {
    const patch = {
      ...(input.sku !== undefined && { sku: input.sku }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.imageUrl !== undefined && { image_url: input.imageUrl }),
      ...(input.categoryId !== undefined && { category_id: input.categoryId }),
      ...(input.purchasePrice !== undefined && { purchase_price: input.purchasePrice }),
      ...(input.salePrice !== undefined && { sale_price: input.salePrice }),
    };
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No hay campos para actualizar');
    }
    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async setActive(id: string, active: boolean): Promise<ProductRow> {
    const { data, error } = await supabase
      .from('products')
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async listMovements(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((m) => ({
      id: m.id,
      productId: m.product_id,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      userId: m.user_id,
      createdAt: m.created_at,
    }));
  }

  async registerMovement(productId: string, input: InventoryMovementInput, userId: string): Promise<ProductRow> {
    // RPC transaccional: actualiza stock + inserta movimiento atómicamente (RNF-14)
    const { data, error } = await supabase.rpc('register_inventory_movement', {
      p_product_id: productId,
      p_type: input.type,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_user_id: userId,
    });

    if (error) {
      const msg = error.message ?? '';
      if (msg.includes('insuficiente') || msg.includes('insufficient')) {
        throw new BadRequestError('Stock insuficiente para la salida solicitada');
      }
      if (msg.includes('Producto no encontrado')) {
        throw new NotFoundError('Producto no encontrado');
      }
      throw error;
    }

    const updated = await this.findById(productId);
    if (!updated) throw new NotFoundError('Producto no encontrado');
    return updated;
  }

  async findByStockThreshold(threshold: number): Promise<ProductRow[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .lte('stock', threshold)
      .eq('active', true)
      .order('stock', { ascending: true });

    if (error) throw error;
    return (data as ProductRow[]) ?? [];
  }
}
