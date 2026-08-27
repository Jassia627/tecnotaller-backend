import { Request, Response } from 'express';
import { CustomerService } from './customers.service';
import { createCustomerSchema, updateCustomerSchema } from './customers.types';

export class CustomerController {
  constructor(private readonly service: CustomerService) {}

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.list({ page, pageSize });
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const customer = await this.service.getById(req.params.id!);
    res.json(customer);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createCustomerSchema.parse(req.body);
    const customer = await this.service.create(input);
    res.status(201).json(customer);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateCustomerSchema.parse(req.body);
    const customer = await this.service.update(req.params.id!, input);
    res.json(customer);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await this.service.delete(req.params.id!);
    res.status(204).send();
  }

  async listWorkOrders(req: Request, res: Response): Promise<void> {
    const items = await this.service.listWorkOrders(req.params.id!);
    res.json({ items });
  }
}
