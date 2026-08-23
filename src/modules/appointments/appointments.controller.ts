import { Request, Response } from 'express';
import { AppointmentService } from './appointments.service';
import { AppointmentStatus, createAppointmentSchema } from './appointments.types';

export class AppointmentController {
  constructor(private readonly service: AppointmentService) {}

  async create(req: Request, res: Response): Promise<void> {
    const input = createAppointmentSchema.parse(req.body);
    const appointment = await this.service.create(input);
    res.status(201).json(appointment);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { from, to, status } = req.query as {
      from?: string;
      to?: string;
      status?: AppointmentStatus;
    };
    const items = await this.service.list({ from, to, status });
    res.json({ items });
  }

  async confirm(req: Request, res: Response): Promise<void> {
    const appointment = await this.service.confirm(req.params.id!);
    res.json(appointment);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const appointment = await this.service.cancel(req.params.id!);
    res.json(appointment);
  }
}
