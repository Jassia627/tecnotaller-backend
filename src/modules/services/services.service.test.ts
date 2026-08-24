import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceService } from './services.service';
import { IServiceRepository } from './services.repository';
import { TechnicalService, ServiceRow } from './services.types';
import { NotFoundError } from '../../shared/errors/app-error';

describe('ServiceService', () => {
  let service: ServiceService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  function createMockRepository(): Record<string, any> {
    return {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setActive: vi.fn(),
    };
  }

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new ServiceService(mockRepository as IServiceRepository);
  });

  describe('listPublic', () => {
    it('should return list of public services', async () => {
      const mockRows: ServiceRow[] = [
        {
          id: '1',
          name: 'Reparación de pantalla',
          description: 'Reparación de pantalla de dispositivos',
          price: 50,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Cambio de batería',
          description: 'Reemplazo de batería',
          price: 30,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue(mockRows);

      const result = await service.listPublic();

      expect(mockRepository.list).toHaveBeenCalledWith(false);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TechnicalService);
      expect(result[0].name).toBe('Reparación de pantalla');
      expect(result[1].name).toBe('Cambio de batería');
    });

    it('should return empty array when no public services exist', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await service.listPublic();

      expect(result).toEqual([]);
      expect(mockRepository.list).toHaveBeenCalledWith(false);
    });
  });

  describe('listAll', () => {
    it('should return all services including inactive ones', async () => {
      const mockRows: ServiceRow[] = [
        {
          id: '1',
          name: 'Servicio activo',
          description: 'Descripción',
          price: 50,
          active: true,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          name: 'Servicio inactivo',
          description: 'Descripción',
          price: 30,
          active: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue(mockRows);

      const result = await service.listAll();

      expect(mockRepository.list).toHaveBeenCalledWith(true);
      expect(result).toHaveLength(2);
      expect(result[0].active).toBe(true);
      expect(result[1].active).toBe(false);
    });

    it('should return empty array when no services exist', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await service.listAll();

      expect(result).toEqual([]);
      expect(mockRepository.list).toHaveBeenCalledWith(true);
    });
  });

  describe('getById', () => {
    it('should return a service by id', async () => {
      const mockRow: ServiceRow = {
        id: '123',
        name: 'Servicio de prueba',
        description: 'Una descripción',
        price: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById('123');

      expect(mockRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toBeInstanceOf(TechnicalService);
      expect(result.id).toBe('123');
      expect(result.name).toBe('Servicio de prueba');
      expect(result.price).toBe(100);
    });

    it('should throw NotFoundError when service does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent-id')).rejects.toThrow(NotFoundError);
      expect(mockRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });

    it('should throw NotFoundError with correct message', async () => {
      mockRepository.findById.mockResolvedValue(null);

      try {
        await service.getById('invalid-id');
        expect.fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toBe('Servicio no encontrado');
      }
    });
  });

  describe('create', () => {
    it('should create a new service', async () => {
      const input = {
        name: 'Nuevo servicio',
        description: 'Descripción del nuevo servicio',
        price: 75,
      };

      const mockRow: ServiceRow = {
        id: 'new-id',
        ...input,
        active: true,
        created_at: '2024-01-02T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result).toBeInstanceOf(TechnicalService);
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('Nuevo servicio');
      expect(result.price).toBe(75);
    });

    it('should create a service with optional description', async () => {
      const input = {
        name: 'Servicio sin descripción',
        price: 50,
      };

      const mockRow: ServiceRow = {
        id: 'id-123',
        name: 'Servicio sin descripción',
        description: '',
        price: 50,
        active: true,
        created_at: '2024-01-02T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(result.name).toBe('Servicio sin descripción');
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('update', () => {
    it('should update an existing service', async () => {
      const serviceId = '123';
      const input = {
        name: 'Servicio actualizado',
        price: 120,
      };

      const existingRow: ServiceRow = {
        id: serviceId,
        name: 'Nombre anterior',
        description: 'Descripción anterior',
        price: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const updatedRow: ServiceRow = {
        ...existingRow,
        ...input,
      };

      mockRepository.findById.mockResolvedValue(existingRow);
      mockRepository.update.mockResolvedValue(updatedRow);

      const result = await service.update(serviceId, input);

      expect(mockRepository.findById).toHaveBeenCalledWith(serviceId);
      expect(mockRepository.update).toHaveBeenCalledWith(serviceId, input);
      expect(result.name).toBe('Servicio actualizado');
      expect(result.price).toBe(120);
    });

    it('should throw NotFoundError when trying to update non-existent service', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const input = { name: 'Nuevo nombre' };

      await expect(service.update('non-existent-id', input)).rejects.toThrow(NotFoundError);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('should verify service exists before updating', async () => {
      const serviceId = '123';
      mockRepository.findById.mockResolvedValue(null);

      const input = { price: 50 };

      await expect(service.update(serviceId, input)).rejects.toThrow();
      expect(mockRepository.findById).toHaveBeenCalledWith(serviceId);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should activate a service', async () => {
      const serviceId = '123';

      const existingRow: ServiceRow = {
        id: serviceId,
        name: 'Servicio',
        description: 'Descripción',
        price: 100,
        active: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const activatedRow: ServiceRow = {
        ...existingRow,
        active: true,
      };

      mockRepository.findById.mockResolvedValue(existingRow);
      mockRepository.setActive.mockResolvedValue(activatedRow);

      const result = await service.changeStatus(serviceId, true);

      expect(mockRepository.findById).toHaveBeenCalledWith(serviceId);
      expect(mockRepository.setActive).toHaveBeenCalledWith(serviceId, true);
      expect(result.active).toBe(true);
    });

    it('should deactivate a service', async () => {
      const serviceId = '123';

      const existingRow: ServiceRow = {
        id: serviceId,
        name: 'Servicio',
        description: 'Descripción',
        price: 100,
        active: true,
        created_at: '2024-01-01T00:00:00Z',
      };

      const deactivatedRow: ServiceRow = {
        ...existingRow,
        active: false,
      };

      mockRepository.findById.mockResolvedValue(existingRow);
      mockRepository.setActive.mockResolvedValue(deactivatedRow);

      const result = await service.changeStatus(serviceId, false);

      expect(mockRepository.findById).toHaveBeenCalledWith(serviceId);
      expect(mockRepository.setActive).toHaveBeenCalledWith(serviceId, false);
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundError when trying to change status of non-existent service', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.changeStatus('non-existent-id', true)).rejects.toThrow(NotFoundError);
      expect(mockRepository.setActive).not.toHaveBeenCalled();
    });

    it('should verify service exists before changing status', async () => {
      const serviceId = '123';
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.changeStatus(serviceId, true)).rejects.toThrow();
      expect(mockRepository.findById).toHaveBeenCalledWith(serviceId);
      expect(mockRepository.setActive).not.toHaveBeenCalled();
    });
  });
});
