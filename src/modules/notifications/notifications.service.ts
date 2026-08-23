import { INotificationRepository } from './notifications.repository';
import { INotifier, Notification, NotificationMessage } from './notifications.types';

export class NotificationService {
  constructor(
    private readonly repository: INotificationRepository,
    private readonly notifier: INotifier,
  ) {}

  async listByWorkOrder(workOrderId: string): Promise<Notification[]> {
    const rows = await this.repository.listByWorkOrder(workOrderId);
    return rows.map((r) => ({
      id: r.id,
      workOrderId: r.work_order_id,
      toEmail: r.to_email,
      type: r.type,
      status: r.status,
      sentAt: r.sent_at,
      createdAt: r.created_at,
    }));
  }

  async send(notificationId: string, message: NotificationMessage): Promise<void> {
    try {
      await this.notifier.send(message);
      await this.repository.markSent(notificationId);
    } catch (err) {
      await this.repository.markFailed(notificationId);
      throw err;
    }
  }
}
