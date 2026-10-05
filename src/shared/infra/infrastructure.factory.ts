import { logger } from '../utils/logger';
import { supabase } from '../../config/supabase';

// ============================================================================
// 1. PRODUCTOS ABSTRACTOS (Lado Izquierdo del Diagrama)
// ============================================================================

/**
 * Producto Abstracto A: Servicio de Almacenamiento de Fotos y Evidencias
 */
export interface IStorageService {
  uploadPhoto(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string>;
  getPublicUrl(bucket: string, path: string): string;
}

/**
 * Producto Abstracto B: Servicio de Notificaciones y Alertas al Cliente
 */
export interface INotifierService {
  sendAlert(recipient: string, subject: string, content: string): Promise<void>;
}

// ============================================================================
// 2. PRODUCTOS CONCRETOS (Familias 1 y 2)
// ============================================================================

// --- Familia 1: Producción ---

// Producto A1: Almacenamiento en la nube (Supabase S3)
export class SupabaseStorageService implements IStorageService {
  async uploadPhoto(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      logger.error({ error, path }, 'Error al subir foto a Supabase Storage');
      throw new Error(`Fallo de almacenamiento: ${error.message}`);
    }
    return data.path;
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}

// Producto B1: Correo Electrónico Real (Edge Function / SendGrid)
export class EdgeFunctionEmailService implements INotifierService {
  async sendAlert(recipient: string, subject: string, content: string): Promise<void> {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: recipient, subject, body: content },
    });
    if (error) {
      logger.error({ error, recipient }, 'Fallo al invocar Edge Function de email');
      throw new Error('No se pudo enviar la alerta de producción');
    }
  }
}

// --- Familia 2: Desarrollo Local / Testing ---

// Producto A2: Almacenamiento simulado en disco local / memoria
export class LocalDiskStorageService implements IStorageService {
  private readonly memoryStore = new Map<string, Buffer>();

  async uploadPhoto(bucket: string, path: string, buffer: Buffer): Promise<string> {
    const key = `${bucket}/${path}`;
    this.memoryStore.set(key, buffer);
    logger.info({ key, sizeBytes: buffer.length }, 'Foto guardada localmente (LocalDiskStorage)');
    return `/local-storage/${key}`;
  }

  getPublicUrl(bucket: string, path: string): string {
    return `http://localhost:3000/local-storage/${bucket}/${path}`;
  }
}

// Producto B2: Notificador simulado en Consola
export class LocalConsoleNotifierService implements INotifierService {
  async sendAlert(recipient: string, subject: string, content: string): Promise<void> {
    logger.info({ recipient, subject, preview: content }, 'Alerta simulada en consola (LocalDev)');
  }
}

// ============================================================================
// 3. FACTORÍAS (Centro del Diagrama)
// ============================================================================

/**
 * Factoría Abstracta: Contrato para fabricar la familia completa de infraestructura
 */
export interface IInfrastructureFactory {
  createStorage(): IStorageService;
  createNotifier(): INotifierService;
}

/**
 * Factoría Concreta 1 (Producción): Produce exclusivamente la familia de producción {A1, B1}
 */
export class ProductionInfrastructureFactory implements IInfrastructureFactory {
  createStorage(): IStorageService {
    return new SupabaseStorageService();
  }

  createNotifier(): INotifierService {
    return new EdgeFunctionEmailService();
  }
}

/**
 * Factoría Concreta 2 (Desarrollo / Testing): Produce exclusivamente la familia local {A2, B2}
 */
export class LocalDevInfrastructureFactory implements IInfrastructureFactory {
  createStorage(): IStorageService {
    return new LocalDiskStorageService();
  }

  createNotifier(): INotifierService {
    return new LocalConsoleNotifierService();
  }
}

// ============================================================================
// 4. FACTORY PRODUCER (Lado Derecho del Diagrama)
// ============================================================================

/**
 * Factory Producer / Selector:
 * Determina qué factoría concreta instanciar y entregar según el entorno de ejecución (NODE_ENV).
 */
export class InfrastructureProducer {
  public static getFactory(environment?: string): IInfrastructureFactory {
    const env = environment || process.env.NODE_ENV || 'development';

    if (env === 'production') {
      return new ProductionInfrastructureFactory();
    }

    return new LocalDevInfrastructureFactory();
  }
}
