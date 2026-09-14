import { IAuthorizationFilter } from './authorization-filter.interface';

/**
 * Estrategia de autorización para Clientes
 * Los clientes solo ven sus propias órdenes (filtradas por customerId)
 */
export class ClientAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: Record<string, any>): void {
    // Los clientes solo ven sus propias órdenes
    if (!options.customerId && options.userCustomerId) {
      options.customerId = options.userCustomerId;
    }
  }
}
