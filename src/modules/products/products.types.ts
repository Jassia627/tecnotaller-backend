import { z } from 'zod';
import { Paginated } from '../../shared/types';

export type InventoryMovementType = 'IN' | 'OUT';

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  description: string;
  image_url: string | null;
  category_id: string | null;
  purchase_price: number;
  sale_price: number;
  stock: number;
  active: boolean;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  userId: string;
  createdAt: string;
}

export class Product {
  private constructor(
    readonly id: string,
    readonly sku: string,
    readonly name: string,
    readonly description: string,
    readonly imageUrl: string | null,
    readonly categoryId: string | null,
    readonly purchasePrice: number,
    readonly salePrice: number,
    private _stock: number,
    private _active: boolean,
  ) {}

  static fromRow(row: ProductRow): Product {
    return new Product(
      row.id,
      row.sku,
      row.name,
      row.description,
      row.image_url,
      row.category_id,
      row.purchase_price,
      row.sale_price,
      row.stock,
      row.active,
    );
  }

  get stock(): number {
    return this._stock;
  }

  get active(): boolean {
    return this._active;
  }

  get available(): boolean {
    return this._active && this._stock > 0;
  }

  addStock(quantity: number): void {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a cero');
    this._stock += quantity;
  }

  removeStock(quantity: number): void {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a cero');
    if (quantity > this._stock) throw new Error('Stock insuficiente');
    this._stock -= quantity;
  }

  activate(): void {
    this._active = true;
  }

  deactivate(): void {
    this._active = false;
  }

  toJSON() {
    return {
      id: this.id,
      sku: this.sku,
      name: this.name,
      description: this.description,
      imageUrl: this.imageUrl,
      categoryId: this.categoryId,
      purchasePrice: this.purchasePrice,
      salePrice: this.salePrice,
      stock: this._stock,
      active: this._active,
      available: this.available,
    };
  }
}

const emptyToNull = (v: unknown) => (v === '' ? null : v);

export const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(''),
  imageUrl: z.preprocess(emptyToNull, z.string().url().nullable().optional()),
  categoryId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  purchasePrice: z.number().min(0),
  salePrice: z.number().min(0),
  stock: z.number().int().min(0),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const inventoryMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().min(1),
  reason: z.string().min(1),
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;

export interface ProductListResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}
