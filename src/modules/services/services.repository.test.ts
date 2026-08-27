import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServiceRepository } from './services.repository';
import { CreateServiceInput, UpdateServiceInput } from './services.types';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 * 
 * Estos tests interactúan con la base de datos real usando la service role key
 * que bypassea las RLS, permitiendo insertar/actualizar/eliminar sin autenticación
 * de usuario cliente.
 * 
 * Los tests usan:
 * - SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del .env
 * - La tabla 'services' en Supabase
 */

describe('ServiceRepository - Integration Tests', () => {
  let repository: ServiceRepository;
  const testServiceIds: string[] = [];

  beforeAll(() => {
    repository = new ServiceRepository();
  });

  afterAll(async () => {
    // Limpiar los servicios de prueba creados
    // Nota: Esto podría implementarse con un método de limpieza en el repositorio
    // o directamente desde la DB
  });

  describe('create', () => {
    it('should create a new service in database', async () => {
      const input: CreateServiceInput = {
        name: `Servicio Test ${Date.now()}`,
        description: 'Servicio creado por test de integración',
        price: 99.99,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.price).toBe(input.price);
      expect(result.active).toBe(true);
      expect(result.created_at).toBeDefined();

      testServiceIds.push(result.id);
    });

    it('should create service with empty description', async () => {
      const input: CreateServiceInput = {
        name: `Servicio Sin Desc ${Date.now()}`,
        price: 50,
      };

      const result = await repository.create(input);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.description).toBe('');
      expect(result.price).toBe(50);
      expect(result.active).toBe(true);

      testServiceIds.push(result.id);
    });
  });

  describe('findById', () => {
    it('should find a service by id', async () => {
      // Primero crear un servicio
      const input: CreateServiceInput = {
        name: `Servicio Find ${Date.now()}`,
        description: 'Para buscar por ID',
        price: 75.5,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      // Luego buscarlo
      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe(input.name);
      expect(found?.price).toBe(input.price);
    });

    it('should return null when service does not exist', async () => {
      const result = await repository.findById('id-inexistente-' + Date.now());
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list only active services when includeInactive is false', async () => {
      // Crear un servicio activo
      const activeInput: CreateServiceInput = {
        name: `Activo ${Date.now()}`,
        description: 'Servicio activo',
        price: 100,
      };

      const active = await repository.create(activeInput);
      testServiceIds.push(active.id);

      // Listar solo activos
      const result = await repository.list(false);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(s => s.id === active.id)).toBe(true);
      expect(result.every(s => s.active === true)).toBe(true);
    });

    it('should list all services including inactive when includeInactive is true', async () => {
      const result = await repository.list(true);

      expect(Array.isArray(result)).toBe(true);
      // Podría haber servicios activos e inactivos
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should return services ordered by name', async () => {
      const result = await repository.list(false);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].name.localeCompare(result[i + 1].name)).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('update', () => {
    it('should update service name', async () => {
      // Crear servicio
      const input: CreateServiceInput = {
        name: `Original ${Date.now()}`,
        description: 'Original description',
        price: 50,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      // Actualizar
      const updateInput: UpdateServiceInput = {
        name: 'Nombre Actualizado',
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Nombre Actualizado');
      expect(updated.description).toBe('Original description'); // No cambió
      expect(updated.price).toBe(50); // No cambió
    });

    it('should update service price', async () => {
      const input: CreateServiceInput = {
        name: `Precio Test ${Date.now()}`,
        description: 'Original',
        price: 100,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      const updateInput: UpdateServiceInput = {
        price: 200,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.price).toBe(200);
      expect(updated.name).toBe(input.name);
    });

    it('should update multiple fields at once', async () => {
      const input: CreateServiceInput = {
        name: `Multi Update ${Date.now()}`,
        description: 'Original',
        price: 75,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      const updateInput: UpdateServiceInput = {
        name: 'Nuevo Nombre',
        description: 'Nueva descripción',
        price: 150,
      };

      const updated = await repository.update(created.id, updateInput);

      expect(updated.name).toBe('Nuevo Nombre');
      expect(updated.description).toBe('Nueva descripción');
      expect(updated.price).toBe(150);
    });
  });

  describe('setActive', () => {
    it('should deactivate a service', async () => {
      const input: CreateServiceInput = {
        name: `Para Desactivar ${Date.now()}`,
        description: 'Será desactivado',
        price: 50,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      expect(created.active).toBe(true);

      const deactivated = await repository.setActive(created.id, false);

      expect(deactivated.active).toBe(false);
      expect(deactivated.id).toBe(created.id);
    });

    it('should activate an inactive service', async () => {
      const input: CreateServiceInput = {
        name: `Para Activar ${Date.now()}`,
        description: 'Será activado',
        price: 50,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

      // Primero desactivar
      await repository.setActive(created.id, false);

      // Luego activar
      const activated = await repository.setActive(created.id, true);

      expect(activated.active).toBe(true);
    });

    it('should toggle service status multiple times', async () => {
      const input: CreateServiceInput = {
        name: `Toggle Test ${Date.now()}`,
        description: 'Test toggle',
        price: 50,
      };

      const created = await repository.create(input);
      testServiceIds.push(created.id);

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
});
