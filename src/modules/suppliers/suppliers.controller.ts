import { Request, Response } from 'express';
import { SupplierService } from './suppliers.service';
import { createSupplierSchema, updateSupplierSchema } from './suppliers.types';
import { BadRequestError } from '../../shared/errors/app-error';

export class SupplierController {
  constructor(private readonly service: SupplierService) {}

  async list(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);

    if (isNaN(page) || isNaN(pageSize) || page < 1 || pageSize < 1) {
      throw new BadRequestError('page y pageSize deben ser números positivos');
    }

    const result = await this.service.list({ page, pageSize });
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const supplier = await this.service.getById(req.params.id!);
    res.json(supplier);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createSupplierSchema.parse(req.body);
    const supplier = await this.service.create(input);
    res.status(201).json(supplier);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateSupplierSchema.parse(req.body);
    const supplier = await this.service.update(req.params.id!, input);
    res.json(supplier);
  }

  async delete(req: Request, res: Response): Promise<void> {
    const supplier = await this.service.delete(req.params.id!);
    res.json(supplier);
  }
}
