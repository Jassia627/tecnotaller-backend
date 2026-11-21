import { createHash } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { setRequestTenantId } from '../context/tenant-context';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';
import { ROLES } from '../types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface CachedTokenEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}

const TOKEN_CACHE_TTL_MS = 60_000;
const TOKEN_CACHE_MAX_SIZE = 500;
const tokenCache = new Map<string, CachedTokenEntry>();

export function invalidateTenantTokens(tenantId: string): void {
  for (const [key, entry] of tokenCache.entries()) {
    if (entry.user.tenantId === tenantId) {
      tokenCache.delete(key);
    }
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function extractJwtExpirationMs(token: string): number | null {
  try {
    const parts = token.split('.');
    const payloadSegment = parts[1];
    if (parts.length !== 3 || !payloadSegment) return null;
    const payload = JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function getCachedUser(token: string): AuthenticatedUser | null {
  const key = hashToken(token);
  const entry = tokenCache.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    tokenCache.delete(key);
    return null;
  }

  return entry.user;
}

function setCachedUser(token: string, user: AuthenticatedUser): void {
  if (tokenCache.size >= TOKEN_CACHE_MAX_SIZE) {
    const oldestKey = tokenCache.keys().next().value;
    if (oldestKey) tokenCache.delete(oldestKey);
  }

  const now = Date.now();
  const jwtExp = extractJwtExpirationMs(token);
  const ttlCap = now + TOKEN_CACHE_TTL_MS;
  const expiresAt = jwtExp !== null ? Math.min(ttlCap, jwtExp) : ttlCap;

  if (expiresAt > now) {
    tokenCache.set(hashToken(token), { user, expiresAt });
  }
}

function resolveDevUser(token: string): AuthenticatedUser | null {
  if (process.env.NODE_ENV === 'development' && token.startsWith('dev-')) {
    const role = token.includes('super')
      ? ROLES.SUPER_ADMIN
      : token.includes('admin')
      ? ROLES.ADMINISTRADOR
      : token.includes('tecnico')
      ? ROLES.TECNICO
      : ROLES.CLIENTE;
    return {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'dev@tecnotaller.local',
      role,
      tenantId: null,
    };
  }
  return null;
}

async function resolveUserFromToken(token: string): Promise<AuthenticatedUser> {
  const devUser = resolveDevUser(token);
  if (devUser) return devUser;

  const cached = getCachedUser(token);
  if (cached) return cached;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new UnauthorizedError('Token inválido o expirado');
  }

  // Consultar perfil para obtener role, estado activo y tenant_id autoritativo
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile && profile.active === false) {
    throw new ForbiddenError('Tu usuario se encuentra desactivado.');
  }

  const role = (profile?.role as string) ?? (data.user.user_metadata?.role as string) ?? ROLES.CLIENTE;
  const tenantId =
    (profile?.tenant_id as string | null) ??
    (data.user.user_metadata?.tenant_id as string | null) ??
    null;

  // Verificar que el taller del usuario esté activo (excepto super_admin)
  if (role !== ROLES.SUPER_ADMIN && tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('active')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenant && tenant.active === false) {
      throw new ForbiddenError('Este taller se encuentra suspendido. Contacta al administrador de la plataforma.');
    }
  }

  const user: AuthenticatedUser = {
    id: data.user.id,
    email: data.user.email ?? '',
    role,
    tenantId,
  };

  setCachedUser(token, user);
  return user;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }

    const token = authHeader.slice(7);
    req.user = await resolveUserFromToken(token);
    if (req.user.tenantId) {
      setRequestTenantId(req.user.tenantId);
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware de autenticación opcional:
 * Si viene token Bearer válido, inyecta req.user.
 * Si NO viene token, no arroja 401 y permite continuar como usuario anónimo/público.
 */
export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.slice(7);
    req.user = await resolveUserFromToken(token);
    if (req.user.tenantId) {
      setRequestTenantId(req.user.tenantId);
    }
    next();
  } catch {
    next();
  }
}
