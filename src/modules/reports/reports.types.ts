export interface DateRange {
  from?: string;
  to?: string;
}

// Contrato Strategy: cada reporte implementa su propio algoritmo de generación
export interface ReportGenerator {
  readonly type: ReportType;
  generate(filters: DateRange): Promise<unknown>;
}

export type ReportType = 'services' | 'inventory' | 'orders-by-status' | 'sales' | 'revenue' | 'trends';
