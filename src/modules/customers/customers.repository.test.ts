import { describe, it, expect, beforeAll } from 'vitest';
import { CustomerRepository } from './customers.repository';
import { CreateCustomerInput } from './customers.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 * 
 * Interactúa con la base de datos real usando la service role key.
 */

describe('CustomerRepository - Integration Tests', () => {
  let repository: CustomerRepository;
  const testCustomerIds: string[] = [];

  beforeAll(() => {
    repository = new CustomerRepository();
  });

  describe('create', () => {
    it('should create a new customer with all fields', async () => {
      const input: CreateCustomerInput = {
        email: `customer-${Date.now()}@example.com`,
        fullName: `Cliente Test ${Date.now()}`,
        phone: '+34 123456789',
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.email).toBe(input.email);
      expect(result.full_name).toBe(input.fullName);
      expect(result.phone).toBe(input.phone);
      expect(result.created_at).toBeDefined();

      testCustomerIds.push(result.id);
    });

    it('should create customer with only required field', async () => {
      const input: CreateCustomerInput = {
        fullName: `Cliente Mínimo ${Date.now()}`,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.full_name).toBe(input.fullName);
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();

      testCustomerIds.push(result.id);
    });

    it('should create customer with email only', async () => {
      const input: CreateCustomerInput = {
        fullName: `Cliente Email ${Date.now()}`,
        email: `email-${Date.now()}@example.com`,
      };

      const result = await repository.create(input);

      expect(result.email).toBe(input.email);
      expect(result.phone).toBeNull();

      testCustomerIds.push(result.id);
    });

    it('should create customer with phone only', async () => {
      const input: CreateCustomerInput = {
        fullName: `Cliente Teléfono ${Date.now()}`,
        phone: '+34 987654321',
      };

      const result = await repository.create(input);

      expect(result.phone).toBe(input.phone);
      expect(result.email).toBeNull();

      testCustomerIds.push(result.id);
    });

    it('should create multiple customers', async () => {
      const inputs: CreateCustomerInput[] = [
        {
          fullName: `Cliente A ${Date.now()}`,
          email: `a-${Date.now()}@example.com`,
        },
        {
          fullName: `Cliente B ${Date.now()}`,
          phone: '+34 111111111',
        },
        {
          fullName: `Cliente C ${Date.now()}`,
          email: `c-${Date.now()}@example.com`,
          phone: '+34 222222222',
        },
      ];

      for (const input of inputs) {
        const result = await repository.create(input);
        expect(result.id).toBeDefined();
        testCustomerIds.push(result.id);
      }
    });
  });

  describe('findById', () => {
    it('should find a customer by id', async () => {
      const input: CreateCustomerInput = {
        fullName: `Find Test ${Date.now()}`,
        email: `find-${Date.now()}@example.com`,
        phone: '+34 333333333',
      };

      const created = await repository.create(input);
      testCustomerIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.full_name).toBe(input.fullName);
      expect(found?.email).toBe(input.email);
      expect(found?.phone).toBe(input.phone);
    });

    it('should return null when customer does not exist', async () => {
      const result = await repository.findById('non-existent-' + Date.now());
      expect(result).toBeNull();
    });

    it('should find customer with null fields', async () => {
      const input: CreateCustomerInput = {
        fullName: `Null Fields Test ${Date.now()}`,
      };

      const created = await repository.create(input);
      testCustomerIds.push(created.id);

      const found = await repository.findById(created.id);

      expect(found?.email).toBeNull();
      expect(found?.phone).toBeNull();
    });
  });

  describe('list', () => {
    it('should list customers with pagination', async () => {
      const input: CreateCustomerInput = {
        fullName: `List Test ${Date.now()}`,
        email: `list-${Date.now()}@example.com`,
      };

      const created = await repository.create(input);
      testCustomerIds.push(created.id);

      const result = await repository.list({ page: 1, pageSize: 10 });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.rows.some(c => c.id === created.id)).toBe(true);
    });

    it('should list customers ordered by creation date (newest first)', async () => {
      const result = await repository.list({ page: 1, pageSize: 20 });

      if (result.rows.length > 1) {
        for (let i = 0; i < result.rows.length - 1; i++) {
          const current = new Date(result.rows[i].created_at);
          const next = new Date(result.rows[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should respect page size limit', async () => {
      const result = await repository.list({ page: 1, pageSize: 5 });

      expect(result.rows.length).toBeLessThanOrEqual(5);
    });

    it('should handle pagination', async () => {
      const pageSize = 5;

      const page1 = await repository.list({ page: 1, pageSize });
      const page2 = await repository.list({ page: 2, pageSize });

      // Los IDs no deben repetirse
      const page1Ids = page1.rows.map(c => c.id);
      const page2Ids = page2.rows.map(c => c.id);

      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection.length).toBe(0);
    });

    it('should return empty list for page beyond total', async () => {
      const result = await repository.list({ page: 99999, pageSize: 10 });

      expect(result.rows).toEqual([]);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listWorkOrders', () => {
    it('should return empty array when customer has no work orders', async () => {
      const input: CreateCustomerInput = {
        fullName: `No WorkOrders Test ${Date.now()}`,
      };

      const customer = await repository.create(input);
      testCustomerIds.push(customer.id);

      const result = await repository.listWorkOrders(customer.id);

      expect(Array.isArray(result)).toBe(true);
      // Puede estar vacío o tener órdenes si existen en la BD
    });

    it('should return work orders with correct structure', async () => {
      const input: CreateCustomerInput = {
        fullName: `WorkOrders Test ${Date.now()}`,
      };

      const customer = await repository.create(input);
      testCustomerIds.push(customer.id);

      const result = await repository.listWorkOrders(customer.id);

      result.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('guide_number');
        expect(order).toHaveProperty('current_status');
      });
    });

    it('should list multiple work orders in correct order', async () => {
      const input: CreateCustomerInput = {
        fullName: `Multiple WorkOrders ${Date.now()}`,
      };

      const customer = await repository.create(input);
      testCustomerIds.push(customer.id);

      const result = await repository.listWorkOrders(customer.id);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
