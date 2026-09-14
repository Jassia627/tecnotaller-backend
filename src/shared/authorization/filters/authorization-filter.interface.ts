/**
 * Interfaz Strategy para encapsular la lógica de filtrado por rol.
 * Cada rol implementa su propia estrategia sin modificar el servicio.
 * Patrón: Strategy + OCP (Open/Closed Principle)
 */
export interface IAuthorizationFilter {
  /**
   * Aplica el filtro de autorización específico del rol
   * @param options Opciones de listado a modificar según permisos del rol
   */
  applyFilter(options: Record<string, any>): void;
}
