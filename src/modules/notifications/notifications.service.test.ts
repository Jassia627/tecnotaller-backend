import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notifications.service';
import { INotificationRepository } from './notifications.repository';
import { INotifier, NotificationMessage } from './notifications.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepository: Record<string, any>;
  let mockNotifier: Record<string, any>;

  beforeEach(() => {
    mockRepository = {
      listByWorkOrder: vi.fn(),
      markSent: vi.fn(),
      markFailed: vi.fn(),
    };

    mockNotifier = {
      send: vi.fn(),
    };

    service = new NotificationService(
      mockRepository as INotificationRepository,
      mockNotifier as INotifier,
    );
  });

  describe('listByWorkOrder', () => {
    it('should list notifications for a work order', async () => {
      const workOrderId = 'wo-123';
      const mockRows: any[] = [
        {
          id: 'notif-1',
          work_order_id: workOrderId,
          to_email: 'customer@example.com',
          type: 'cita_confirmada',
          status: 'sent',
          sent_at: '2024-01-01T10:00:00Z',
          created_at: '2024-01-01T09:00:00Z',
        },
      ];

      mockRepository.listByWorkOrder.mockResolvedValue(mockRows);

      const result = await service.listByWorkOrder(workOrderId);

      expect(mockRepository.listByWorkOrder).toHaveBeenCalledWith(workOrderId);
      expect(result).toHaveLength(1);
      expect(result[0].toEmail).toBe('customer@example.com');
      expect(result[0].type).toBe('cita_confirmada');
    });

    it('should return empty array when no notifications', async () => {
      mockRepository.listByWorkOrder.mockResolvedValue([]);

      const result = await service.listByWorkOrder('wo-456');

      expect(result).toEqual([]);
    });
  });

  describe('send', () => {
    it('should send a notification successfully', async () => {
      const notificationId = 'notif-123';
      const message: NotificationMessage = {
        to: 'customer@example.com',
        subject: 'Cita confirmada',
        body: 'Su cita ha sido confirmada',
      };

      mockNotifier.send.mockResolvedValue(undefined);
      mockRepository.markSent.mockResolvedValue(undefined);

      await service.send(notificationId, message);

      expect(mockNotifier.send).toHaveBeenCalledWith(message);
      expect(mockRepository.markSent).toHaveBeenCalledWith(notificationId);
      expect(mockRepository.markFailed).not.toHaveBeenCalled();
    });

    it('should mark notification as failed when send fails', async () => {
      const notificationId = 'notif-456';
      const message: NotificationMessage = {
        to: 'invalid@example.com',
        subject: 'Test',
        body: 'Test body',
      };

      const error = new Error('SMTP error');
      mockNotifier.send.mockRejectedValue(error);
      mockRepository.markFailed.mockResolvedValue(undefined);

      await expect(service.send(notificationId, message)).rejects.toThrow('SMTP error');

      expect(mockNotifier.send).toHaveBeenCalledWith(message);
      expect(mockRepository.markFailed).toHaveBeenCalledWith(notificationId);
      expect(mockRepository.markSent).not.toHaveBeenCalled();
    });

    it('should not mark sent if send fails', async () => {
      const notificationId = 'notif-789';
      const message: NotificationMessage = {
        to: 'test@example.com',
        subject: 'Subject',
        body: 'Body',
      };

      mockNotifier.send.mockRejectedValue(new Error('Network error'));
      mockRepository.markFailed.mockResolvedValue(undefined);

      await expect(service.send(notificationId, message)).rejects.toThrow();

      expect(mockRepository.markSent).not.toHaveBeenCalled();
    });
  });
});
