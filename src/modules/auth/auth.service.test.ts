import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { IAuthRepository } from './auth.repository';
import { AuthUser, AuthSession } from './auth.types';

describe('AuthService', () => {
  let service: AuthService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  function createMockRepository(): Record<string, any> {
    return {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getUserById: vi.fn(),
      setRole: vi.fn(),
    };
  }

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new AuthService(mockRepository as IAuthRepository);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const input = {
        email: 'juan@example.com',
        password: 'SecurePass123!',
        fullName: 'Juan Pérez',
        phone: '+34 123456789',
      };

      const mockUser: AuthUser = {
        id: 'user-123',
        email: input.email,
        role: 'administrador',
        fullName: input.fullName,
        phone: input.phone,
      };

      mockRepository.register.mockResolvedValue(mockUser);

      const result = await service.register(input);

      expect(mockRepository.register).toHaveBeenCalledWith(input);
      expect(result.id).toBe('user-123');
      expect(result.email).toBe(input.email);
      expect(result.fullName).toBe(input.fullName);
      expect(result.role).toBe('administrador');
    });

    it('should register a user without phone number', async () => {
      const input = {
        email: 'maria@example.com',
        password: 'SecurePass456!',
        fullName: 'María García',
      };

      const mockUser: AuthUser = {
        id: 'user-456',
        email: input.email,
        role: 'administrador',
        fullName: input.fullName,
      };

      mockRepository.register.mockResolvedValue(mockUser);

      const result = await service.register(input);

      expect(mockRepository.register).toHaveBeenCalledWith(input);
      expect(result.email).toBe(input.email);
      expect(result.phone).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login a user with correct credentials', async () => {
      const input = {
        email: 'juan@example.com',
        password: 'SecurePass123!',
      };

      const mockSession: AuthSession = {
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
        expiresAt: Date.now() + 3600000,
        user: {
          id: 'user-123',
          email: input.email,
          role: 'administrador',
          fullName: 'Juan Pérez',
        },
      };

      mockRepository.login.mockResolvedValue(mockSession);

      const result = await service.login(input);

      expect(mockRepository.login).toHaveBeenCalledWith(input);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(input.email);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should return user data in login response', async () => {
      const input = {
        email: 'maria@example.com',
        password: 'SecurePass456!',
      };

      const mockSession: AuthSession = {
        accessToken: 'token-abc',
        refreshToken: 'token-xyz',
        expiresAt: Date.now() + 7200000,
        user: {
          id: 'user-789',
          email: input.email,
          role: 'cliente',
          fullName: 'María García',
          phone: '+34 987654321',
        },
      };

      mockRepository.login.mockResolvedValue(mockSession);

      const result = await service.login(input);

      expect(result.user.id).toBe('user-789');
      expect(result.user.role).toBe('cliente');
      expect(result.user.phone).toBe('+34 987654321');
    });
  });

  describe('logout', () => {
    it('should logout a user with valid token', async () => {
      const accessToken = 'eyJhbGc...';

      mockRepository.logout.mockResolvedValue(undefined);

      await service.logout(accessToken);

      expect(mockRepository.logout).toHaveBeenCalledWith(accessToken);
    });

    it('should handle logout without error', async () => {
      const accessToken = 'token-123';

      mockRepository.logout.mockResolvedValue(undefined);

      await expect(service.logout(accessToken)).resolves.not.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should get user profile by id', async () => {
      const userId = 'user-123';
      const mockUser: AuthUser = {
        id: userId,
        email: 'juan@example.com',
        role: 'administrador',
        fullName: 'Juan Pérez',
        phone: '+34 123456789',
      };

      mockRepository.getUserById.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(mockRepository.getUserById).toHaveBeenCalledWith(userId);
      expect(result?.id).toBe(userId);
      expect(result?.email).toBe('juan@example.com');
      expect(result?.role).toBe('administrador');
    });

    it('should return null when user does not exist', async () => {
      const userId = 'non-existent-user';

      mockRepository.getUserById.mockResolvedValue(null);

      const result = await service.getProfile(userId);

      expect(result).toBeNull();
    });

    it('should handle different user roles', async () => {
      const mockUser: AuthUser = {
        id: 'user-456',
        email: 'cliente@example.com',
        role: 'cliente',
        fullName: 'Cliente Test',
      };

      mockRepository.getUserById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-456');

      expect(result?.role).toBe('cliente');
    });
  });
});
