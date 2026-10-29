import { NotFoundError, BadRequestError } from '../../shared/errors/app-error';
import { ICustomerRepository } from './customers.repository';
import { CreateCustomerInput, UpdateCustomerInput, Customer, mapCustomerRow } from './customers.types';
import { env } from '../../config/env';

/**
 * Estados terminales de una orden de trabajo.
 * Solo estos estados permiten eliminar un cliente.
 * Basado en ORDER_STATUSES de work-orders.types.ts
 */
const TERMINAL_ORDER_STATUSES = ['ENTREGADO'] as const;

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

  /**
   * Elimina un cliente.
   * 
   * REGLA DE NEGOCIO: No se puede eliminar un cliente con órdenes activas.
   * 
   * LIMITACIÓN CON RDS: Cuando DATA_PROVIDER=postgres, las órdenes de trabajo
   * permanecen en Supabase y no podemos verificar si el cliente tiene órdenes
   * activas. En este caso, por seguridad, se RECHAZA la eliminación para evitar
   * borrar clientes que podrían tener relaciones en Supabase.
   */
  async delete(id: string): Promise<void> {
    await this.getById(id);
    
    // Si usamos RDS para clientes, no podemos verificar órdenes en Supabase
    if (env.dataProvider === 'postgres') {
      throw new BadRequestError(
        'No se puede eliminar clientes cuando DATA_PROVIDER=postgres. ' +
        'Las órdenes de trabajo permanecen en Supabase y no es posible verificar ' +
        'si el cliente tiene órdenes activas. Esta es una limitación conocida ' +
        'de la arquitectura híbrida RDS/Supabase.'
      );
    }
    
    // En Supabase, verificar órdenes activas normalmente
    const workOrders = await this.repository.listWorkOrders(id);
    const activeOrders = workOrders.filter(
      (wo) => !TERMINAL_ORDER_STATUSES.includes(wo.current_status as typeof TERMINAL_ORDER_STATUSES[number])
    );
    
    if (activeOrders.length > 0) {
      throw new BadRequestError(
        `No se puede eliminar un cliente con órdenes activas. ` +
        `Este cliente tiene ${activeOrders.length} orden(es) en proceso.`
      );
    }
    
    await this.repository.delete(id);
  }

  async listWorkOrders(customerId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    await this.getById(customerId);
    return this.repository.listWorkOrders(customerId);
  }
}
