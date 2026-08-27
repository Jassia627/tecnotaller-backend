import { NotFoundError } from '../../shared/errors/app-error';
import { IProductRepository } from './products.repository';
import {
  CreateProductInput,
  InventoryMovement,
  InventoryMovementInput,
  Product,
  UpdateProductInput,
} from './products.types';

export class ProductService {
  constructor(private readonly repository: IProductRepository) {}

  async listPublic(options: { page: number; pageSize: number }): Promise<{ items: Product[]; total: number }> {
    const { rows, total } = await this.repository.list({ ...options, includeInactive: false });
    return { items: rows.map(Product.fromRow), total };
  }

  async listAll(options: { page: number; pageSize: number }): Promise<{ items: Product[]; total: number }> {
    const { rows, total } = await this.repository.list({ ...options, includeInactive: true });
    return { items: rows.map(Product.fromRow), total };
  }

  async getById(id: string): Promise<Product> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Producto no encontrado');
    return Product.fromRow(row);
  }

  async create(input: CreateProductInput): Promise<Product> {
    const row = await this.repository.create(input);
    return Product.fromRow(row);
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    await this.getById(id);
    const row = await this.repository.update(id, input);
    return Product.fromRow(row);
  }

  async changeAvailability(id: string, active: boolean): Promise<Product> {
    const product = await this.getById(id);
    if (active) product.activate();
    else product.deactivate();
    const row = await this.repository.setActive(id, active);
    return Product.fromRow(row);
  }

  async listMovements(productId: string): Promise<InventoryMovement[]> {
    await this.getById(productId);
    return this.repository.listMovements(productId);
  }

  async registerMovement(productId: string, input: InventoryMovementInput, userId: string): Promise<Product> {
    const row = await this.repository.registerMovement(productId, input, userId);
    return Product.fromRow(row);
  }

  async listLowStock(threshold: number): Promise<{ items: Product[] }> {
    const rows = await this.repository.findByStockThreshold(threshold);
    return { items: rows.map(Product.fromRow) };
  }
}
