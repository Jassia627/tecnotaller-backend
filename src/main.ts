import { createApp } from './app';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { 
  testPostgresConnection, 
  closePostgresPool, 
  validateRdsConfig 
} from './config/postgres';

/**
 * Inicializa y arranca el servidor.
 * Valida la conexión a RDS antes de declarar el servidor operativo.
 */
async function main(): Promise<void> {
  // Si DATA_PROVIDER=postgres, validar configuración y conexión ANTES de iniciar
  if (env.dataProvider === 'postgres') {
    logger.info('DATA_PROVIDER=postgres detectado. Validando conexión con RDS...');
    
    try {
      // Validar que las variables estén configuradas
      validateRdsConfig();
      
      // Probar la conexión real con la base de datos
      await testPostgresConnection();
      
      logger.info('Conexión con Amazon RDS establecida correctamente');
    } catch (error) {
      logger.error(
        { err: error },
        'ERROR CRÍTICO: No se pudo conectar con Amazon RDS. El servidor NO iniciará.'
      );
      process.exit(1);
    }
  } else {
    logger.info('DATA_PROVIDER=supabase (o no definido). Usando Supabase Cloud.');
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(
      { 
        port: env.port, 
        env: env.nodeEnv,
        dataProvider: env.dataProvider 
      },
      `API escuchando en http://localhost:${env.port}`
    );
  });

  // Manejo de apagado ordenado
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Señal de apagado recibida. Cerrando servidor...');
    
    server.close(async () => {
      logger.info('Servidor HTTP cerrado');
      
      // Cerrar pool de PostgreSQL si estaba activo
      if (env.dataProvider === 'postgres') {
        await closePostgresPool();
      }
      
      logger.info('Apagado ordenado completado');
      process.exit(0);
    });

    // Si el servidor no cierra en 10 segundos, forzar salida
    setTimeout(() => {
      logger.error('Timeout de apagado. Forzando salida.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ err: error }, 'Error fatal al iniciar el servidor');
  process.exit(1);
});
