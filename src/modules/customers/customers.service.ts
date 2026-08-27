import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { ICustomerRepository } from './customers.repository';
import { CreateCustomerInput, UpdateCustomerInput, Customer, mapCustomerRow } from './customers.types';

export class CustomerService {
  constructor(private readonly repository: ICustomerRepository) {}

  async list(options: { page: number; pageSize: number }): Promise<{ items: Customer[]; total: number }> {
    const { rows, total } = await this.repository.list(options);
    return { items: rows.map(mapCustomerRow), total };
  }

  async getById(id: string): Promise<Customer> {
    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundError('Cliente no encontrado');
    return mapCustomerRow(row);
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    return mapCustomerRow(await this.repository.create(input));
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    await this.getById(id);
    return mapCustomerRow(await this.repository.update(id, input));
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    const workOrders = await this.repository.listWorkOrders(id);
    const activeOrders = workOrders.filter(
      (wo) => wo.current_status !== 'COMPLETADO' && wo.current_status !== 'CANCELADO'
    );
    if (activeOrders.length > 0) {
      throw new BadRequestError('No se puede eliminar un cliente con órdenes activas');
    }
    await this.repository.delete(id);
  }

  async listWorkOrders(customerId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    await this.getById(customerId);
    return this.repository.listWorkOrders(customerId);
  }
}
