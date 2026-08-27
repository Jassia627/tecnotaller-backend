import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PartService } from './parts.service';
import { IPartRepository } from './parts.repository';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';

describe('PartService', () => {
  let service: PartService;
  let mockPartRepository: Record<string, any>;
  let mockWorkOrderRepository: Record<string, any>;

  beforeEach(() => {
    mockPartRepository = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      assignToWorkOrder: vi.fn(),
    };

    mockWorkOrderRepository = {
      findById: vi.fn(),
    };

    service = new PartService(
      mockPartRepository as IPartRepository,
      mockWorkOrderRepository as IWorkOrderRepository,
    );
  });

  describe('list', () => {
    it('should list parts with pagination', async () => {
      const mockRows: any[] = [
        {
          id: 'part-1',
          name: 'Pantalla LCD',
          stock: 10,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockPartRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 1,
      });

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(mockPartRepository.list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty list when no parts', async () => {
      mockPartRepository.list.mockResolvedValue({ rows: [], total: 0 });

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getById', () => {
    it('should get a part by id', async () => {
      const partId = 'part-123';
      const mockRow: any = {
        id: partId,
        name: 'Batería',
        stock: 5,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockPartRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById(partId);

      expect(mockPartRepository.findById).toHaveBeenCalledWith(partId);
      expect(result.id).toBe(partId);
    });

    it('should throw NotFoundError when part does not exist', async () => {
      mockPartRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a new part', async () => {
      const input = {
        name: 'Nuevo repuesto',
        stock: 100,
      };

      const mockRow: any = {
        id: 'part-new',
        name: input.name,
        stock: input.stock,
        active: true,
        created_at: '2024-01-15T00:00:00Z',
      };

      mockPartRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockPartRepository.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe('part-new');
    });
  });

  describe('update', () => {
    it('should update an existing part', async () => {
      const partId = 'part-456';
      const input = { name: 'Nombre actualizado' };

      const mockRow: any = {
        id: partId,
        name: 'Old name',
        stock: 50,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const updatedRow: any = {
        ...mockRow,
        name: input.name,
      };

      mockPartRepository.findById.mockResolvedValue(mockRow);
      mockPartRepository.update.mockResolvedValue(updatedRow);

      const result = await service.update(partId, input);

      expect(mockPartRepository.findById).toHaveBeenCalledWith(partId);
      expect(mockPartRepository.update).toHaveBeenCalledWith(partId, input);
      expect(result.name).toBe('Nombre actualizado');
    });

    it('should throw NotFoundError when updating non-existent part', async () => {
      mockPartRepository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'test' })).rejects.toThrow(NotFoundError);
      expect(mockPartRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('assignToWorkOrder', () => {
    it('should assign a part to a work order', async () => {
      const workOrderId = 'wo-123';
      const partId = 'part-789';
      const quantity = 2;

      const mockPartRow: any = {
        id: partId,
        name: 'Repuesto',
        stock: 10,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockWorkOrder = { id: workOrderId };

      mockWorkOrderRepository.findById.mockResolvedValue(mockWorkOrder);
      mockPartRepository.findById.mockResolvedValue(mockPartRow);
      mockPartRepository.assignToWorkOrder.mockResolvedValue({
        ...mockPartRow,
        stock: 8,
      });

      const result = await service.assignToWorkOrder(workOrderId, {
        partId,
        quantity,
      });

      expect(mockWorkOrderRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockPartRepository.findById).toHaveBeenCalledWith(partId);
      expect(mockPartRepository.assignToWorkOrder).toHaveBeenCalledWith(workOrderId, partId, quantity);
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockWorkOrderRepository.findById.mockResolvedValue(null);

      await expect(
        service.assignToWorkOrder('non-existent', { partId: 'part-1', quantity: 1 })
      ).rejects.toThrow(NotFoundError);
      expect(mockPartRepository.assignToWorkOrder).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError on insufficient stock', async () => {
      const workOrderId = 'wo-456';
      const partId = 'part-999';

      mockWorkOrderRepository.findById.mockResolvedValue({ id: workOrderId });
      mockPartRepository.findById.mockResolvedValue({
        id: partId,
        name: 'Repuesto',
        stock: 1,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      });

      mockPartRepository.assignToWorkOrder.mockRejectedValue(new Error('Stock insuficiente'));

      await expect(
        service.assignToWorkOrder(workOrderId, { partId, quantity: 10 })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
