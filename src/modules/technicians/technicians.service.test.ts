import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TechnicianService } from './technicians.service';
import { ITechnicianRepository } from './technicians.repository';
import { NotFoundError } from '../../shared/errors/app-error';

describe('TechnicianService', () => {
  let service: TechnicianService;
  let mockRepository: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      list: vi.fn(),
      register: vi.fn(),
      findById: vi.fn(),
      setActive: vi.fn(),
      listWorkOrders: vi.fn(),
    };

    service = new TechnicianService(mockRepository as ITechnicianRepository);
  });

  describe('list', () => {
    it('should list all technicians', async () => {
      const mockTechs: any[] = [
        {
          id: 'tech-1',
          name: 'Carlos',
          email: 'carlos@example.com',
          active: true,
        },
        {
          id: 'tech-2',
          name: 'Ana',
          email: 'ana@example.com',
          active: true,
        },
      ];

      mockRepository.list.mockResolvedValue(mockTechs);

      const result = await service.list();

      expect(mockRepository.list).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Carlos');
      expect(result[1].name).toBe('Ana');
    });

    it('should return empty array when no technicians', async () => {
      mockRepository.list.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
    });
  });

  describe('register', () => {
    it('should register a new technician', async () => {
      const input = {
        name: 'Nuevo Técnico',
        email: 'nuevo@example.com',
        phone: '+34 123456789',
      };

      const mockTech: any = {
        id: 'tech-new',
        name: input.name,
        email: input.email,
        phone: input.phone,
        active: true,
      };

      mockRepository.register.mockResolvedValue(mockTech);

      const result = await service.register(input);

      expect(mockRepository.register).toHaveBeenCalledWith(input);
      expect(result.id).toBe('tech-new');
      expect(result.name).toBe('Nuevo Técnico');
    });
  });

  describe('setActive', () => {
    it('should activate a technician', async () => {
      const technicianId = 'tech-123';
      const mockTech: any = {
        id: technicianId,
        name: 'Carlos',
        email: 'carlos@example.com',
        active: false,
      };

      const activatedTech: any = {
        ...mockTech,
        active: true,
      };

      mockRepository.findById.mockResolvedValue(mockTech);
      mockRepository.setActive.mockResolvedValue(activatedTech);

      const result = await service.setActive(technicianId, true);

      expect(mockRepository.findById).toHaveBeenCalledWith(technicianId);
      expect(mockRepository.setActive).toHaveBeenCalledWith(technicianId, true);
      expect(result.active).toBe(true);
    });

    it('should deactivate a technician', async () => {
      const technicianId = 'tech-456';
      const mockTech: any = {
        id: technicianId,
        name: 'Ana',
        email: 'ana@example.com',
        active: true,
      };

      const deactivatedTech: any = {
        ...mockTech,
        active: false,
      };

      mockRepository.findById.mockResolvedValue(mockTech);
      mockRepository.setActive.mockResolvedValue(deactivatedTech);

      const result = await service.setActive(technicianId, false);

      expect(mockRepository.setActive).toHaveBeenCalledWith(technicianId, false);
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundError when technician does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.setActive('non-existent', true)).rejects.toThrow(NotFoundError);
      expect(mockRepository.setActive).not.toHaveBeenCalled();
    });
  });

  describe('listWorkOrders', () => {
    it('should list work orders for a technician', async () => {
      const technicianId = 'tech-123';
      const mockWorkOrders: any[] = [
        {
          id: 'wo-1',
          guide_number: 'WO-001',
          current_status: 'en_progreso',
        },
      ];

      const mockTech: any = {
        id: technicianId,
        name: 'Carlos',
        email: 'carlos@example.com',
        active: true,
      };

      mockRepository.findById.mockResolvedValue(mockTech);
      mockRepository.listWorkOrders.mockResolvedValue(mockWorkOrders);

      const result = await service.listWorkOrders(technicianId);

      expect(mockRepository.findById).toHaveBeenCalledWith(technicianId);
      expect(mockRepository.listWorkOrders).toHaveBeenCalledWith(technicianId);
      expect(result).toHaveLength(1);
      expect(result[0].guide_number).toBe('WO-001');
    });

    it('should throw NotFoundError when technician does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.listWorkOrders('non-existent')).rejects.toThrow(NotFoundError);
      expect(mockRepository.listWorkOrders).not.toHaveBeenCalled();
    });
  });
});
