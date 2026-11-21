import { NextFunction, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { setRequestTenantId } from '../context/tenant-context';
import { NotFoundError } from '../errors/app-error';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

interface CachedTenantEntry {
  tenant: TenantContext;
  expiresAt: number;
}

const TENANT_CACHE_TTL_MS = 60_000;
const tenantSlugCache = new Map<string, CachedTenantEntry>();
const DEFAULT_TENANT_SLUG = 'tecnotaller';

export function clearTenantCache(slug?: string): void {
  if (slug) {
    tenantSlugCache.delete(slug);
  } else {
    tenantSlugCache.clear();
  }
}

export async function resolveTenantBySlug(slug: string): Promise<TenantContext | null> {
  const normalized = slug.trim().toLowerCase();
  const cached = tenantSlugCache.get(normalized);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.tenant;
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, logo_url, whatsapp_number, active')
    .eq('slug', normalized)
    .eq('active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const tenant: TenantContext = {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    logoUrl: (data.logo_url as string | null) ?? null,
    whatsappNumber: (data.whatsapp_number as string | null) ?? null,
  };

  tenantSlugCache.set(normalized, {
    tenant,
    expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
  });

  return tenant;
}

/**
 * Middleware para rutas públicas del portal de clientes.
 * Resuelve el taller a partir del header `X-Tenant-Slug`, query `?tenant=` o parámetro `:slug`.
 * Si no se envía ninguno, usa el taller por defecto (`tecnotaller`) por compatibilidad.
 */
export async function resolveTenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const headerSlug = req.headers['x-tenant-slug'];
    const querySlug = req.query.tenant;
    const paramSlug = req.params.slug;

    const rawSlug =
      (typeof paramSlug === 'string' && paramSlug.trim()) ||
      (typeof headerSlug === 'string' && headerSlug.trim()) ||
      (typeof querySlug === 'string' && querySlug.trim()) ||
      DEFAULT_TENANT_SLUG;

    const tenant = await resolveTenantBySlug(rawSlug);
    if (!tenant) {
      throw new NotFoundError(`El taller "${rawSlug}" no existe o está inactivo`);
    }

    req.tenant = tenant;
    if (!req.user?.tenantId) {
      setRequestTenantId(tenant.id);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene el tenant_id efectivo de la petición (prioriza el del usuario autenticado).
 */
export function getEffectiveTenantId(req: Request): string | null {
  return req.user?.tenantId ?? req.tenant?.id ?? null;
}
