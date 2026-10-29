/**
 * Factory para crear la implementación correcta del repositorio de clientes
 * según el proveedor de datos configurado en las variables de entorno.
 * 
 * - DATA_PROVIDER=supabase (default): usa Supabase Cloud
 * - DATA_PROVIDER=postgres: usa PostgreSQL directo (Amazon RDS)
 */
import { env } from '../../config/env';
import { ICustomerRepository, CustomerRepository } from './customers.repository';
import { PostgresCustomerRepository } from './customers.repository.postgres';
import { logger } from '../../shared/utils/logger';

/**
 * Crea una instancia del repositorio de clientes según el proveedor configurado.
 * 
 * @returns Implementación de ICustomerRepository correspondiente al proveedor
 * @throws Error si el proveedor es 'postgres' y la configuración de RDS es inválida
 */
export function createCustomerRepository(): ICustomerRepository {
  const provider = env.dataProvider;

  if (provider === 'postgres') {
    logger.info('Usando PostgresCustomerRepository (Amazon RDS)');
    return new PostgresCustomerRepository();
  }

  // Default: Supabase
  logger.info('Usando CustomerRepository (Supabase Cloud)');
  return new CustomerRepository();
}
