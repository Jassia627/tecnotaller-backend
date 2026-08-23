import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from './notifications.service';
import { INotificationRepository } from './notifications.repository';
import { INotifier } from './notifications.types';

describe('NotificationService', () => {
  function buildRepo(): INotificationRepository {
    return {
      listByWorkOrder: vi.fn().mockResolvedValue([]),
      markSent: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue(undefined),
    };
  }

  it('marca como enviada tras enviar correctamente', async () => {
    const repo = buildRepo();
    const notifier: INotifier = { send: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationService(repo, notifier);

    await service.send('n1', { toEmail: 'a@b.com', subject: 'S', body: 'B' });

    expect(repo.markSent).toHaveBeenCalledWith('n1');
    expect(repo.markFailed).not.toHaveBeenCalled();
  });

  it('marca como fallida si el envío falla', async () => {
    const repo = buildRepo();
    const notifier: INotifier = { send: vi.fn().mockRejectedValue(new Error('smtp down')) };
    const service = new NotificationService(repo, notifier);

    await expect(service.send('n1', { toEmail: 'a@b.com', subject: 'S', body: 'B' })).rejects.toThrow();

    expect(repo.markFailed).toHaveBeenCalledWith('n1');
  });
});
