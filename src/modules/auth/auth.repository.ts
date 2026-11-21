import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { AuthSession, AuthUser, LoginInput, RegisterInput } from './auth.types';
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error';

export interface IAuthRepository {
  register(input: RegisterInput): Promise<AuthUser>;
  login(input: LoginInput): Promise<AuthSession>;
  logout(accessToken: string): Promise<void>;
  getUserById(id: string): Promise<AuthUser | null>;
  setRole(userId: string, role: string): Promise<AuthUser | null>;
}

export class AuthRepository implements IAuthRepository {
  async register(input: RegisterInput): Promise<AuthUser> {
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ?? null,
        role: 'administrador',
      },
    });

    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        throw new ConflictError('El correo ya está asociado a otra cuenta');
      }
      throw error;
    }

    return this.toAuthUser(data.user);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    // Usar cliente efímero para no sobrescribir la sesión service_role del singleton compartido
    const authClient = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      if (error.code === 'email_not_confirmed') {
        throw new ForbiddenError('El correo no ha sido confirmado');
      }
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const authUser = await this.enrichWithProfile(data.user);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
      user: authUser,
    };
  }

  async logout(accessToken: string): Promise<void> {
    await supabase.auth.admin.signOut(accessToken);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data.user) return null;
    return this.enrichWithProfile(data.user);
  }

  async setRole(userId: string, role: string): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });
    if (error || !data.user) return null;
    return this.toAuthUser(data.user);
  }

  private async enrichWithProfile(user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }): Promise<AuthUser> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const meta = user.user_metadata ?? {};
    return {
      id: user.id,
      email: user.email ?? '',
      role: (profile?.role as AuthUser['role']) ?? (meta.role as AuthUser['role']) ?? 'cliente',
      fullName: (profile?.full_name as string) ?? (meta.full_name as string) ?? '',
      phone: meta.phone as string | undefined,
      tenantId: (profile?.tenant_id as string | null) ?? (meta.tenant_id as string | null) ?? null,
    };
  }

  private toAuthUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
    const meta = user.user_metadata ?? {};
    return {
      id: user.id,
      email: user.email ?? '',
      role: (meta.role as AuthUser['role']) ?? 'cliente',
      fullName: (meta.full_name as string) ?? '',
      phone: meta.phone as string | undefined,
      tenantId: (meta.tenant_id as string | null) ?? null,
    };
  }
}
