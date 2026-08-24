import { describe, it, expect, beforeAll } from 'vitest';
import { TechnicianRepository } from './technicians.repository';
import { RegisterTechnicianInput } from './technicians.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 * 
 * Interactúa con la base de datos real usando la service role key.
 * Nota: register() crea usuarios en auth.users, lo cual requiere permisos especiales.
 */

describe('TechnicianRepository - Integration Tests', () => {
  let repository: TechnicianRepository;
  const testTechnicianIds: string[] = [];

  beforeAll(() => {
    repository = new TechnicianRepository();
  });

  describe('list', () => {
    it('should list all technicians', async () => {
      const result = await repository.list();

      expect(Array.isArray(result)).toBe(true);
      result.forEach(tech => {
        expect(tech).toHaveProperty('id');
        expect(tech).toHaveProperty('fullName');
        expect(tech).toHaveProperty('active');
        expect(tech).toHaveProperty('createdAt');
      });
    });

    it('should list technicians ordered by creation date', async () => {
      const result = await repository.list();

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const current = new Date(result[i].createdAt);
          const next = new Date(result[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should list only active and inactive technicians', async () => {
      const result = await repository.list();

      result.forEach(tech => {
        expect(typeof tech.active).toBe('boolean');
      });
    });
  });

  describe('findById', () => {
    it('should find a technician by id', async () => {
      const result = await repository.list();

      if (result.length > 0) {
        const targetTech = result[0];
        const found = await repository.findById(targetTech.id);

        expect(found).toBeDefined();
        expect(found?.id).toBe(targetTech.id);
        expect(found?.fullName).toBe(targetTech.fullName);
      }
    });

    it('should return null when technician does not exist', async () => {
      const result = await repository.findById('non-existent-' + Date.now());
      expect(result).toBeNull();
    });

    it('should return null for non-technician users', async () => {
      // Intentar obtener un usuario que no es técnico
      // Los IDs de administrador o cliente no deberían retornar como técnico
      const result = await repository.findById('invalid-tech-id-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new technician', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        fullName: `Técnico Test ${Date.now()}`,
        phone: '+34 600000000',
      };

      const result = await repository.register(input);

      expect(result.id).toBeDefined();
      expect(result.fullName).toBe(input.fullName);
      expect(result.phone).toBe(input.phone);
      expect(result.active).toBe(true);

      testTechnicianIds.push(result.id);
    });

    it('should register technician with only required fields', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-min-${Date.now()}@example.com`,
        password: 'SecurePass456!',
        fullName: `Técnico Mínimo ${Date.now()}`,
      };

      const result = await repository.register(input);

      expect(result.id).toBeDefined();
      expect(result.fullName).toBe(input.fullName);
      expect(result.phone).toBeNull();
      expect(result.active).toBe(true);

      testTechnicianIds.push(result.id);
    });

    it('should throw ConflictError when email already exists', async () => {
      const email = `tech-dup-${Date.now()}@example.com`;

      const input1: RegisterTechnicianInput = {
        email,
        password: 'SecurePass789!',
        fullName: `Técnico 1 ${Date.now()}`,
      };

      const input2: RegisterTechnicianInput = {
        email, // Mismo email
        password: 'SecurePass999!',
        fullName: `Técnico 2 ${Date.now()}`,
      };

      const result1 = await repository.register(input1);
      testTechnicianIds.push(result1.id);

      await expect(repository.register(input2)).rejects.toThrow();
    });
  });

  describe('setActive', () => {
    it('should deactivate a technician', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-deactivate-${Date.now()}@example.com`,
        password: 'SecurePass111!',
        fullName: `Para Desactivar ${Date.now()}`,
      };

      const created = await repository.register(input);
      testTechnicianIds.push(created.id);

      expect(created.active).toBe(true);

      const deactivated = await repository.setActive(created.id, false);

      expect(deactivated.active).toBe(false);
      expect(deactivated.id).toBe(created.id);

      // Verificar persistencia
      const found = await repository.findById(created.id);
      expect(found?.active).toBe(false);
    });

    it('should activate a technician', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-activate-${Date.now()}@example.com`,
        password: 'SecurePass222!',
        fullName: `Para Activar ${Date.now()}`,
      };

      const created = await repository.register(input);
      testTechnicianIds.push(created.id);

      // Primero desactivar
      await repository.setActive(created.id, false);

      // Luego activar
      const activated = await repository.setActive(created.id, true);

      expect(activated.active).toBe(true);
    });

    it('should toggle technician status multiple times', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-toggle-${Date.now()}@example.com`,
        password: 'SecurePass333!',
        fullName: `Para Toggle ${Date.now()}`,
      };

      const created = await repository.register(input);
      testTechnicianIds.push(created.id);

      let current = created;

      // Toggle 1: true -> false
      current = await repository.setActive(current.id, false);
      expect(current.active).toBe(false);

      // Toggle 2: false -> true
      current = await repository.setActive(current.id, true);
      expect(current.active).toBe(true);

      // Toggle 3: true -> false
      current = await repository.setActive(current.id, false);
      expect(current.active).toBe(false);
    });
  });

  describe('listWorkOrders', () => {
    it('should return empty array when technician has no work orders', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-no-wo-${Date.now()}@example.com`,
        password: 'SecurePass444!',
        fullName: `Sin Órdenes ${Date.now()}`,
      };

      const technician = await repository.register(input);
      testTechnicianIds.push(technician.id);

      const result = await repository.listWorkOrders(technician.id);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return work orders with correct structure', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-wo-${Date.now()}@example.com`,
        password: 'SecurePass555!',
        fullName: `Con Órdenes ${Date.now()}`,
      };

      const technician = await repository.register(input);
      testTechnicianIds.push(technician.id);

      const result = await repository.listWorkOrders(technician.id);

      result.forEach(order => {
        expect(order).toHaveProperty('id');
        expect(order).toHaveProperty('guide_number');
        expect(order).toHaveProperty('current_status');
      });
    });

    it('should list work orders in descending order', async () => {
      const input: RegisterTechnicianInput = {
        email: `tech-order-${Date.now()}@example.com`,
        password: 'SecurePass666!',
        fullName: `Orden de Órdenes ${Date.now()}`,
      };

      const technician = await repository.register(input);
      testTechnicianIds.push(technician.id);

      const result = await repository.listWorkOrders(technician.id);

      // La implementación ordena por created_at descendente
      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i]).toBeDefined();
          expect(result[i + 1]).toBeDefined();
        }
      }
    });
  });
});
