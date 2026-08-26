import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagnosticService } from './diagnostics.service';
import { IDiagnosticRepository } from './diagnostics.repository';
import { IWorkOrderRepository } from '../work-orders/work-orders.repository';
import { DiagnosticRow } from './diagnostics.types';
import { NotFoundError } from '../../shared/errors/app-error';

describe('DiagnosticService', () => {
  let service: DiagnosticService;
  let mockDiagnosticRepository: Record<string, any>;
  let mockWorkOrderRepository: Record<string, any>;

  beforeEach(() => {
    mockDiagnosticRepository = {
      listByWorkOrder: vi.fn(),
      create: vi.fn(),
    };

    mockWorkOrderRepository = {
      findById: vi.fn(),
    };

    service = new DiagnosticService(
      mockDiagnosticRepository as IDiagnosticRepository,
      mockWorkOrderRepository as IWorkOrderRepository,
    );
  });

  describe('listByWorkOrder', () => {
    it('should list diagnostics for a work order', async () => {
      const workOrderId = 'wo-123';
      const mockRows: DiagnosticRow[] = [
        {
          id: 'diag-1',
          work_order_id: workOrderId,
          technician_id: 'tech-1',
          observations: 'Pantalla rota',
          faults: 'Pantalla LCD dañada',
          recommended_actions: 'Reemplazar pantalla',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockWorkOrderRepository.findById.mockResolvedValue({
        id: workOrderId,
        guide_number: 'WO-001',
      });

      mockDiagnosticRepository.listByWorkOrder.mockResolvedValue(mockRows);

      const result = await service.listByWorkOrder(workOrderId);

      expect(mockWorkOrderRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockDiagnosticRepository.listByWorkOrder).toHaveBeenCalledWith(workOrderId);
      expect(result).toHaveLength(1);
      expect(result[0].faults).toBe('Pantalla LCD dañada');
    });

    it('should throw NotFoundError when work order does not exist', async () => {
      mockWorkOrderRepository.findById.mockResolvedValue(null);

      await expect(service.listByWorkOrder('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockDiagnosticRepository.listByWorkOrder).not.toHaveBeenCalled();
    });

    it('should return empty array when no diagnostics exist', async () => {
      const workOrderId = 'wo-456';

      mockWorkOrderRepository.findById.mockResolvedValue({ id: workOrderId });
      mockDiagnosticRepository.listByWorkOrder.mockResolvedValue([]);

      const result = await service.listByWorkOrder(workOrderId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a diagnostic for a work order', async () => {
      const workOrderId = 'wo-789';
      const technicianId = 'tech-1';
      const input = {
        observations: 'Revisión inicial',
        faults: 'Batería defectuosa',
        recommendedActions: 'Cambiar batería',
      };

      const mockRow: DiagnosticRow = {
        id: 'diag-new',
        work_order_id: workOrderId,
        technician_id: technicianId,
        observations: input.observations,
        faults: input.faults,
        recommended_actions: input.recommendedActions,
        created_at: '2024-01-15T00:00:00Z',
      };

      mockWorkOrderRepository.findById.mockResolvedValue({ id: workOrderId });
      mockDiagnosticRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(workOrderId, technicianId, input);

      expect(mockWorkOrderRepository.findById).toHaveBeenCalledWith(workOrderId);
      expect(mockDiagnosticRepository.create).toHaveBeenCalledWith(workOrderId, technicianId, input);
      expect(result.id).toBe('diag-new');
      expect(result.faults).toBe('Batería defectuosa');
      expect(result.technicianId).toBe(technicianId);
    });

    it('should throw NotFoundError when work order does not exist on create', async () => {
      mockWorkOrderRepository.findById.mockResolvedValue(null);

      const input = {
        observations: 'Test',
        faults: 'Test fault',
        recommendedActions: 'Test action',
      };

      await expect(service.create('non-existent', 'tech-1', input)).rejects.toThrow(NotFoundError);
      expect(mockDiagnosticRepository.create).not.toHaveBeenCalled();
    });

    it('should map diagnostic row correctly', async () => {
      const workOrderId = 'wo-999';
      const technicianId = 'tech-2';
      const input = {
        observations: 'Diagnostico completo',
        faults: 'Múltiples fallos',
        recommendedActions: 'Reparación integral',
      };

      const mockRow: DiagnosticRow = {
        id: 'diag-mapped',
        work_order_id: workOrderId,
        technician_id: technicianId,
        observations: input.observations,
        faults: input.faults,
        recommended_actions: input.recommendedActions,
        created_at: '2024-01-20T00:00:00Z',
      };

      mockWorkOrderRepository.findById.mockResolvedValue({ id: workOrderId });
      mockDiagnosticRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(workOrderId, technicianId, input);

      expect(result).toMatchObject({
        id: 'diag-mapped',
        workOrderId,
        technicianId,
        observations: input.observations,
        faults: input.faults,
        recommendedActions: input.recommendedActions,
      });
    });
  });
});
