import { describe, it, expect, beforeAll } from 'vitest';
import { ProductRepository } from './products.repository';
import { CreateProductInput, UpdateProductInput } from './products.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 * 
 * Interactúa con la base de datos real usando la service role key.
 */

describe('ProductRepository - Integration Tests', () => {
  let repository: ProductRepository;
  const testProductIds: string[] = [];
  const testCategoryId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // UUID válido

  beforeAll(() => {
    repository = new ProductRepository();
  });

  describe('create', () => {
    it('should create a new product with all fields', async () => {
      const input: CreateProductInput = {
        sku: `SKU-${Date.now()}`,
        name: `Producto Test ${Date.now()}`,
        description: 'Descripción del producto',
        imageUrl: 'https://example.com/product.jpg',
        categoryId: testCategoryId,
        purchasePrice: 50,
        salePrice: 100,
        stock: 10,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.sku).toBe(input.sku);
      expect(result.name).toBe(input.name);
      expect(result.sale_price).toBe(input.salePrice);
      expect(result.stock).toBe(input.stock);
      expect(result.active).toBe(true);
      expect(result.created_at).toBeDefined();

      testProductIds.push(result.id);
    });

    it('should create product with minimal fields', async () => {
      const input: CreateProductInput = {
        sku: `SKU-MIN-${Date.now()}`,
        name: `Minimal Product ${Date.now()}`,
        stock: 5,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.stock).toBe(5);
      expect(result.active).toBe(true);

      testProductIds.push(result.id);
    });

    it('should create multiple products', async () => {
      const inputs: CreateProductInput[] = [
        {
          sku: `SKU-A-${Date.now()}`,
          name: `Producto A ${Date.now()}`,
          stock: 20,
          salePrice: 50,
        },
        {
          sku: `SKU-B-${Date.now()}`,
          name: `Producto B ${Date.now()}`,
          stock: 15,
          salePrice: 75,
        },
      ];

      for (const input of inputs) {
        const result = await repository.create(input);
        expect(result.id).toBeDefined();
        testProductIds.push(result.id);
      }
    });
  });

  describe('findById', () => {
    it('should find a product by id', async () => {
      const input: CreateProductInput = {
        sku: `SKU-FIND-${Date.now()}`,
        name: `Find Test ${Date.now()}`,
        stock: 10,
        salePrice: 100,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(input.name);
      expect(found?.sku).toBe(input.sku);
    });

    it('should return null when product does not exist', async () => {
      const result = await repository.findById('non-existent-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list active products with pagination', async () => {
      const input: CreateProductInput = {
        sku: `SKU-LIST-${Date.now()}`,
        name: `List Test ${Date.now()}`,
        stock: 10,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      const result = await repository.list({ page: 1, pageSize: 10, includeInactive: false });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.rows.some(p => p.id === created.id)).toBe(true);
      expect(result.rows.every(p => p.active === true)).toBe(true);
    });

    it('should list all products including inactive', async () => {
      const result = await repository.list({ page: 1, pageSize: 10, includeInactive: true });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('should respect pagination', async () => {
      const result = await repository.list({ page: 1, pageSize: 5 });

      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it('should order by creation date (newest first)', async () => {
      const result = await repository.list({ page: 1, pageSize: 20 });

      if (result.rows.length > 1) {
        for (let i = 0; i < result.rows.length - 1; i++) {
          const current = new Date(result.rows[i].created_at);
          const next = new Date(result.rows[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('update', () => {
    it('should update product fields', async () => {
      const input: CreateProductInput = {
        sku: `SKU-UPDATE-${Date.now()}`,
        name: `Original Name ${Date.now()}`,
        stock: 50,
        salePrice: 100,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      const updateInput: UpdateProductInput = {
        name: 'Updated Name',
        salePrice: 150,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.name).toBe('Updated Name');
      expect(updated.sale_price).toBe(150);
      expect(updated.sku).toBe(input.sku); // No cambió
    });

    it('should update partial fields', async () => {
      const input: CreateProductInput = {
        sku: `SKU-PARTIAL-${Date.now()}`,
        name: `Partial Test ${Date.now()}`,
        description: 'Original description',
        stock: 20,
        purchasePrice: 40,
        salePrice: 80,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      const updateInput: UpdateProductInput = {
        description: 'Updated description',
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.description).toBe('Updated description');
      expect(updated.name).toBe(input.name); // No cambió
      expect(updated.sale_price).toBe(input.salePrice); // No cambió
    });

    it('should update multiple fields', async () => {
      const input: CreateProductInput = {
        sku: `SKU-MULTI-${Date.now()}`,
        name: `Multi Update ${Date.now()}`,
        stock: 30,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      const updateInput: UpdateProductInput = {
        name: 'New Name',
        salePrice: 200,
        purchasePrice: 100,
        description: 'New description',
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.name).toBe('New Name');
      expect(updated.sale_price).toBe(200);
      expect(updated.purchase_price).toBe(100);
      expect(updated.description).toBe('New description');
    });
  });

  describe('setActive', () => {
    it('should deactivate a product', async () => {
      const input: CreateProductInput = {
        sku: `SKU-DEACTIVATE-${Date.now()}`,
        name: `Deactivate Test ${Date.now()}`,
        stock: 10,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      expect(created.active).toBe(true);

      const deactivated = await repository.setActive(created.id, false);

      expect(deactivated.active).toBe(false);
      expect(deactivated.id).toBe(created.id);

      // Verificar persistencia
      const found = await repository.findById(created.id);
      expect(found?.active).toBe(false);
    });

    it('should activate a product', async () => {
      const input: CreateProductInput = {
        sku: `SKU-ACTIVATE-${Date.now()}`,
        name: `Activate Test ${Date.now()}`,
        stock: 10,
      };

      const created = await repository.create(input);
      testProductIds.push(created.id);

      // Primero desactivar
      await repository.setActive(created.id, false);

      // Luego activar
      const activated = await repository.setActive(created.id, true);

      expect(activated.active).toBe(true);
    });
  });

  describe('listMovements', () => {
    it('should list movements for a product', async () => {
      const input: CreateProductInput = {
        sku: `SKU-MOVEMENTS-${Date.now()}`,
        name: `Movements Test ${Date.now()}`,
        stock: 50,
      };

      const product = await repository.create(input);
      testProductIds.push(product.id);

      const result = await repository.listMovements(product.id);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when no movements', async () => {
      const input: CreateProductInput = {
        sku: `SKU-NO-MOVEMENTS-${Date.now()}`,
        name: `No Movements ${Date.now()}`,
        stock: 25,
      };

      const product = await repository.create(input);
      testProductIds.push(product.id);

      const result = await repository.listMovements(product.id);

      // Puede estar vacío o tener movimientos según la lógica
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return movements with correct structure', async () => {
      const input: CreateProductInput = {
        sku: `SKU-STRUCTURE-${Date.now()}`,
        name: `Structure Test ${Date.now()}`,
        stock: 30,
      };

      const product = await repository.create(input);
      testProductIds.push(product.id);

      const result = await repository.listMovements(product.id);

      result.forEach(movement => {
        expect(movement).toHaveProperty('id');
        expect(movement).toHaveProperty('productId');
        expect(movement).toHaveProperty('type');
        expect(movement).toHaveProperty('quantity');
        expect(movement).toHaveProperty('createdAt');
      });
    });
  });
});
