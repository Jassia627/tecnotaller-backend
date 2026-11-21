import { AsyncLocalStorage } from 'node:async_hooks';
import { ForbiddenError } from '../errors/app-error';

interface TenantStore {
  tenantId: string | null;
}

const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function setRequestTenantId(tenantId: string | null): void {
  tenantStorage.enterWith({ tenantId });
}

export function getCurrentTenantId(): string | null {
  return tenantStorage.getStore()?.tenantId ?? null;
}

export function requireCurrentTenantId(): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new ForbiddenError('Contexto de taller (tenant_id) requerido para esta operación');
  }
  return tenantId;
}
