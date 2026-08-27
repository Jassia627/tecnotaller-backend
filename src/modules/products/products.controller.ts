import { Request, Response } from 'express';
import { ProductService } from './products.service';
import { createProductSchema, inventoryMovementSchema, updateProductSchema } from './products.types';

export class ProductController {
  constructor(private readonly service: ProductService) {}

  async listPublic(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.listPublic({ page, pageSize });
    res.json(result);
  }

  async listAll(req: Request, res: Response): Promise<void> {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.service.listAll({ page, pageSize });
    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const product = await this.service.getById(req.params.id!);
    res.json(product);
  }

  async create(req: Request, res: Response): Promise<void> {
    const input = createProductSchema.parse(req.body);
    const product = await this.service.create(input);
    res.status(201).json(product);
  }

  async update(req: Request, res: Response): Promise<void> {
    const input = updateProductSchema.parse(req.body);
    const product = await this.service.update(req.params.id!, input);
    res.json(product);
  }

  async changeAvailability(req: Request, res: Response): Promise<void> {
    const { active } = req.body as { active: boolean };
    const product = await this.service.changeAvailability(req.params.id!, active);
    res.json(product);
  }

  async listMovements(req: Request, res: Response): Promise<void> {
    const movements = await this.service.listMovements(req.params.id!);
    res.json({ items: movements });
  }

  async registerMovement(req: Request, res: Response): Promise<void> {
    const input = inventoryMovementSchema.parse(req.body);
    const product = await this.service.registerMovement(req.params.id!, input, req.user!.id);
    res.status(201).json(product);
  }

  async listLowStock(req: Request, res: Response): Promise<void> {
    const threshold = Number(req.query.threshold ?? 10);
    const result = await this.service.listLowStock(threshold);
    res.json(result);
  }
}
