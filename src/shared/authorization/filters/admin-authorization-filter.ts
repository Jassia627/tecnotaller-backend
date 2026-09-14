import { IAuthorizationFilter } from './authorization-filter.interface';

/**
 * Estrategia de autorización para Administradores
 * Los administradores ven todas las órdenes, sin filtro de propiedad
 */
export class AdminAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: Record<string, any>): void {
    // Los admins no tienen restricciones; no aplicar filtro
    // El repositorio retornará todas las órdenes según otros criterios (status, fechas, etc.)
  }
}
