import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarrantyService } from './warranties.service';
import { IWarrantyRepository } from './warranties.repository';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';

describe('WarrantyService', () => {
  let service: WarrantyService;
  let mockWarrantyRepository: Record<string, any>;
  let mockWorkOrderRepository: Record<string, any>;

  beforeEach(() => {
    mockWarrantyRepository = {
      create: vi.fn(),
      findByWorkOrder: vi.fn(),
    };

    mockWorkOrderRepository = {
      findById: vi.fn(),
    };

    service = new WarrantyService(
      mockWarrantyRepository as IWarrantyRepository,
      mockWorkOrderRepository as IWorkOrderRepository,
    );
  });

  describe('create', () => {
    it('should create a warranty for a work order', async () => {
      const workOrderId = 'wo-123';
      const input = {
        duration_months: 12,
        coverage: 'Componentes',
      };

      const mockWorkOrder = { id: workOrderId };
      const mockWarranty: any = {
        id: 'war-1',
        work_order_id: workOrderId,
        status: 'vigente',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockWorkOrderRepository.findById.mockResolvedValue(mockWorkOrder);
      mockWarrantyRepository.findByWorkOrder.mockResolvedValue(null);
      mockWarrantyRepository.create.mockResolvedValue(mockWarranty);

      const result = await service.create(workOrderId, input);

      expect(mockWorkOrderRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockWarrantyRepository.findByWorkOrder).toHaveBeenCalledWith(workOrderId);
      expect(mockWarrantyRepository.create).toHaveBeenCalledWith(workOrderId, input);
      expect(result.status).toBe('vigente');
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockWorkOrderRepository.findById.mockResolvedValue(null);

      const input = {
        duration_months: 12,
        coverage: 'Componentes',
      };

      await expect(service.create('non-existent', input)).rejects.toThrow(NotFoundError);
      expect(mockWarrantyRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when warranty already exists and is vigente', async () => {
      const workOrderId = 'wo-456';
      const input = {
        duration_months: 12,
        coverage: 'Componentes',
      };

      const mockWorkOrder = { id: workOrderId };
      const existingWarranty: any = {
        id: 'war-existing',
        work_order_id: workOrderId,
        status: 'vigente',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockWorkOrderRepository.findById.mockResolvedValue(mockWorkOrder);
      mockWarrantyRepository.findByWorkOrder.mockResolvedValue(existingWarranty);

      await expect(service.create(workOrderId, input)).rejects.toThrow(ConflictError);
      expect(mockWarrantyRepository.create).not.toHaveBeenCalled();
    });

    it('should allow creating warranty if existing one is expired', async () => {
      const workOrderId = 'wo-789';
      const input = {
        duration_months: 12,
        coverage: 'Componentes',
      };

      const mockWorkOrder = { id: workOrderId };
      const expiredWarranty: any = {
        id: 'war-expired',
        status: 'expirada',
      };

      const newWarranty: any = {
        id: 'war-new',
        work_order_id: workOrderId,
        status: 'vigente',
        created_at: '2024-01-15T00:00:00Z',
      };

      mockWorkOrderRepository.findById.mockResolvedValue(mockWorkOrder);
      mockWarrantyRepository.findByWorkOrder.mockResolvedValue(expiredWarranty);
      mockWarrantyRepository.create.mockResolvedValue(newWarranty);

      const result = await service.create(workOrderId, input);

      expect(mockWarrantyRepository.create).toHaveBeenCalled();
      expect(result.status).toBe('vigente');
    });
  });

  describe('getByWorkOrder', () => {
    it('should get warranty by work order', async () => {
      const workOrderId = 'wo-123';
      const mockWarranty: any = {
        id: 'war-1',
        work_order_id: workOrderId,
        status: 'vigente',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockWarrantyRepository.findByWorkOrder.mockResolvedValue(mockWarranty);

      const result = await service.getByWorkOrder(workOrderId);

      expect(mockWarrantyRepository.findByWorkOrder).toHaveBeenCalledWith(workOrderId);
      expect(result?.status).toBe('vigente');
    });

    it('should return null when no warranty exists', async () => {
      const workOrderId = 'wo-456';

      mockWarrantyRepository.findByWorkOrder.mockResolvedValue(null);

      const result = await service.getByWorkOrder(workOrderId);

      expect(result).toBeNull();
    });
  });
});
