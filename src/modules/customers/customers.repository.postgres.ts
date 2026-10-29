/**
 * Implementación del repositorio de clientes para PostgreSQL (Amazon RDS).
 * Cumple con la misma interfaz ICustomerRepository que la implementación de Supabase.
 */
import { Pool } from 'pg';
import { getPostgresPool } from '../../config/postgres';
import { ICustomerRepository } from './customers.repository';
import { CreateCustomerInput, UpdateCustomerInput, CustomerRow } from './customers.types';

export class PostgresCustomerRepository implements ICustomerRepository {
  private get pool(): Pool {
    return getPostgresPool();
  }

  async list(options: { page: number; pageSize: number }): Promise<{ rows: CustomerRow[]; total: number }> {
    const offset = (options.page - 1) * options.pageSize;
    const limit = options.pageSize;

    // Consulta para obtener los registros paginados
    const dataQuery = `
      SELECT id, email, full_name, phone, created_at
      FROM customers
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    // Consulta para obtener el total de registros
    const countQuery = `SELECT COUNT(*)::int as total FROM customers`;

    const [dataResult, countResult] = await Promise.all([
      this.pool.query<CustomerRow>(dataQuery, [limit, offset]),
      this.pool.query<{ total: number }>(countQuery),
    ]);

    return {
      rows: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    };
  }

  async findById(id: string): Promise<CustomerRow | null> {
    const query = `
      SELECT id, email, full_name, phone, created_at
      FROM customers
      WHERE id = $1
    `;

    const result = await this.pool.query<CustomerRow>(query, [id]);
    return result.rows[0] ?? null;
  }

  /**
   * Busca un cliente por teléfono normalizado.
   * Mantiene la misma lógica de normalización que la implementación de Supabase.
   */
  async findByPhone(phone: string): Promise<CustomerRow | null> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!normalizedPhone) return null;

    // Buscar clientes con teléfono no nulo
    const query = `
      SELECT id, email, full_name, phone, created_at
      FROM customers
      WHERE phone IS NOT NULL
    `;

    const result = await this.pool.query<CustomerRow>(query);

    // Buscar coincidencia exacta con teléfono normalizado
    for (const customer of result.rows) {
      if (customer.phone && this.normalizePhone(customer.phone) === normalizedPhone) {
        return customer;
      }
    }

    return null;
  }

  /**
   * Normaliza un número de teléfono para comparación.
   * Remueve espacios, guiones, paréntesis y prefijos de país.
   * Misma lógica que la implementación de Supabase.
   */
  private normalizePhone(phone: string): string {
    // Remover todo excepto dígitos
    let normalized = phone.replace(/\D/g, '');

    // Remover prefijo de Colombia si existe (57)
    if (normalized.startsWith('57') && normalized.length > 10) {
      normalized = normalized.substring(2);
    }

    // Remover prefijo internacional genérico
    if (normalized.startsWith('00')) {
      normalized = normalized.substring(2);
    }

    return normalized;
  }

  async create(input: CreateCustomerInput): Promise<CustomerRow> {
    const query = `
      INSERT INTO customers (email, full_name, phone)
      VALUES ($1, $2, $3)
      RETURNING id, email, full_name, phone, created_at
    `;

    const values = [
      input.email ?? null,
      input.fullName,
      input.phone ?? null,
    ];

    const result = await this.pool.query<CustomerRow>(query, values);
    
    if (!result.rows[0]) {
      throw new Error('Error al crear el cliente');
    }
    
    return result.rows[0];
  }

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerRow> {
    // Construir la consulta dinámicamente según los campos proporcionados
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      values.push(input.email ?? null);
    }
    if (input.fullName !== undefined) {
      setClauses.push(`full_name = $${paramIndex++}`);
      values.push(input.fullName);
    }
    if (input.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(input.phone ?? null);
    }

    // Si no hay campos para actualizar, simplemente retornar el registro actual
    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Cliente no encontrado');
      }
      return existing;
    }

    values.push(id); // El ID siempre es el último parámetro

    const query = `
      UPDATE customers
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, full_name, phone, created_at
    `;

    const result = await this.pool.query<CustomerRow>(query, values);

    if (!result.rows[0]) {
      throw new Error('Cliente no encontrado');
    }

    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const query = `DELETE FROM customers WHERE id = $1`;
    await this.pool.query(query, [id]);
  }

  /**
   * Lista las órdenes de trabajo de un cliente.
   * NOTA: Esta operación consulta work_orders que permanece en Supabase.
   * En el entorno AWS con DATA_PROVIDER=postgres, los clientes están en RDS
   * pero las órdenes siguen en Supabase, por lo que esta relación NO funcionará.
   * Este método lanza un error controlado para documentar la limitación.
   */
  async listWorkOrders(customerId: string): Promise<{ id: string; guide_number: string; current_status: string }[]> {
    // LIMITACIÓN DOCUMENTADA:
    // Cuando DATA_PROVIDER=postgres, los clientes están en RDS pero work_orders
    // permanece en Supabase. No podemos hacer JOIN entre ambas bases de datos.
    // Retornamos array vacío para no romper la API, pero documentamos la limitación.
    console.warn(
      `[PostgresCustomerRepository] listWorkOrders llamado para cliente ${customerId}. ` +
      `Las órdenes de trabajo permanecen en Supabase y no están sincronizadas con RDS.`
    );
    return [];
  }
}
