import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppointmentService } from './appointments.service';
import { IAppointmentRepository } from './appointments.repository';
import { Appointment, AppointmentRow, AppointmentStatus } from './appointments.types';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let mockRepository: ReturnType<typeof createMockRepository>;

  function createMockRepository(): Record<string, any> {
    return {
      findById: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      setStatus: vi.fn(),
      cancelExpired: vi.fn(),
      hasOverlap: vi.fn(),
    };
  }

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new AppointmentService(mockRepository as IAppointmentRepository);
  });

  describe('create', () => {
    it('should create a new appointment when no overlap exists', async () => {
      const input = {
        serviceId: 'service-123',
        customerName: 'Juan Pérez',
        phone: '+34 123456789',
        date: '2024-12-20T10:00:00Z',
      };

      const mockRow: AppointmentRow = {
        id: 'apt-1',
        service_id: input.serviceId,
        customer_name: input.customerName,
        phone: input.phone,
        date: input.date,
        status: 'pendiente',
        created_at: '2024-01-01T00:00:00Z',
      };

      mockRepository.hasOverlap.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue(mockRow);

      const result = await service.create(input);

      expect(mockRepository.hasOverlap).toHaveBeenCalledWith('service-123', input.date);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result).toBeInstanceOf(Appointment);
      expect(result.serviceId).toBe(input.serviceId);
      expect(result.customerName).toBe(input.customerName);
      expect(result.status).toBe('pendiente');
    });

    it('should throw ConflictError when overlap exists', async () => {
      const input = {
        serviceId: 'service-123',
        customerName: 'Juan Pérez',
        phone: '+34 123456789',
        date: '2024-12-20T10:00:00Z',
      };

      mockRepository.hasOverlap.mockResolvedValue(true);

      await expect(service.create(input)).rejects.toThrow(ConflictError);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should check for overlap with correct parameters', async () => {
      const input = {
        serviceId: 'service-456',
        customerName: 'María García',
        phone: '+34 987654321',
        date: '2024-12-21T14:30:00Z',
      };

      mockRepository.hasOverlap.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({
        id: 'apt-2',
        service_id: input.serviceId,
        customer_name: input.customerName,
        phone: input.phone,
        date: input.date,
        status: 'pendiente',
        created_at: '2024-01-01T00:00:00Z',
      });

      await service.create(input);

      expect(mockRepository.hasOverlap).toHaveBeenCalledWith('service-456', '2024-12-21T14:30:00Z');
    });
  });

  describe('list', () => {
    it('should list all appointments', async () => {
      const mockRows: AppointmentRow[] = [
        {
          id: 'apt-1',
          service_id: 'service-1',
          customer_name: 'Juan',
          phone: '123',
          date: '2024-12-20T10:00:00Z',
          status: 'pendiente',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'apt-2',
          service_id: 'service-1',
          customer_name: 'María',
          phone: '456',
          date: '2024-12-21T14:00:00Z',
          status: 'confirmada',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      mockRepository.list.mockResolvedValue(mockRows);

      const result = await service.list({});

      expect(mockRepository.list).toHaveBeenCalledWith({});
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(Appointment);
      expect(result[0].customerName).toBe('Juan');
      expect(result[1].customerName).toBe('María');
    });

    it('should list appointments with date filters', async () => {
      const options = {
        from: '2024-12-20T00:00:00Z',
        to: '2024-12-31T23:59:59Z',
      };

      mockRepository.list.mockResolvedValue([]);

      await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
    });

    it('should list appointments by status', async () => {
      const options = { status: 'confirmada' as AppointmentStatus };

      mockRepository.list.mockResolvedValue([]);

      await service.list(options);

      expect(mockRepository.list).toHaveBeenCalledWith(options);
    });

    it('should return empty array when no appointments', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await service.list({});

      expect(result).toEqual([]);
    });
  });

  describe('confirm', () => {
    it('should confirm a pending appointment', async () => {
      const appointmentId = 'apt-123';
      const mockRow: AppointmentRow = {
        id: appointmentId,
        service_id: 'service-1',
        customer_name: 'Juan',
        phone: '123',
        date: '2024-12-20T10:00:00Z',
        status: 'pendiente',
        created_at: '2024-01-01T00:00:00Z',
      };

      const confirmedRow: AppointmentRow = {
        ...mockRow,
        status: 'confirmada',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.setStatus.mockResolvedValue(confirmedRow);

      const result = await service.confirm(appointmentId);

      expect(mockRepository.findById).toHaveBeenCalledWith(appointmentId);
      expect(mockRepository.setStatus).toHaveBeenCalledWith(appointmentId, 'confirmada');
      expect(result.status).toBe('confirmada');
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.confirm('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel an appointment', async () => {
      const appointmentId = 'apt-456';
      const mockRow: AppointmentRow = {
        id: appointmentId,
        service_id: 'service-1',
        customer_name: 'Juan',
        phone: '123',
        date: '2024-12-20T10:00:00Z',
        status: 'confirmada',
        created_at: '2024-01-01T00:00:00Z',
      };

      const cancelledRow: AppointmentRow = {
        ...mockRow,
        status: 'cancelada',
      };

      mockRepository.findById.mockResolvedValue(mockRow);
      mockRepository.setStatus.mockResolvedValue(cancelledRow);

      const result = await service.cancel(appointmentId);

      expect(mockRepository.findById).toHaveBeenCalledWith(appointmentId);
      expect(mockRepository.setStatus).toHaveBeenCalledWith(appointmentId, 'cancelada');
      expect(result.status).toBe('cancelada');
    });

    it('should throw NotFoundError when appointment does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.cancel('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.setStatus).not.toHaveBeenCalled();
    });
  });

  describe('cancelExpired', () => {
    it('should cancel expired appointments with default threshold', async () => {
      mockRepository.cancelExpired.mockResolvedValue(5);

      const result = await service.cancelExpired();

      expect(mockRepository.cancelExpired).toHaveBeenCalledWith(15);
      expect(result).toBe(5);
    });

    it('should cancel expired appointments with custom threshold', async () => {
      mockRepository.cancelExpired.mockResolvedValue(3);

      const result = await service.cancelExpired(30);

      expect(mockRepository.cancelExpired).toHaveBeenCalledWith(30);
      expect(result).toBe(3);
    });

    it('should return 0 when no appointments to cancel', async () => {
      mockRepository.cancelExpired.mockResolvedValue(0);

      const result = await service.cancelExpired();

      expect(result).toBe(0);
    });
  });
});
