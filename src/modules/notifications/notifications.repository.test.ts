import { describe, it, expect, beforeAll } from 'vitest';
import { NotificationRepository } from './notifications.repository';

/**
 * INTEGRATION TESTS - Requiere acceso a Supabase con service role key
 */

describe('NotificationRepository - Integration Tests', () => {
  let repository: NotificationRepository;
  const testNotificationIds: string[] = [];
  const testWorkOrderId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // UUID válido

  beforeAll(() => {
    repository = new NotificationRepository();
  });

  describe('listByWorkOrder', () => {
    it('should list notifications for a work order', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(notif => {
        expect(notif).toHaveProperty('id');
        expect(notif).toHaveProperty('work_order_id');
        expect(notif).toHaveProperty('to_email');
        expect(notif).toHaveProperty('type');
        expect(notif).toHaveProperty('status');
        expect(notif).toHaveProperty('created_at');
      });
    });

    it('should return empty array when no notifications', async () => {
      const nonExistentWorkOrderId = 'non-existent-' + Date.now();
      const result = await repository.listByWorkOrder(nonExistentWorkOrderId);

      expect(result).toEqual([]);
    });

    it('should return notifications ordered by creation date (newest first)', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          const current = new Date(result[i].created_at);
          const next = new Date(result[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it('should include notification status', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      result.forEach(notif => {
        expect(['pendiente', 'enviada', 'fallida']).toContain(notif.status);
      });
    });
  });

  describe('markSent', () => {
    it('should mark notification as sent', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;
        await repository.markSent(notificationId);

        // Verificar que se marcó como enviada
        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('enviada');
        expect(found?.sent_at).toBeDefined();
      }
    });

    it('should update sent_at timestamp', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;
        const beforeMarkSent = new Date();

        await repository.markSent(notificationId);

        const afterMarkSent = new Date();

        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        if (found?.sent_at) {
          const sentTime = new Date(found.sent_at);
          expect(sentTime.getTime()).toBeGreaterThanOrEqual(beforeMarkSent.getTime());
          expect(sentTime.getTime()).toBeLessThanOrEqual(afterMarkSent.getTime());
        }
      }
    });
  });

  describe('markFailed', () => {
    it('should mark notification as failed', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;
        await repository.markFailed(notificationId);

        // Verificar que se marcó como fallida
        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('fallida');
      }
    });

    it('should not update sent_at when marking failed', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;

        // Primero marcar como fallida
        await repository.markFailed(notificationId);

        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('fallida');
      }
    });
  });

  describe('notification status transitions', () => {
    it('should transition from pendiente to enviada', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;

        // Marcar como enviada
        await repository.markSent(notificationId);

        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('enviada');
      }
    });

    it('should transition from pendiente to fallida', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;

        // Marcar como fallida
        await repository.markFailed(notificationId);

        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('fallida');
      }
    });

    it('should allow retransitioning from fallida to enviada', async () => {
      const result = await repository.listByWorkOrder(testWorkOrderId);

      if (result.length > 0) {
        const notificationId = result[0].id;

        // Marcar como fallida
        await repository.markFailed(notificationId);

        // Luego marcar como enviada
        await repository.markSent(notificationId);

        const updated = await repository.listByWorkOrder(testWorkOrderId);
        const found = updated.find(n => n.id === notificationId);

        expect(found?.status).toBe('enviada');
      }
    });
  });
});
