import { describe, it, expect, vi } from 'vitest';
import { ProductRepository } from './products.repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { POSTGREST_ERROR_CODES } from '../../shared/constants/db-errors';

describe('ProductRepository - Unit Tests (DIP & Anti-fragile Error Handling)', () => {
  it('should allow injecting a mock SupabaseClient through constructor', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'mock-prod-1',
        sku: 'MOCK-SKU-1',
        name: 'Mock Product',
        stock: 5,
        active: true,
      },
      error: null,
    });

    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    const mockDbClient = {
      from: mockFrom,
    } as unknown as SupabaseClient;

    // Inyección de dependencia (DIP)
    const repository = new ProductRepository(mockDbClient);

    const product = await repository.findById('mock-prod-1');

    expect(mockFrom).toHaveBeenCalledWith('products');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', 'mock-prod-1');
    expect(product).toBeDefined();
    expect(product?.name).toBe('Mock Product');
  });

  it('should handle ROW_NOT_FOUND (PGRST116) without error when mock client returns not found', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: POSTGREST_ERROR_CODES.ROW_NOT_FOUND, message: 'Row not found' },
    });

    const mockDbClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockSingle }),
        }),
      }),
    } as unknown as SupabaseClient;

    const repository = new ProductRepository(mockDbClient);
    const product = await repository.findById('non-existent-id');

    expect(product).toBeNull();
  });

  describe('registerMovement resilience & validation', () => {
    it('should throw NotFoundError if product does not exist before attempting DB operation', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: POSTGREST_ERROR_CODES.ROW_NOT_FOUND, message: 'Not found' },
      });

      const mockDbClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }),
        }),
        rpc: vi.fn(),
      } as unknown as SupabaseClient;

      const repository = new ProductRepository(mockDbClient);

      await expect(
        repository.registerMovement(
          'prod-1',
          { type: 'OUT', quantity: 5, reason: 'Salida de prueba' },
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundError);

      expect(mockDbClient.rpc).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if OUT movement exceeds existing stock before relying on DB text error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'prod-1', stock: 2, active: true },
        error: null,
      });

      const mockDbClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }),
        }),
        rpc: vi.fn(),
      } as unknown as SupabaseClient;

      const repository = new ProductRepository(mockDbClient);

      await expect(
        repository.registerMovement(
          'prod-1',
          { type: 'OUT', quantity: 10, reason: 'Demasiado stock' },
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(BadRequestError);

      expect(mockDbClient.rpc).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if movement type is invalid', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'prod-1', stock: 10, active: true },
        error: null,
      });

      const mockDbClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: mockSingle }),
          }),
        }),
        rpc: vi.fn(),
      } as unknown as SupabaseClient;

      const repository = new ProductRepository(mockDbClient);

      await expect(
        repository.registerMovement(
          'prod-1',
          { type: 'INVALID' as any, quantity: 2, reason: 'Tipo malo' },
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(BadRequestError);

      expect(mockDbClient.rpc).not.toHaveBeenCalled();
    });
  });
});
