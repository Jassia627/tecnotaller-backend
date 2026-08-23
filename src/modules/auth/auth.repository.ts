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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      if (error.code === 'email_not_confirmed') {
        throw new ForbiddenError('El correo no ha sido confirmado');
      }
      throw new UnauthorizedError('Credenciales inválidas');
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at ?? 0,
      user: this.toAuthUser(data.user),
    };
  }

  async logout(accessToken: string): Promise<void> {
    await supabase.auth.admin.signOut(accessToken);
  }

  async getUserById(id: string): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data.user) return null;
    return this.toAuthUser(data.user);
  }

  async setRole(userId: string, role: string): Promise<AuthUser | null> {
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    });
    if (error || !data.user) return null;
    return this.toAuthUser(data.user);
  }

  private toAuthUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AuthUser {
    const meta = user.user_metadata ?? {};
    return {
      id: user.id,
      email: user.email ?? '',
      role: (meta.role as AuthUser['role']) ?? 'cliente',
      fullName: (meta.full_name as string) ?? '',
      phone: meta.phone as string | undefined,
    };
  }
}
