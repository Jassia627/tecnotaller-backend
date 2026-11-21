export const ROLES = {
  CLIENTE: 'cliente',
  TECNICO: 'tecnico',
  ADMINISTRADOR: 'administrador',
  SUPER_ADMIN: 'super_admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
