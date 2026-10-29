/**
 * Configuración del pool de conexiones PostgreSQL para Amazon RDS.
 * Solo se inicializa cuando DATA_PROVIDER=postgres.
 */
import { Pool, PoolConfig } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { env } from './env';
import { logger } from '../shared/utils/logger';

let pool: Pool | null = null;

/**
 * Ruta al bundle de certificados CA de Amazon RDS.
 * En EC2, este archivo debe descargarse desde:
 * https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
 * 
 * Se recomienda colocarlo en /etc/ssl/certs/rds-ca-bundle.pem o configurar
 * la ruta mediante la variable de entorno RDS_CA_BUNDLE_PATH.
 */
function getRdsCaCertificate(): string | undefined {
  const caPath = env.rds.caBundlePath;
  
  if (!caPath) {
    logger.warn('RDS_CA_BUNDLE_PATH no configurado. SSL usará validación por defecto del sistema.');
    return undefined;
  }

  if (!existsSync(caPath)) {
    throw new Error(
      `Certificado CA de RDS no encontrado en: ${caPath}. ` +
      `Descargue el bundle desde https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem`
    );
  }

  return readFileSync(caPath, 'utf-8');
}

/**
 * Valida que todas las variables requeridas para RDS estén configuradas.
 * Lanza error descriptivo si falta alguna.
 */
export function validateRdsConfig(): void {
  const missing: string[] = [];
  
  if (!env.rds.host) missing.push('RDS_HOST');
  if (!env.rds.database) missing.push('RDS_DATABASE');
  if (!env.rds.user) missing.push('RDS_USER');
  if (!env.rds.password) missing.push('RDS_PASSWORD');
  
  if (missing.length > 0) {
    throw new Error(
      `Variables de RDS faltantes: ${missing.join(', ')}. ` +
      `Todas son requeridas cuando DATA_PROVIDER=postgres.`
    );
  }
}

/**
 * Obtiene o crea el pool de conexiones PostgreSQL.
 * Lanza error si las variables de entorno no están configuradas.
 */
export function getPostgresPool(): Pool {
  if (pool) return pool;

  // Validar configuración requerida
  validateRdsConfig();

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
    const caCert = getRdsCaCertificate();
    
    config.ssl = {
      // En producción: validar certificados con el CA bundle de RDS
      // En desarrollo: permitir conexión sin validación estricta
      rejectUnauthorized: env.nodeEnv === 'production',
      // Incluir el certificado CA si está disponible
      ...(caCert && { ca: caCert }),
    };
    
    logger.info(
      { 
        rejectUnauthorized: env.nodeEnv === 'production',
        hasCaCert: !!caCert 
      },
      'Configuración SSL para RDS'
    );
  }

  pool = new Pool(config);

  // Manejar errores del pool
  pool.on('error', (err: Error) => {
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
