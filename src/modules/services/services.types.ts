import { z } from 'zod';

export interface ServiceRow {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
  created_at: string;
}

export class TechnicalService {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly description: string,
    readonly price: number,
    private _active: boolean,
  ) {}

  static fromRow(row: ServiceRow): TechnicalService {
    return new TechnicalService(row.id, row.name, row.description, row.price, row.active);
  }

  get active(): boolean {
    return this._active;
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
      name: this.name,
      description: this.description,
      price: this.price,
      active: this._active,
    };
  }
}

export const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price: z.number().min(0),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
