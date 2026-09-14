/**
 * Códigos de error estándar de PostgreSQL (SQLSTATE)
 * Centralizados para evitar el antipatrón de Magic Strings/Numbers.
 */
export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  INVALID_TEXT_REPRESENTATION: '22P02', // UUID con formato inválido
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_FUNCTION: '42883', // Función o procedimiento almacenado no existe en Postgres
} as const;

/**
 * Códigos de error específicos de la API de PostgREST / Supabase
 */
export const POSTGREST_ERROR_CODES = {
  ROW_NOT_FOUND: 'PGRST116',
  FUNCTION_NOT_FOUND: 'PGRST202', // Función RPC no expuesta o inexistente en PostgREST
  TABLE_NOT_FOUND: 'PGRST205',
} as const;

/**
 * Patrones de expresiones regulares para identificar errores conocidos de la base de datos
 * de manera resiliente a variaciones de formato y localizaciones idiomáticas.
 */
export const DB_ERROR_PATTERNS = {
  INSUFFICIENT_STOCK: [/insuficiente/i, /insufficient/i, /stock/i],
  PRODUCT_NOT_FOUND: [/producto no encontrado/i, /product not found/i],
  SKU_UNIQUE_VIOLATION: [/sku/i],
} as const;

/**
 * Expresión regular estándar para validar identificadores UUID
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Helper para validar si un string es un UUID válido
 */
export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}
