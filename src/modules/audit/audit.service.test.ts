import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditService } from './audit.service';
import { IAuditRepository } from './audit.repository';

describe('AuditService', () => {
  let service: AuditService;
  let mockRepository: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      list: vi.fn(),
      record: vi.fn(),
    };

    service = new AuditService(mockRepository as IAuditRepository);
  });

  describe('list', () => {
    it('should list audit logs with pagination', async () => {
      const options = { page: 1, pageSize: 10 };
      const mockRows: any[] = [
        {
          id: 'audit-1',
          user_id: 'user-1',
          action: 'CREATE',
          entity: 'services',
          entity_id: 'service-1',
          details: { name: 'Nuevo servicio' },
          created_at: '2024-01-01T10:00:00Z',
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
      expect(result.items[0].action).toBe('CREATE');
    });

    it('should filter by entity', async () => {
      const options = { page: 1, pageSize: 10, entity: 'work-orders' };

      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 0,
      });

      await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
    });

    it('should filter by userId', async () => {
      const options = { page: 1, pageSize: 10, userId: 'user-123' };

      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 0,
      });

      await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
    });

    it('should return empty list when no logs', async () => {
      const options = { page: 1, pageSize: 10 };

      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 0,
      });

      const result = await service.list(options);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('record', () => {
    it('should record an audit log', async () => {
      const input = {
        userId: 'user-1',
        action: 'UPDATE',
        entity: 'products',
        entityId: 'prod-123',
        details: { oldStock: 100, newStock: 95 },
      };

      mockRepository.record.mockResolvedValue(undefined);

      await service.record(input);

      expect(mockRepository.record).toHaveBeenCalledWith(input);
    });

    it('should record without entity id', async () => {
      const input = {
        userId: 'user-2',
        action: 'DELETE',
        entity: 'users',
      };

      mockRepository.record.mockResolvedValue(undefined);

      await service.record(input);

      expect(mockRepository.record).toHaveBeenCalledWith(input);
    });

    it('should record without details', async () => {
      const input = {
        userId: 'user-3',
        action: 'READ',
        entity: 'reports',
      };

      mockRepository.record.mockResolvedValue(undefined);

      await service.record(input);

      expect(mockRepository.record).toHaveBeenCalledWith(input);
    });

    it('should record complex actions', async () => {
      const input = {
        userId: 'user-4',
        action: 'BULK_UPDATE',
        entity: 'appointments',
        details: {
          count: 10,
          oldStatus: 'pendiente',
          newStatus: 'confirmada',
        },
      };

      mockRepository.record.mockResolvedValue(undefined);

      await service.record(input);

      expect(mockRepository.record).toHaveBeenCalledWith(input);
    });
  });
});
