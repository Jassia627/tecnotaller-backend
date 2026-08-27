import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportService } from './reports.service';
import { IReportRepository } from './reports.repository';
import { BadRequestError } from '../../shared/errors/app-error';

describe('ReportService', () => {
  let service: ReportService;
  let mockRepository: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      getServicesByDateRange: vi.fn(),
      getInventoryByDateRange: vi.fn(),
      getOrdersByStatusByDateRange: vi.fn(),
    };

    service = new ReportService(mockRepository as IReportRepository);
  });

  describe('generate', () => {
    it('should generate a services report', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockReport = {
        type: 'services',
        data: [
          {
            serviceId: 'service-1',
            serviceName: 'Reparación de pantalla',
            count: 10,
          },
        ],
      };

      mockRepository.getServicesByDateRange.mockResolvedValue(mockReport);

      const result = await service.generate('services', filters);

      expect(result).toEqual(mockReport);
    });

    it('should generate an inventory report', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockReport = {
        type: 'inventory',
        data: [
          {
            partId: 'part-1',
            partName: 'Pantalla LCD',
            initial: 100,
            used: 15,
            final: 85,
          },
        ],
      };

      mockRepository.getInventoryByDateRange.mockResolvedValue(mockReport);

      const result = await service.generate('inventory', filters);

      expect(result).toEqual(mockReport);
    });

    it('should generate an orders by status report', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      const mockReport = {
        type: 'orders-by-status',
        data: {
          INGRESADO: 5,
          EN_REVISION: 3,
          EN_REPARACION: 8,
          REPARADO: 2,
        },
      };

      mockRepository.getOrdersByStatusByDateRange.mockResolvedValue(mockReport);

      const result = await service.generate('orders-by-status', filters);

      expect(result).toEqual(mockReport);
    });

    it('should throw BadRequestError for unsupported report type', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await expect(service.generate('unsupported-type' as any, filters)).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError with descriptive message', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      try {
        await service.generate('invalid-report' as any, filters);
        expect.fail('Should have thrown BadRequestError');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toContain('no soportado');
      }
    });

    it('should handle date ranges correctly', async () => {
      const filters = {
        startDate: '2024-12-01',
        endDate: '2024-12-31',
      };

      const mockReport = {
        type: 'services',
        period: 'December 2024',
        data: [],
      };

      mockRepository.getServicesByDateRange.mockResolvedValue(mockReport);

      const result = await service.generate('services', filters);

      expect(result).toBeDefined();
    });

    it('should support different date formats', async () => {
      const filters = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      };

      const mockReport = {
        type: 'inventory',
        data: [],
      };

      mockRepository.getInventoryByDateRange.mockResolvedValue(mockReport);

      const result = await service.generate('inventory', filters);

      expect(result).toBeDefined();
    });
  });
});
