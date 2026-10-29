import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

/**
 * Proveedor de datos para el módulo de clientes.
 * - 'supabase': usa Supabase Cloud (default, entorno local)
 * - 'postgres': usa PostgreSQL directo (Amazon RDS, entorno AWS)
 */
export type DataProvider = 'supabase' | 'postgres';

const VALID_PROVIDERS: readonly DataProvider[] = ['supabase', 'postgres'] as const;

function getDataProvider(): DataProvider {
  const value = process.env.DATA_PROVIDER?.toLowerCase().trim();
  
  // Si no está definido, usar Supabase por defecto (entorno local)
  if (!value) {
    return 'supabase';
  }
  
  // Validar que el valor sea uno de los proveedores admitidos
  if (!VALID_PROVIDERS.includes(value as DataProvider)) {
    throw new Error(
      `DATA_PROVIDER inválido: "${value}". ` +
      `Valores admitidos: ${VALID_PROVIDERS.join(', ')}. ` +
      `Deje la variable vacía o no definida para usar Supabase por defecto.`
    );
  }
  
  return value as DataProvider;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  
  /**
   * Proveedor de datos para clientes: 'supabase' o 'postgres'
   */
  dataProvider: getDataProvider(),
  
  /**
   * Configuración de Amazon RDS (solo requerida cuando DATA_PROVIDER=postgres)
   */
  rds: {
    host: process.env.RDS_HOST ?? '',
    port: Number(process.env.RDS_PORT ?? 5432),
    database: process.env.RDS_DATABASE ?? '',
    user: process.env.RDS_USER ?? '',
    password: process.env.RDS_PASSWORD ?? '',
    ssl: process.env.RDS_SSL?.toLowerCase() === 'true',
    /**
     * Ruta al bundle de certificados CA de Amazon RDS.
     * Requerido en producción para validar el certificado TLS de RDS.
     * Descargar desde: https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
     */
    caBundlePath: process.env.RDS_CA_BUNDLE_PATH ?? '',
  },
} as const;
