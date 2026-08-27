import { describe, it, expect, beforeAll } from 'vitest';
import { ReportRepository } from './reports.repository';
import { DateRange } from './reports.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('ReportRepository - Integration Tests', () => {
  let repository: ReportRepository;

  beforeAll(() => {
    repository = new ReportRepository();
  });

  describe('countServices', () => {
    it('should count all services without date filter', async () => {
      const filters: DateRange = {};

      const result = await repository.countServices(filters);

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byService');
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.byService)).toBe(true);
    });

    it('should count services with start date filter', async () => {
      const filters: DateRange = {
        from: '2024-01-01T00:00:00Z',
      };

      const result = await repository.countServices(filters);

      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should count services with date range', async () => {
      const filters: DateRange = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      };

      const result = await repository.countServices(filters);

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.byService.length).toBeGreaterThanOrEqual(0);
    });

    it('should return byService data structure', async () => {
      const filters: DateRange = {};

      const result = await repository.countServices(filters);

      result.byService.forEach(service => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('count');
        expect(typeof service.name).toBe('string');
        expect(typeof service.count).toBe('number');
      });
    });

    it('should handle date ranges correctly', async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const filters: DateRange = {
        from: `${today}T00:00:00Z`,
        to: `${today}T23:59:59Z`,
      };

      const result = await repository.countServices(filters);

      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('inventorySnapshot', () => {
    it('should get inventory snapshot', async () => {
      const result = await repository.inventorySnapshot();

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('parts');
      expect(Array.isArray(result.products)).toBe(true);
      expect(Array.isArray(result.parts)).toBe(true);
    });

    it('should return products with correct structure', async () => {
      const result = await repository.inventorySnapshot();

      result.products.forEach(product => {
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('sku');
        expect(product).toHaveProperty('stock');
        expect(typeof product.name).toBe('string');
        expect(typeof product.sku).toBe('string');
        expect(typeof product.stock).toBe('number');
      });
    });

    it('should return parts with correct structure', async () => {
      const result = await repository.inventorySnapshot();

      result.parts.forEach(part => {
        expect(part).toHaveProperty('name');
        expect(part).toHaveProperty('sku');
        expect(part).toHaveProperty('stock');
        expect(typeof part.name).toBe('string');
        expect(typeof part.sku).toBe('string');
        expect(typeof part.stock).toBe('number');
      });
    });

    it('should return products ordered by name', async () => {
      const result = await repository.inventorySnapshot();

      if (result.products.length > 1) {
        for (let i = 0; i < result.products.length - 1; i++) {
          const current = result.products[i].name;
          const next = result.products[i + 1].name;
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should return parts ordered by name', async () => {
      const result = await repository.inventorySnapshot();

      if (result.parts.length > 1) {
        for (let i = 0; i < result.parts.length - 1; i++) {
          const current = result.parts[i].name;
          const next = result.parts[i + 1].name;
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should handle empty inventory', async () => {
      const result = await repository.inventorySnapshot();

      // Puede estar vacío o tener elementos
      expect(Array.isArray(result.products)).toBe(true);
      expect(Array.isArray(result.parts)).toBe(true);
    });
  });

  describe('ordersByStatus', () => {
    it('should get orders by status without date filter', async () => {
      const filters: DateRange = {};

      const result = await repository.ordersByStatus(filters);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(item => {
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('count');
        expect(typeof item.status).toBe('string');
        expect(typeof item.count).toBe('number');
        expect(item.count).toBeGreaterThan(0);
      });
    });

    it('should get orders by status with date range', async () => {
      const filters: DateRange = {
        from: '2024-01-01T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      };

      const result = await repository.ordersByStatus(filters);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should include valid order statuses', async () => {
      const validStatuses = [
        'INGRESADO',
        'EN_REVISION',
        'ESPERANDO_REPUESTO',
        'EN_REPARACION',
        'REPARADO',
        'LISTO_PARA_ENTREGA',
        'ENTREGADO',
      ];

      const filters: DateRange = {};
      const result = await repository.ordersByStatus(filters);

      result.forEach(item => {
        expect(validStatuses).toContain(item.status);
      });
    });

    it('should return counts greater than zero', async () => {
      const filters: DateRange = {};
      const result = await repository.ordersByStatus(filters);

      result.forEach(item => {
        expect(item.count).toBeGreaterThan(0);
      });
    });

    it('should handle date range from today', async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const filters: DateRange = {
        from: `${today}T00:00:00Z`,
        to: `${today}T23:59:59Z`,
      };

      const result = await repository.ordersByStatus(filters);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle future date range', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const filters: DateRange = {
        from: `${tomorrowStr}T00:00:00Z`,
        to: `${tomorrowStr}T23:59:59Z`,
      };

      const result = await repository.ordersByStatus(filters);

      // Puede estar vacío para fechas futuras
      expect(Array.isArray(result)).toBe(true);
    });

    it('should aggregate counts by status correctly', async () => {
      const filters: DateRange = {};
      const result = await repository.ordersByStatus(filters);

      // No debe haber duplicados de status
      const statuses = result.map(item => item.status);
      const uniqueStatuses = new Set(statuses);
      expect(statuses.length).toBe(uniqueStatuses.size);
    });
  });
});
