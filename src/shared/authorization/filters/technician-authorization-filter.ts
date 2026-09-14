import { IAuthorizationFilter } from './authorization-filter.interface';

/**
 * Estrategia de autorización para Técnicos
 * Los técnicos solo ven sus propias órdenes
 */
export class TechnicianAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: Record<string, any>): void {
    // Si no hay filtro de technicianId explícito, auto-asignarse
    if (!options.technicianId && options.userTechnicianId) {
      options.technicianId = options.userTechnicianId;
    }
  }
}
