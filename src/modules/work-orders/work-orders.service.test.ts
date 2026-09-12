import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderService } from './work-orders.service';
import { IWorkOrderRepository } from './work-orders.repository';
import { GuidGenerator } from '../../shared/utils/guid';
import { OrderStatus, WorkOrderRow, WorkOrder } from './work-orders.types';
import { NotFoundError, ForbiddenError } from '../../shared/errors/app-error';

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let mockRepository: Record<string, any>;
  let mockGuid: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      transitionStatus: vi.fn(),
      listHistory: vi.fn(),
      findByGuideNumber: vi.fn(),
      listHistoryByGuide: vi.fn(),
      addPhoto: vi.fn(),
      registerExit: vi.fn(),
    };

    mockGuid = {
      generate: vi.fn(() => 'a1b2c3d4e5f6g7h8'),
    };

    service = new WorkOrderService(mockRepository as IWorkOrderRepository, mockGuid as GuidGenerator);
  });

  describe('create', () => {
    it('should create a work order with generated guide number', async () => {
      const input = {
        customerId: 'cust-123',
        technicianId: null,
        deviceBrand: 'Apple',
        deviceModel: 'iPhone 13',
        deviceSerial: 'ABC123',
        problemDescription: 'Pantalla rota',
      };

      const mockRow: WorkOrderRow = {
        id: 'wo-1',
        guide_number: 'A1B2C3D4',
        customer_id: input.customerId,
        technician_id: null,
        device_brand: input.deviceBrand,
        device_model: input.deviceModel,
        device_serial: input.deviceSerial,
        problem_description: input.problemDescription,
        device_password_encrypted: null,
        accessories: null,
        current_status: 'INGRESADO',
        created_at: '2024-01-15T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockGuid.generate).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(input, 'A1B2C3D4');
      expect(result).toBeInstanceOf(WorkOrder);
      expect(result.guideNumber).toBe('A1B2C3D4');
      expect(result.currentStatus).toBe('INGRESADO');
    });
  });

  describe('getById', () => {
    it('should get a work order by id', async () => {
      const workOrderId = 'wo-123';
      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-001',
        customer_id: 'cust-1',
        technician_id: 'tech-1',
        device_brand: 'Samsung',
        device_model: 'Galaxy S21',
        device_serial: 'XYZ789',
        problem_description: 'No enciende',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'EN_REVISION',
        created_at: '2024-01-15T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById(workOrderId);

      expect(mockRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(result).toBeInstanceOf(WorkOrder);
      expect(result.currentStatus).toBe('EN_REVISION');
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    it('should list work orders with pagination', async () => {
      const options = { page: 1, pageSize: 10 };
      const mockRows: WorkOrderRow[] = [
        {
          id: 'wo-1',
          guide_number: 'WO-001',
          customer_id: null,
          technician_id: null,
          device_brand: 'Apple',
          device_model: 'iPhone',
          device_serial: 'ABC',
          problem_description: 'Test',
          device_password_encrypted: null,
          accessories: null,
          current_status: 'INGRESADO',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 1,
      });

      const result = await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      const options = { page: 1, pageSize: 10, status: 'EN_REPARACION' as OrderStatus };

      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 0,
      });

      await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
    });
  });

  describe('transitionStatus', () => {
    it('should transition to valid next status', async () => {
      const workOrderId = 'wo-456';
      const userId = 'user-1';

      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-002',
        customer_id: null,
        technician_id: null,
        device_brand: 'Samsung',
        device_model: 'Galaxy',
        device_serial: 'XYZ',
        problem_description: 'Test',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'INGRESADO',
        created_at: '2024-01-01T00:00:00Z',
      };

      const transitionedRow: WorkOrderRow = {
        ...mockRow,
        current_status: 'EN_REVISION',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.transitionStatus.mockResolvedValue(transitionedRow);

      const result = await service.transitionStatus(workOrderId, 'EN_REVISION', userId);

      expect(mockRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockRepository.transitionStatus).toHaveBeenCalledWith(workOrderId, 'INGRESADO', 'EN_REVISION', userId);
      expect(result.currentStatus).toBe('EN_REVISION');
    });

    it('should throw ForbiddenError on invalid transition', async () => {
      const workOrderId = 'wo-789';
      const userId = 'user-1';

      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-003',
        customer_id: null,
        technician_id: null,
        device_brand: 'Sony',
        device_model: 'Xperia',
        device_serial: 'ABC',
        problem_description: 'Test',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'ENTREGADO',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      // ENTREGADO no puede transicionar a ningún estado
      await expect(service.transitionStatus(workOrderId, 'INGRESADO', userId)).rejects.toThrow(ForbiddenError);
      expect(mockRepository.transitionStatus).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('should get status history for a work order', async () => {
      const workOrderId = 'wo-123';
      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-001',
        customer_id: null,
        technician_id: null,
        device_brand: 'Apple',
        device_model: 'iPhone',
        device_serial: 'ABC',
        problem_description: 'Test',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'EN_REVISION',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockHistory: any[] = [
        {
          id: 'hist-1',
          from_status: 'INGRESADO',
          to_status: 'EN_REVISION',
          user_id: 'user-1',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.listHistory.mockResolvedValue(mockHistory);

      const result = await service.getHistory(workOrderId);

      expect(mockRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockRepository.listHistory).toHaveBeenCalledWith(workOrderId);
      expect(result).toHaveLength(1);
      expect(result[0].fromStatus).toBe('INGRESADO');
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getHistory('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.listHistory).not.toHaveBeenCalled();
    });
  });

  describe('trackByGuide', () => {
    it('should track work order by guide number', async () => {
      const guideNumber = 'WO-001';
      const mockRow: WorkOrderRow = {
        id: 'wo-123',
        guide_number: guideNumber,
        customer_id: null,
        technician_id: null,
        device_brand: 'Apple',
        device_model: 'iPhone',
        device_serial: 'ABC',
        problem_description: 'Test',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'REPARADO',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockHistory: any[] = [
        {
          id: 'hist-1',
          from_status: 'INGRESADO',
          to_status: 'EN_REVISION',
          user_id: 'user-1',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockRepository.findByGuideNumber.mockResolvedValue(mockRow);
      mockRepository.listHistoryByGuide.mockResolvedValue(mockHistory);

      const result = await service.trackByGuide(guideNumber);

      expect(result.order).toBeInstanceOf(WorkOrder);
      expect(result.order.guideNumber).toBe(guideNumber);
      expect(result.history).toHaveLength(1);
    });

    it('should throw NotFoundError when guide number not found', async () => {
      mockRepository.findByGuideNumber.mockResolvedValue(null);

      await expect(service.trackByGuide('INVALID-GUIDE')).rejects.toThrow(NotFoundError);
      expect(mockRepository.listHistoryByGuide).not.toHaveBeenCalled();
    });
  });

  describe('addPhoto', () => {
    it('should add a photo to a work order', async () => {
      const workOrderId = 'wo-123';
      const storagePath = 'photos/wo-123/initial.jpg';

      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-001',
        customer_id: null,
        technician_id: null,
        device_brand: 'Apple',
        device_model: 'iPhone',
        device_serial: 'ABC',
        problem_description: 'Test',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'EN_REVISION',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.addPhoto.mockResolvedValue(undefined);

      await service.addPhoto(workOrderId, storagePath, 'inicial');

      expect(mockRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockRepository.addPhoto).toHaveBeenCalledWith(workOrderId, storagePath, 'inicial');
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.addPhoto('non-existent', 'path', 'inicial')).rejects.toThrow(NotFoundError);
      expect(mockRepository.addPhoto).not.toHaveBeenCalled();
    });
  });

  describe('registerExit', () => {
    it('should register exit for a work order', async () => {
      const workOrderId = 'wo-456';
      const input = {
        finalState: 'Funcionando correctamente',
        repairsPerformed: 'Cambio de pantalla',
        partsUsed: 'Pantalla LCD Samsung',
        observations: 'Prueba exitosa',
      };

      const mockRow: WorkOrderRow = {
        id: workOrderId,
        guide_number: 'WO-002',
        customer_id: null,
        technician_id: null,
        device_brand: 'Samsung',
        device_model: 'Galaxy',
        device_serial: 'XYZ',
        problem_description: 'Pantalla rota',
        device_password_encrypted: null,
        accessories: null,
        current_status: 'LISTO_PARA_ENTREGA',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.registerExit.mockResolvedValue(mockRow);

      const result = await service.registerExit(workOrderId, input);

      expect(mockRepository.registerExit).toHaveBeenCalledWith(workOrderId, input);
      expect(result).toBeInstanceOf(WorkOrder);
    });
  });
});
