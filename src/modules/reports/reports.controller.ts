import { Request, Response } from 'express';
import { ReportService } from './reports.service';
import { ReportType } from './reports.types';

export class ReportController {
  constructor(private readonly service: ReportService) {}

  async generate(req: Request, res: Response): Promise<void> {
    const type = req.params.type as ReportType;
    const { from, to } = req.query as { from?: string; to?: string };
    const report = await this.service.generate(type, { from, to });
    res.json({ type, report });
  }
}
