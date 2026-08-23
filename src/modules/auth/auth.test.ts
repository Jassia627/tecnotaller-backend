import { describe, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { IAuthRepository } from './auth.repository';
import { AuthUser } from './auth.types';

const mockUser: AuthUser = {
  id: 'user-1',
  email: 'cliente@test.com',
  role: 'cliente',
  fullName: 'Cliente Uno',
};

function buildRepo(): IAuthRepository {
  return {
    register: vi.fn().mockResolvedValue(mockUser),
    login: vi.fn().mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresAt: 123,
      user: mockUser,
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getUserById: vi.fn().mockResolvedValue(mockUser),
    setRole: vi.fn().mockResolvedValue(mockUser),
  };
}

describe('AuthService', () => {
  it('registra un cliente y devuelve el usuario', async () => {
    const repo = buildRepo();
    const service = new AuthService(repo);

    const user = await service.register({
      email: 'cliente@test.com',
      password: 'secreto123',
      fullName: 'Cliente Uno',
    });

    expect(user.id).toBe('user-1');
    expect(repo.register).toHaveBeenCalledOnce();
  });

  it('devuelve sesión al iniciar sesión', async () => {
    const repo = buildRepo();
    const service = new AuthService(repo);

    const session = await service.login({ email: 'cliente@test.com', password: 'secreto123' });

    expect(session.accessToken).toBe('at');
    expect(session.user.role).toBe('cliente');
  });

  it('obtiene el perfil por id', async () => {
    const repo = buildRepo();
    const service = new AuthService(repo);

    const user = await service.getProfile('user-1');

    expect(user?.email).toBe('cliente@test.com');
  });
});
