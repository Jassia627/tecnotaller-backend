import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerService } from './customers.service';
import { ICustomerRepository } from './customers.repository';
import { Customer, CustomerRow } from './customers.types';
import { NotFoundError } from '../../shared/errors/app-error';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  function createMockRepository(): Record<string, any> {
    return {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      listWorkOrders: vi.fn(),
    };
  }

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new CustomerService(mockRepository as ICustomerRepository);
  });

  describe('list', () => {
    it('should list customers with pagination', async () => {
      const mockRows: CustomerRow[] = [
        {
          id: 'cust-1',
          email: 'juan@example.com',
          full_name: 'Juan Pérez',
          phone: '+34 123456789',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cust-2',
          email: 'maria@example.com',
          full_name: 'María García',
          phone: '+34 987654321',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 2,
      });

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(mockRepository.list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].fullName).toBe('Juan Pérez');
      expect(result.items[1].fullName).toBe('María García');
    });

    it('should map customer rows to customer objects', async () => {
      const mockRows: CustomerRow[] = [
        {
          id: 'cust-123',
          email: 'test@example.com',
          full_name: 'Test Customer',
          phone: '+34 666666666',
          created_at: '2024-01-15T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue({
        rows: mockRows,
        total: 1,
      });

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items[0]).toMatchObject({
        id: 'cust-123',
        email: 'test@example.com',
        fullName: 'Test Customer',
        phone: '+34 666666666',
        createdAt: '2024-01-15T00:00:00Z',
      });
    });

    it('should return empty list when no customers', async () => {
      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 0,
      });

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle different page numbers', async () => {
      mockRepository.list.mockResolvedValue({
        rows: [],
        total: 100,
      });

      await service.list({ page: 3, pageSize: 20 });

      expect(mockRepository.list).toHaveBeenCalledWith({ page: 3, pageSize: 20 });
    });
  });

  describe('getById', () => {
    it('should get a customer by id', async () => {
      const customerId = 'cust-123';
      const mockRow: CustomerRow = {
        id: customerId,
        email: 'juan@example.com',
        full_name: 'Juan Pérez',
        phone: '+34 123456789',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById(customerId);

      expect(mockRepository.findById).toHaveBeenCalledWith(customerId);
      expect(result).toMatchObject({
        id: customerId,
        email: 'juan@example.com',
        fullName: 'Juan Pérez',
      });
    });

    it('should throw NotFoundError when customer does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError with correct message', async () => {
      mockRepository.findById.mockResolvedValue(null);

      try {
        await service.getById('invalid-id');
        expect.fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toBe('Cliente no encontrado');
      }
    });

    it('should handle customer without email', async () => {
      const mockRow: CustomerRow = {
        id: 'cust-456',
        email: null,
        full_name: 'Sin Email',
        phone: '+34 111111111',
        created_at: '2024-01-05T00:00:00Z',
      };

      mockRepository.findById.mockResolvedValue(mockRow);

      const result = await service.getById('cust-456');

      expect(result.email).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new customer', async () => {
      const input = {
        email: 'nuevo@example.com',
        fullName: 'Nuevo Cliente',
        phone: '+34 555555555',
      };

      const mockRow: CustomerRow = {
        id: 'cust-new',
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        created_at: '2024-01-20T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result.id).toBe('cust-new');
      expect(result.email).toBe(input.email);
      expect(result.fullName).toBe(input.fullName);
    });

    it('should create customer with optional fields', async () => {
      const input = {
        fullName: 'Sin Contacto',
      };

      const mockRow: CustomerRow = {
        id: 'cust-min',
        email: null,
        full_name: input.fullName,
        phone: null,
        created_at: '2024-01-21T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(result.fullName).toBe('Sin Contacto');
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('should create customer with only email and phone', async () => {
      const input = {
        email: 'contacto@example.com',
        fullName: 'Cliente Completo',
        phone: '+34 777777777',
      };

      const mockRow: CustomerRow = {
        id: 'cust-full',
        email: input.email,
        full_name: input.fullName,
        phone: input.phone,
        created_at: '2024-01-22T00:00:00Z',
      };

      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(result).toMatchObject(input);
    });
  });

  describe('listWorkOrders', () => {
    it('should list work orders for a customer', async () => {
      const customerId = 'cust-123';
      const mockWorkOrders = [
        {
          id: 'wo-1',
          guide_number: 'WO-001',
          current_status: 'pendiente',
        },
        {
          id: 'wo-2',
          guide_number: 'WO-002',
          current_status: 'en_progreso',
        },
      ];

      mockRepository.findById.mockResolvedValue({
        id: customerId,
        email: 'juan@example.com',
        full_name: 'Juan',
        phone: null,
        created_at: '2024-01-01T00:00:00Z',
      });

      mockRepository.listWorkOrders.mockResolvedValue(mockWorkOrders);

      const result = await service.listWorkOrders(customerId);

      expect(mockRepository.findById).toHaveBeenCalledWith(customerId);
      expect(mockRepository.listWorkOrders).toHaveBeenCalledWith(customerId);
      expect(result).toEqual(mockWorkOrders);
      expect(result).toHaveLength(2);
    });

    it('should verify customer exists before listing work orders', async () => {
      const customerId = 'non-existent';
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.listWorkOrders(customerId)).rejects.toThrow(NotFoundError);
      expect(mockRepository.listWorkOrders).not.toHaveBeenCalled();
    });

    it('should return empty array when customer has no work orders', async () => {
      const customerId = 'cust-456';

      mockRepository.findById.mockResolvedValue({
        id: customerId,
        email: null,
        full_name: 'Cliente',
        phone: null,
        created_at: '2024-01-01T00:00:00Z',
      });

      mockRepository.listWorkOrders.mockResolvedValue([]);

      const result = await service.listWorkOrders(customerId);

      expect(result).toEqual([]);
    });
  });
});
