import { Request, Response } from 'express';
import { AppointmentService } from './appointments.service';
import { AppointmentStatus, completeAppointmentSchema, convertToOrderSchema, createAppointmentSchema } from './appointments.types';

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

  async getById(req: Request, res: Response): Promise<void> {
    const appointment = await this.service.getById(req.params.id!);
    res.json(appointment);
  }

  async confirm(req: Request, res: Response): Promise<void> {
    const appointment = await this.service.confirm(req.params.id!);
    res.json(appointment);
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const appointment = await this.service.cancel(req.params.id!);
    res.json(appointment);
  }

  /**
   * Completa una cita cuando el servicio se realiza en el momento
   * PATCH /api/v1/appointments/:id/complete
   */
  async complete(req: Request, res: Response): Promise<void> {
    const input = completeAppointmentSchema.parse(req.body);
    const appointment = await this.service.complete(req.params.id!, input);
    res.json(appointment);
  }

  /**
   * Convierte una cita confirmada en una orden de servicio
   * POST /api/v1/appointments/:id/convert
   * Es idempotente: si ya existe una orden, la devuelve
   */
  async convertToOrder(req: Request, res: Response): Promise<void> {
    const input = convertToOrderSchema.parse(req.body);
    const result = await this.service.convertToOrder(req.params.id!, input);
    res.status(201).json(result);
  }
}
