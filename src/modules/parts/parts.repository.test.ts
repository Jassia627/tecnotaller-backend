import { describe, it, expect, beforeAll } from 'vitest';
import { PartRepository } from './parts.repository';
import { CreatePartInput, UpdatePartInput } from './parts.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('PartRepository - Integration Tests', () => {
  let repository: PartRepository;
  const testPartIds: string[] = [];
  const testWorkOrderId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // UUID válido

  beforeAll(() => {
    repository = new PartRepository();
  });

  describe('create', () => {
    it('should create a new part', async () => {
      const input: CreatePartInput = {
        name: `Pantalla LCD ${Date.now()}`,
        sku: `SKU-PART-${Date.now()}`,
        stock: 10,
        purchasePrice: 50,
        salePrice: 100,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.sku).toBe(input.sku);
      expect(result.stock).toBe(10);
      expect(result.purchase_price).toBe(50);
      expect(result.sale_price).toBe(100);

      testPartIds.push(result.id);
    });

    it('should create part with minimal fields', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Mínimo ${Date.now()}`,
        stock: 5,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.stock).toBe(5);

      testPartIds.push(result.id);
    });

    it('should create multiple parts', async () => {
      const inputs: CreatePartInput[] = [
        {
          name: `Batería ${Date.now()}`,
          stock: 20,
          salePrice: 30,
        },
        {
          name: `Cable ${Date.now()}`,
          stock: 50,
          salePrice: 5,
        },
      ];

      for (const input of inputs) {
        const result = await repository.create(input);
        expect(result.id).toBeDefined();
        testPartIds.push(result.id);
      }
    });
  });

  describe('findById', () => {
    it('should find a part by id', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Para Buscar ${Date.now()}`,
        stock: 15,
        salePrice: 75,
      };

      const created = await repository.create(input);
      testPartIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(input.name);
      expect(found?.stock).toBe(15);
    });

    it('should return null when part does not exist', async () => {
      const result = await repository.findById('non-existent-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list parts with pagination', async () => {
      const input: CreatePartInput = {
        name: `Lista Repuesto ${Date.now()}`,
        stock: 20,
      };

      const created = await repository.create(input);
      testPartIds.push(created.id);

      const result = await repository.list({ page: 1, pageSize: 10 });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.rows.some(p => p.id === created.id)).toBe(true);
    });

    it('should order parts by name', async () => {
      const result = await repository.list({ page: 1, pageSize: 20 });

      if (result.rows.length > 1) {
        for (let i = 0; i < result.rows.length - 1; i++) {
          const current = result.rows[i].name;
          const next = result.rows[i + 1].name;
          expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
        }
      }
    });

    it('should respect page size', async () => {
      const result = await repository.list({ page: 1, pageSize: 5 });

      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination', async () => {
      const result1 = await repository.list({ page: 1, pageSize: 5 });
      const result2 = await repository.list({ page: 2, pageSize: 5 });

      // No deben repetirse IDs entre páginas
      if (result1.rows.length > 0 && result2.rows.length > 0) {
        const page1Ids = result1.rows.map(p => p.id);
        const page2Ids = result2.rows.map(p => p.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      }
    });
  });

  describe('update', () => {
    it('should update part fields', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Original ${Date.now()}`,
        stock: 10,
        salePrice: 50,
      };

      const created = await repository.create(input);
      testPartIds.push(created.id);

      const updateInput: UpdatePartInput = {
        name: 'Nombre Actualizado',
        salePrice: 75,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.name).toBe('Nombre Actualizado');
      expect(updated.sale_price).toBe(75);
      expect(updated.stock).toBe(10); // No cambió
    });

    it('should update partial fields', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Parcial ${Date.now()}`,
        sku: `SKU-PART-${Date.now()}`,
        stock: 25,
        purchasePrice: 40,
        salePrice: 80,
      };

      const created = await repository.create(input);
      testPartIds.push(created.id);

      const updateInput: UpdatePartInput = {
        purchasePrice: 45,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.purchase_price).toBe(45);
      expect(updated.name).toBe(input.name); // No cambió
      expect(updated.sale_price).toBe(input.salePrice); // No cambió
    });

    it('should update multiple fields', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Multi ${Date.now()}`,
        stock: 30,
      };

      const created = await repository.create(input);
      testPartIds.push(created.id);

      const updateInput: UpdatePartInput = {
        name: 'Nuevo Nombre',
        salePrice: 150,
        purchasePrice: 100,
        sku: `SKU-NEW-${Date.now()}`,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.name).toBe('Nuevo Nombre');
      expect(updated.sale_price).toBe(150);
      expect(updated.purchase_price).toBe(100);
    });
  });

  describe('assignToWorkOrder', () => {
    it('should assign part to work order', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Para Asignar ${Date.now()}`,
        stock: 50,
        salePrice: 100,
      };

      const part = await repository.create(input);
      testPartIds.push(part.id);

      const result = await repository.assignToWorkOrder(testWorkOrderId, part.id, 5);

      expect(result.id).toBe(part.id);
      // El stock debería decrementarse
      expect(result.stock).toBeLessThanOrEqual(part.stock);
    });

    it('should assign multiple quantities', async () => {
      const input: CreatePartInput = {
        name: `Repuesto Multi Cantidad ${Date.now()}`,
        stock: 100,
        salePrice: 50,
      };

      const part = await repository.create(input);
      testPartIds.push(part.id);

      const initialStock = part.stock;
      const result = await repository.assignToWorkOrder(testWorkOrderId, part.id, 10);

      expect(result.stock).toBe(initialStock - 10);
    });
  });
});
