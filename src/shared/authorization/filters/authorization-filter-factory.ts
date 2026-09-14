import { IAuthorizationFilter } from './authorization-filter.interface';
import { TechnicianAuthorizationFilter } from './technician-authorization-filter';
import { AdminAuthorizationFilter } from './admin-authorization-filter';
import { ClientAuthorizationFilter } from './client-authorization-filter';

/**
 * Factory para crear estrategias de autorización basadas en rol
 * Encapsula la creación y mapeo de roles a estrategias
 * Patrón: Factory Pattern
 */
export class AuthorizationFilterFactory {
  /**
   * Crea una instancia de filtro según el rol proporcionado
   * @param role El rol del usuario (tecnico, administrador, cliente, etc.)
   * @returns La estrategia de autorización correspondiente
   */
  static createFilter(role?: string): IAuthorizationFilter {
    const normalizedRole = (role || 'cliente').toLowerCase().trim();

    const filters: Record<string, IAuthorizationFilter> = {
      tecnico: new TechnicianAuthorizationFilter(),
      administrador: new AdminAuthorizationFilter(),
      admin: new AdminAuthorizationFilter(), // Alias
      cliente: new ClientAuthorizationFilter(),
      // Fácil de extender: agregar nuevos roles sin modificar el servicio
      // supervisor: new SupervisorAuthorizationFilter(),
      // auditor: new AuditorAuthorizationFilter(),
    };

    return filters[normalizedRole] || new ClientAuthorizationFilter(); // Default: cliente
  }
}
