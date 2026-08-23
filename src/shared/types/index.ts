export const ROLES = {
  CLIENTE: 'cliente',
  TECNICO: 'tecnico',
  ADMINISTRADOR: 'administrador',
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
