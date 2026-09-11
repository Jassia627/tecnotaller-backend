import { Request, Response } from 'express';
import { ReportService } from './reports.service';
import { ReportType, dateRangeSchema } from './reports.types';

export class ReportController {
  constructor(private readonly service: ReportService) {}

  async generate(req: Request, res: Response): Promise<void> {
    const type = req.params.type as ReportType;
    
    // Validar y parsear query params con Zod
    const filters = dateRangeSchema.parse({
      from: req.query.from,
      to: req.query.to
    });
    
    const report = await this.service.generate(type, filters);
    res.json({ type, report });
  }
}
