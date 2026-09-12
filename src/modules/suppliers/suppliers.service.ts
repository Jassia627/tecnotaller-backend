import { NotFoundError } from '../../shared/errors/app-error';
import { ISupplierRepository } from './suppliers.repository';
import { CreateSupplierInput, UpdateSupplierInput, Supplier, mapSupplierRow } from './suppliers.types';

export class SupplierService {
  constructor(private readonly repository: ISupplierRepository) {}

  async list(options: { page: number; pageSize: number }): Promise<{ items: Supplier[]; total: number }> {
    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(mapSupplierRow), total };
  }

  async getById(id: string): Promise<Supplier> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Proveedor no encontrado');
    return mapSupplierRow(row);
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const row = await this.repository.create(input);
    return mapSupplierRow(row);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    await this.getById(id);
    const row = await this.repository.update(id, input);
    return mapSupplierRow(row);
  }

  async delete(id: string): Promise<Supplier> {
    await this.getById(id);
    const row = await this.repository.changeStatus(id, false);
    return mapSupplierRow(row);
  }
}
