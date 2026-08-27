import { BadRequestError } from '../../shared/errors/app-error';
import { IReportRepository } from './reports.repository';
import { DateRange, ReportGenerator, ReportType } from './reports.types';
import {
  InventoryReportGenerator,
  OrdersByStatusReportGenerator,
  ServicesReportGenerator,
  SalesReportGenerator,
  RevenueReportGenerator,
  TrendsReportGenerator,
} from './reports.generators';

export class ReportService {
  private readonly generators: Map<ReportType, ReportGenerator>;

  constructor(repository: IReportRepository) {
    this.generators = new Map<ReportType, ReportGenerator>([
      ['services', new ServicesReportGenerator(repository)],
      ['inventory', new InventoryReportGenerator(repository)],
      ['orders-by-status', new OrdersByStatusReportGenerator(repository)],
      ['sales', new SalesReportGenerator(repository)],
      ['revenue', new RevenueReportGenerator(repository)],
      ['trends', new TrendsReportGenerator(repository)],
    ]);
  }

  async generate(type: ReportType, filters: DateRange): Promise<unknown> {
    const generator = this.generators.get(type);
    if (!generator) throw new BadRequestError(`Tipo de reporte no soportado: ${type}`);
    return generator.generate(filters);
  }
}
