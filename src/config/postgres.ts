/**
 * Configuración del pool de conexiones PostgreSQL para Amazon RDS.
 * Solo se inicializa cuando DATA_PROVIDER=postgres.
 */
import { Pool, PoolConfig } from 'pg';
import { env } from './env';
import { logger } from '../shared/utils/logger';

let pool: Pool | null = null;

/**
 * Obtiene o crea el pool de conexiones PostgreSQL.
 * Lanza error si las variables de entorno no están configuradas.
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;

  // Validar configuración requerida
  if (!env.rds.host) {
    throw new Error('RDS_HOST no está configurado');
  }
  if (!env.rds.database) {
    throw new Error('RDS_DATABASE no está configurado');
  }
  if (!env.rds.user) {
    throw new Error('RDS_USER no está configurado');
  }
  if (!env.rds.password) {
    throw new Error('RDS_PASSWORD no está configurado');
  }

  const config: PoolConfig = {
    host: env.rds.host,
    port: env.rds.port,
    database: env.rds.database,
    user: env.rds.user,
    password: env.rds.password,
    max: 10, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  // Configurar SSL si está habilitado
  if (env.rds.ssl) {
    config.ssl = {
      rejectUnauthorized: env.nodeEnv === 'production', // Validar certificados en producción
    };
  }

  pool = new Pool(config);

  // Manejar errores del pool
  pool.on('error', (err) => {
    logger.error({ err }, 'Error inesperado en el pool de PostgreSQL');
  });

  pool.on('connect', () => {
    logger.debug('Nueva conexión establecida con PostgreSQL RDS');
  });

  logger.info(
    { host: env.rds.host, database: env.rds.database },
    'Pool de PostgreSQL inicializado para RDS'
  );

  return pool;
}

/**
 * Cierra el pool de conexiones.
 * Útil para cleanup en tests o al cerrar la aplicación.
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Pool de PostgreSQL cerrado');
  }
}

/**
 * Verifica la conexión con PostgreSQL.
 * Lanza error si no puede conectar.
 */
export async function testPostgresConnection(): Promise<void> {
  const p = getPostgresPool();
  const client = await p.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Conexión con PostgreSQL RDS verificada');
  } finally {
    client.release();
  }
}
