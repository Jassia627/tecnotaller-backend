import { z } from 'zod';

export interface DateRange {
  from?: string;
  to?: string;
}

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  { message: '"from" debe ser menor o igual a "to"' }
);

export type ValidatedDateRange = z.infer<typeof dateRangeSchema>;

// Contrato Strategy: cada reporte implementa su propio algoritmo de generación
export interface ReportGenerator {
  readonly type: ReportType;
  generate(filters: DateRange): Promise<unknown>;
}

export type ReportType = 'services' | 'inventory' | 'orders-by-status' | 'sales' | 'revenue' | 'trends';
