import { describe, it, expect, beforeAll } from 'vitest';
import { WarrantyRepository } from './warranties.repository';
import { CreateWarrantyInput } from './warranties.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('WarrantyRepository - Integration Tests', () => {
  let repository: WarrantyRepository;
  const testWarrantyIds: string[] = [];
  const testWorkOrderId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // UUID válido

  beforeAll(() => {
    repository = new WarrantyRepository();
  });

  describe('create', () => {
    it('should create a new warranty', async () => {
      const input: CreateWarrantyInput = {
        periodDays: 365,
      };

      const result = await repository.create(testWorkOrderId, input);

      expect(result.id).toBeDefined();
      expect(result.work_order_id).toBe(testWorkOrderId);
      expect(result.period_days).toBe(365);
      expect(result.status).toBe('vigente');
      expect(result.expires_at).toBeDefined();

      testWarrantyIds.push(result.id);
    });

    it('should calculate expiration date correctly', async () => {
      const periodDays = 180;
      const input: CreateWarrantyInput = {
        periodDays,
      };

      const beforeCreate = new Date();
      const result = await repository.create(testWorkOrderId, input);
      const afterCreate = new Date();

      expect(result.expires_at).toBeDefined();

      const expiresDate = new Date(result.expires_at);
      const expectedExpires = new Date(beforeCreate.getTime() + periodDays * 24 * 60 * 60 * 1000);

      // Verificar que está en el rango esperado (±5 minutos de tolerancia)
      const timeDiff = Math.abs(expiresDate.getTime() - expectedExpires.getTime());
      expect(timeDiff).toBeLessThan(5 * 60 * 1000);

      testWarrantyIds.push(result.id);
    });

    it('should create multiple warranties with different periods', async () => {
      const inputs: CreateWarrantyInput[] = [
        { periodDays: 90 },
        { periodDays: 180 },
        { periodDays: 365 },
      ];

      for (const input of inputs) {
        const result = await repository.create(testWorkOrderId, input);
        expect(result.id).toBeDefined();
        testWarrantyIds.push(result.id);
      }
    });
  });

  describe('findByWorkOrder', () => {
    it('should find warranty by work order id', async () => {
      const input: CreateWarrantyInput = {
        periodDays: 365,
      };

      const created = await repository.create(testWorkOrderId, input);
      testWarrantyIds.push(created.id);

      const found = await repository.findByWorkOrder(testWorkOrderId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.work_order_id).toBe(testWorkOrderId);
      expect(found?.status).toBe('vigente');
    });

    it('should return null when warranty does not exist', async () => {
      const nonExistentWorkOrderId = 'non-existent-' + Date.now();
      const result = await repository.findByWorkOrder(nonExistentWorkOrderId);
      expect(result).toBeNull();
    });

    it('should return most recent warranty when multiple exist', async () => {
      const input1: CreateWarrantyInput = { periodDays: 180 };
      const input2: CreateWarrantyInput = { periodDays: 365 };

      const warranty1 = await repository.create(testWorkOrderId, input1);
      testWarrantyIds.push(warranty1.id);

      // Pequeña espera para asegurar timestamps diferentes
      await new Promise(resolve => setTimeout(resolve, 10));

      const warranty2 = await repository.create(testWorkOrderId, input2);
      testWarrantyIds.push(warranty2.id);

      const found = await repository.findByWorkOrder(testWorkOrderId);

      // Debería retornar el más reciente (warranty2)
      expect(found?.id).toBe(warranty2.id);
    });
  });

  describe('warranty properties', () => {
    it('should have correct initial status', async () => {
      const input: CreateWarrantyInput = {
        periodDays: 90,
      };

      const result = await repository.create(testWorkOrderId, input);
      testWarrantyIds.push(result.id);

      expect(result.status).toBe('vigente');
    });

    it('should have all required properties', async () => {
      const input: CreateWarrantyInput = {
        periodDays: 365,
      };

      const result = await repository.create(testWorkOrderId, input);
      testWarrantyIds.push(result.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('work_order_id');
      expect(result).toHaveProperty('period_days');
      expect(result).toHaveProperty('expires_at');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('created_at');
    });

    it('should store period days correctly', async () => {
      const periods = [30, 90, 180, 365, 730];

      for (const periodDays of periods) {
        const input: CreateWarrantyInput = { periodDays };
        const result = await repository.create(testWorkOrderId, input);
        expect(result.period_days).toBe(periodDays);
        testWarrantyIds.push(result.id);
      }
    });
  });
});
