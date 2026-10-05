import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Patrón Creacional: Singleton
 * 
 * Garantiza que exista una única instancia del cliente de Supabase en toda
 * la aplicación, centralizando la configuración y evitando el agotamiento
 * de conexiones TCP o fugas de memoria por instancias duplicadas.
 */
export class SupabaseClientManager {
  private static instance: SupabaseClientManager | null = null;
  private readonly client: SupabaseClient;

  private constructor() {
    this.client = createClient(
      env.supabase.url,
      env.supabase.serviceRoleKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  public static getInstance(): SupabaseClientManager {
    if (!SupabaseClientManager.instance) {
      SupabaseClientManager.instance = new SupabaseClientManager();
    }
    return SupabaseClientManager.instance;
  }

  public getClient(): SupabaseClient {
    return this.client;
  }
}

// Exportación compatible para mantener intacto el resto del código existente
export const supabase: SupabaseClient = SupabaseClientManager.getInstance().getClient();

