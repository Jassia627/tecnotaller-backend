import { IReportRepository } from './reports.repository';
import { DateRange, ReportGenerator, ReportType } from './reports.types';

export class ServicesReportGenerator implements ReportGenerator {
  readonly type: ReportType = 'services';
  constructor(private readonly repository: IReportRepository) {}

  async generate(filters: DateRange): Promise<unknown> {
    return this.repository.countServices(filters);
  }
}

export class InventoryReportGenerator implements ReportGenerator {
  readonly type: ReportType = 'inventory';
  constructor(private readonly repository: IReportRepository) {}

  async generate(_filters: DateRange): Promise<unknown> {
    return this.repository.inventorySnapshot();
  }
}

export class OrdersByStatusReportGenerator implements ReportGenerator {
  readonly type: ReportType = 'orders-by-status';
  constructor(private readonly repository: IReportRepository) {}

  async generate(filters: DateRange): Promise<unknown> {
    return this.repository.ordersByStatus(filters);
  }
}
