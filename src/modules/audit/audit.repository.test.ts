import { describe, it, expect, beforeAll } from 'vitest';
import { AuditRepository } from './audit.repository';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('AuditRepository - Integration Tests', () => {
  let repository: AuditRepository;
  const testUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // UUID válido

  beforeAll(() => {
    repository = new AuditRepository();
  });

  describe('record', () => {
    it('should record an audit log entry', async () => {
      const input = {
        userId: testUserId,
        action: 'CREATE',
        entity: 'services',
        entityId: 'service-123',
        details: { name: 'Nuevo servicio' },
      };

      await repository.record(input);

      // Verificar que se registró
      const result = await repository.list({ page: 1, pageSize: 10 });
      const found = result.rows.find(
        log => log.user_id === testUserId && log.action === 'CREATE' && log.entity === 'services'
      );

      expect(found).toBeDefined();
    });

    it('should record log without entity id', async () => {
      const input = {
        userId: testUserId,
        action: 'DELETE',
        entity: 'users',
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10 });
      const found = result.rows.find(log => log.user_id === testUserId && log.action === 'DELETE');

      expect(found?.entity_id).toBeNull();
    });

    it('should record log without details', async () => {
      const input = {
        userId: testUserId,
        action: 'READ',
        entity: 'reports',
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10 });
      const found = result.rows.find(log => log.user_id === testUserId && log.action === 'READ');

      expect(found?.details).toBeNull();
    });

    it('should record logs with complex details', async () => {
      const input = {
        userId: testUserId,
        action: 'UPDATE',
        entity: 'products',
        entityId: 'prod-456',
        details: {
          oldValues: { name: 'Old Name', price: 100 },
          newValues: { name: 'New Name', price: 150 },
        },
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10 });
      const found = result.rows.find(
        log => log.user_id === testUserId && log.action === 'UPDATE' && log.entity === 'products'
      );

      expect(found?.details).toBeDefined();
    });

    it('should record multiple audit entries', async () => {
      const inputs = [
        { userId: testUserId, action: 'CREATE', entity: 'appointments' },
        { userId: testUserId, action: 'UPDATE', entity: 'customers' },
        { userId: testUserId, action: 'DELETE', entity: 'parts' },
      ];

      for (const input of inputs) {
        await repository.record(input);
      }

      const result = await repository.list({ page: 1, pageSize: 20 });
      const found = result.rows.filter(log => log.user_id === testUserId);

      expect(found.length).toBeGreaterThanOrEqual(inputs.length);
    });
  });

  describe('list', () => {
    it('should list audit logs with pagination', async () => {
      const input = {
        userId: testUserId,
        action: 'LIST_TEST',
        entity: 'test_entity',
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10 });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should filter by entity', async () => {
      const input = {
        userId: testUserId,
        action: 'FILTER_TEST',
        entity: 'filtered_entity',
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10, entity: 'filtered_entity' });

      result.rows.forEach(log => {
        expect(log.entity).toBe('filtered_entity');
      });
    });

    it('should filter by userId', async () => {
      const input = {
        userId: testUserId,
        action: 'USER_FILTER',
        entity: 'user_filter_entity',
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10, userId: testUserId });

      result.rows.forEach(log => {
        expect(log.user_id).toBe(testUserId);
      });
    });

    it('should filter by entity and userId', async () => {
      const input = {
        userId: testUserId,
        action: 'COMBINED_FILTER',
        entity: 'combined_entity',
      };

      await repository.record(input);

      const result = await repository.list({
        page: 1,
        pageSize: 10,
        entity: 'combined_entity',
        userId: testUserId,
      });

      result.rows.forEach(log => {
        expect(log.entity).toBe('combined_entity');
        expect(log.user_id).toBe(testUserId);
      });
    });

    it('should return logs ordered by creation date (newest first)', async () => {
      const result = await repository.list({ page: 1, pageSize: 20 });

      if (result.rows.length > 1) {
        for (let i = 0; i < result.rows.length - 1; i++) {
          const current = new Date(result.rows[i].created_at);
          const next = new Date(result.rows[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should respect page size', async () => {
      const result = await repository.list({ page: 1, pageSize: 5 });

      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination correctly', async () => {
      const page1 = await repository.list({ page: 1, pageSize: 5 });
      const page2 = await repository.list({ page: 2, pageSize: 5 });

      if (page1.rows.length > 0 && page2.rows.length > 0) {
        const page1Ids = page1.rows.map(log => log.id);
        const page2Ids = page2.rows.map(log => log.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      }
    });
  });

  describe('audit log structure', () => {
    it('should have all required fields', async () => {
      const input = {
        userId: testUserId,
        action: 'STRUCTURE_TEST',
        entity: 'structure_entity',
        entityId: 'entity-123',
        details: { test: 'data' },
      };

      await repository.record(input);

      const result = await repository.list({ page: 1, pageSize: 10 });
      const found = result.rows.find(log => log.action === 'STRUCTURE_TEST');

      expect(found).toHaveProperty('id');
      expect(found).toHaveProperty('user_id');
      expect(found).toHaveProperty('action');
      expect(found).toHaveProperty('entity');
      expect(found).toHaveProperty('entity_id');
      expect(found).toHaveProperty('details');
      expect(found).toHaveProperty('created_at');
    });
  });
});
