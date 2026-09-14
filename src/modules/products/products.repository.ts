import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../../config/supabase';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error';
import {
  POSTGRES_ERROR_CODES,
  POSTGREST_ERROR_CODES,
  DB_ERROR_PATTERNS,
  isValidUuid,
} from '../../shared/constants/db-errors';
import {
  CreateProductInput,
  InventoryMovement,
  InventoryMovementInput,
  ProductRow,
  UpdateProductInput,
} from './products.types';

const DB_TABLES = {
  PRODUCTS: 'products',
  INVENTORY_MOVEMENTS: 'inventory_movements',
} as const;

const DB_RPC = {
  REGISTER_INVENTORY_MOVEMENT: 'register_inventory_movement',
} as const;

const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT',
} as const;

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
  private readonly db: SupabaseClient;

  /**
   * Cumplimiento del Principio de Inversión de Dependencias (DIP):
   * El cliente de base de datos se inyecta por el constructor en lugar de acoplarse
   * de forma estática. Mantiene defaultSupabase como valor predeterminado para retrocompatibilidad.
   */
  constructor(db: SupabaseClient = defaultSupabase) {
    this.db = db;
  }

  async list(options: { page: number; pageSize: number; includeInactive?: boolean }): Promise<{ rows: ProductRow[]; total: number }> {
    const { page, pageSize, includeInactive } = options;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from(DB_TABLES.PRODUCTS)
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
    const { data, error } = await this.db
      .from(DB_TABLES.PRODUCTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (
        error.code === POSTGREST_ERROR_CODES.ROW_NOT_FOUND ||
        error.code === POSTGRES_ERROR_CODES.INVALID_TEXT_REPRESENTATION
      ) {
        return null;
      }
      throw error;
    }
    return data as ProductRow;
  }

  async create(input: CreateProductInput): Promise<ProductRow> {
    const { data, error } = await this.db
      .from(DB_TABLES.PRODUCTS)
      .insert({
        sku: input.sku,
        name: input.name,
        description: input.description,
        image_url: input.imageUrl,
        category_id: input.categoryId,
        brand: input.brand || 'Genérico',
        color: input.color ?? null,
        specs: input.specs ?? null,
        purchase_price: input.purchasePrice,
        sale_price: input.salePrice,
        stock: input.stock,
        active: true,
      })
      .select('*')
      .single();

    if (error) {
      const isUniqueSkuError =
        error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION &&
        DB_ERROR_PATTERNS.SKU_UNIQUE_VIOLATION.some((p) => p.test(error.message ?? ''));

      if (isUniqueSkuError) {
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
      ...(input.brand !== undefined && { brand: input.brand }),
      ...(input.color !== undefined && { color: input.color ?? null }),
      ...(input.specs !== undefined && { specs: input.specs ?? null }),
      ...(input.purchasePrice !== undefined && { purchase_price: input.purchasePrice }),
      ...(input.salePrice !== undefined && { sale_price: input.salePrice }),
    };
    if (Object.keys(patch).length === 0) {
      throw new BadRequestError('No hay campos para actualizar');
    }
    const { data, error } = await this.db
      .from(DB_TABLES.PRODUCTS)
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async setActive(id: string, active: boolean): Promise<ProductRow> {
    const { data, error } = await this.db
      .from(DB_TABLES.PRODUCTS)
      .update({ active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as ProductRow;
  }

  async listMovements(productId: string): Promise<InventoryMovement[]> {
    const { data, error } = await this.db
      .from(DB_TABLES.INVENTORY_MOVEMENTS)
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      if (
        error.code === POSTGRES_ERROR_CODES.INVALID_TEXT_REPRESENTATION ||
        error.code === POSTGREST_ERROR_CODES.ROW_NOT_FOUND
      ) {
        return [];
      }
      throw error;
    }
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
    const validUserId = isValidUuid(userId) ? userId : null;

    // 1. Validación de reglas de negocio a nivel de aplicación (evita dependencia frágil de strings de error del motor de BD)
    const product = await this.findById(productId);
    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (input.type === MOVEMENT_TYPES.OUT && product.stock < input.quantity) {
      throw new BadRequestError('Stock insuficiente para la salida solicitada');
    }

    if (input.type !== MOVEMENT_TYPES.IN && input.type !== MOVEMENT_TYPES.OUT) {
      throw new BadRequestError('Tipo de movimiento inválido');
    }

    // 2. Intentar RPC transaccional atómica en Supabase
    const { error: rpcError } = await this.db.rpc(DB_RPC.REGISTER_INVENTORY_MOVEMENT, {
      p_product_id: productId,
      p_type: input.type,
      p_quantity: input.quantity,
      p_reason: input.reason,
      p_user_id: validUserId,
    });

    if (!rpcError) {
      const updated = await this.findById(productId);
      if (!updated) throw new NotFoundError('Producto no encontrado');
      return updated;
    }

    // 3. Fallback controlado si el RPC no existe aún en el motor (código de función no encontrada)
    const isRpcMissing =
      rpcError.code === POSTGREST_ERROR_CODES.FUNCTION_NOT_FOUND ||
      rpcError.code === POSTGRES_ERROR_CODES.UNDEFINED_FUNCTION;

    if (isRpcMissing) {
      let newStock = product.stock;
      if (input.type === MOVEMENT_TYPES.OUT) {
        newStock -= input.quantity;
      } else {
        newStock += input.quantity;
      }

      const { data: updatedProduct, error: updateError } = await this.db
        .from(DB_TABLES.PRODUCTS)
        .update({ stock: newStock })
        .eq('id', productId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Insertar en historial de movimientos si la tabla existe
      const { error: insertError } = await this.db.from(DB_TABLES.INVENTORY_MOVEMENTS).insert({
        product_id: productId,
        type: input.type,
        quantity: input.quantity,
        reason: input.reason,
        user_id: validUserId,
      });

      if (insertError) {
        console.warn('No se pudo guardar el registro en inventory_movements:', insertError.message);
      }

      return updatedProduct as ProductRow;
    }

    // 4. Manejo desacoplado ante condiciones de carrera en base de datos
    this.handleRpcMovementError(rpcError);
  }

  private handleRpcMovementError(error: { code?: string; message?: string }): never {
    const message = error.message ?? '';

    if (DB_ERROR_PATTERNS.INSUFFICIENT_STOCK.some((pattern) => pattern.test(message))) {
      throw new BadRequestError('Stock insuficiente para la salida solicitada');
    }

    if (DB_ERROR_PATTERNS.PRODUCT_NOT_FOUND.some((pattern) => pattern.test(message))) {
      throw new NotFoundError('Producto no encontrado');
    }

    throw error;
  }

  async findByStockThreshold(threshold: number): Promise<ProductRow[]> {
    const { data, error } = await this.db
      .from(DB_TABLES.PRODUCTS)
      .select('*')
      .lte('stock', threshold)
      .eq('active', true)
      .order('stock', { ascending: true });

    if (error) throw error;
    return (data as ProductRow[]) ?? [];
  }
}
