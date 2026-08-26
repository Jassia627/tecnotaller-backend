import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from './products.service';
import { IProductRepository } from './products.repository';
import { NotFoundError } from '../../shared/errors/app-error';

describe('ProductService', () => {
  let service: ProductService;
  let mockRepository: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
      listMovements: vi.fn(),
      registerMovement: vi.fn(),
    };

    service = new ProductService(mockRepository as IProductRepository);
  });

  describe('listPublic', () => {
    it('should list only active products', async () => {
      const mockRows: any[] = [
        {
          id: 'prod-1',
          name: 'Producto 1',
          active: true,
          stock: 10,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 1,
      });

      const result = await service.listPublic({ page: 1, pageSize: 10 });

      expect(mockRepository.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        includeInactive: false,
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('listAll', () => {
    it('should list all products including inactive', async () => {
      const mockRows: any[] = [];

      mockRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 0,
      });

      const result = await service.listAll({ page: 1, pageSize: 10 });

      expect(mockRepository.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        includeInactive: true,
      });
    });
  });

  describe('getById', () => {
    it('should get a product by id', async () => {
      const productId = 'prod-123';
      const mockRow: any = {
        id: productId,
        name: 'Producto',
        active: true,
        stock: 5,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById(productId);

      expect(mockRepository.findById).toHaveBeenCalledWith(productId);
      expect(result.id).toBe(productId);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const input = {
        name: 'Nuevo producto',
        stock: 100,
      };

      const mockRow: any = {
        id: 'prod-new',
        name: input.name,
        stock: input.stock,
        active: true,
        created_at: '2024-01-15T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe('prod-new');
    });
  });

  describe('update', () => {
    it('should update an existing product', async () => {
      const productId = 'prod-456';
      const input = { name: 'Actualizado' };

      const mockRow: any = {
        id: productId,
        name: 'Antiguo',
        active: true,
        stock: 50,
        created_at: '2024-01-01T00:00:00Z',
      };

      const updatedRow: any = {
        ...mockRow,
        name: input.name,
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.update.mockResolvedValue(updatedRow);

      const result = await service.update(productId, input);

      expect(mockRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockRepository.update).toHaveBeenCalledWith(productId, input);
      expect(result.name).toBe('Actualizado');
    });

    it('should throw NotFoundError when updating non-existent product', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'test' })).rejects.toThrow(NotFoundError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('changeAvailability', () => {
    it('should activate a product', async () => {
      const productId = 'prod-789';
      const mockRow: any = {
        id: productId,
        name: 'Producto',
        active: false,
        stock: 10,
        created_at: '2024-01-01T00:00:00Z',
      };

      const activatedRow: any = {
        ...mockRow,
        active: true,
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.setActive.mockResolvedValue(activatedRow);

      const result = await service.changeAvailability(productId, true);

      expect(mockRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockRepository.setActive).toHaveBeenCalledWith(productId, true);
      expect(result.active).toBe(true);
    });

    it('should deactivate a product', async () => {
      const productId = 'prod-999';
      const mockRow: any = {
        id: productId,
        name: 'Producto',
        active: true,
        stock: 10,
        created_at: '2024-01-01T00:00:00Z',
      };

      const deactivatedRow: any = {
        ...mockRow,
        active: false,
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.setActive.mockResolvedValue(deactivatedRow);

      const result = await service.changeAvailability(productId, false);

      expect(mockRepository.setActive).toHaveBeenCalledWith(productId, false);
      expect(result.active).toBe(false);
    });
  });

  describe('listMovements', () => {
    it('should list inventory movements for a product', async () => {
      const productId = 'prod-123';
      const mockMovements: any[] = [
        {
          id: 'mov-1',
          type: 'entrada',
          quantity: 10,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockRow: any = {
        id: productId,
        name: 'Producto',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.listMovements.mockResolvedValue(mockMovements);

      const result = await service.listMovements(productId);

      expect(mockRepository.findById).toHaveBeenCalledWith(productId);
      expect(mockRepository.listMovements).toHaveBeenCalledWith(productId);
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundError when product does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.listMovements('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.listMovements).not.toHaveBeenCalled();
    });
  });

  describe('registerMovement', () => {
    it('should register an inventory movement', async () => {
      const productId = 'prod-456';
      const userId = 'user-123';
      const input = {
        type: 'salida' as const,
        quantity: 5,
        reason: 'Venta',
      };

      const mockRow: any = {
        id: productId,
        name: 'Producto',
        stock: 95,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.registerMovement.mockResolvedValue(mockRow);

      const result = await service.registerMovement(productId, input, userId);

      expect(mockRepository.registerMovement).toHaveBeenCalledWith(productId, input, userId);
      expect(result.stock).toBe(95);
    });
  });
});
