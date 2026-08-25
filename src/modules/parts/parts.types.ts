import { z } from 'zod';

export interface PartRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  purchase_price: number;
  sale_price: number;
  created_at: string;
}

export class Part {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly sku: string,
    private _stock: number,
    readonly purchasePrice: number,
    readonly salePrice: number,
  ) {}

  static fromRow(row: PartRow): Part {
    return new Part(row.id, row.name, row.sku, row.stock, row.purchase_price, row.sale_price);
  }

  get stock(): number {
    return this._stock;
  }

  discount(quantity: number): void {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a cero');
    if (quantity > this._stock) throw new Error('Stock de repuesto insuficiente');
    this._stock -= quantity;
  }

  restock(quantity: number): void {
    if (quantity <= 0) throw new Error('La cantidad debe ser mayor a cero');
    this._stock += quantity;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sku: this.sku,
      stock: this._stock,
      purchasePrice: this.purchasePrice,
      salePrice: this.salePrice,
    };
  }
}

export const createPartSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  stock: z.number().int().min(0),
  purchasePrice: z.number().min(0),
  salePrice: z.number().min(0),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;

export const updatePartSchema = createPartSchema.partial();
export type UpdatePartInput = z.infer<typeof updatePartSchema>;

export const assignPartSchema = z.object({
  partId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export type AssignPartInput = z.infer<typeof assignPartSchema>;
