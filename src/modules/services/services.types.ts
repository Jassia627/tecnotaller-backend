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

export const quoteModifiersSchema = z
  .object({
    isExpress: z.boolean().optional(),
    expressSurchargePercentage: z.number().min(0).max(100).optional(),
    extendedWarrantyMonths: z.number().int().positive().optional(),
    warrantyCost: z.number().min(0).optional(),
    homeDelivery: z
      .object({
        address: z.string().min(1),
        deliveryFee: z.number().min(0).optional(),
      })
      .optional(),
    dataBackup: z
      .object({
        limitGb: z.number().positive().optional(),
        backupFee: z.number().min(0).optional(),
      })
      .optional(),
  })
  .optional();

export const quoteServiceSchema = z
  .object({
    serviceIds: z.array(z.string().uuid()).optional().default([]),
    customItems: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional().default(''),
          price: z.number().min(0),
          estimatedDurationMinutes: z.number().min(0).optional().default(30),
        }),
      )
      .optional()
      .default([]),
    bundleName: z.string().optional(),
    bundleDescription: z.string().optional(),
    bundleDiscountPercentage: z.number().min(0).max(100).optional().default(0),
    modifiers: quoteModifiersSchema,
  })
  .refine((data) => data.serviceIds.length > 0 || data.customItems.length > 0, {
    message: 'Debe incluir al menos un servicio existente o un servicio personalizado.',
  });

export type QuoteServiceInput = z.infer<typeof quoteServiceSchema>;

