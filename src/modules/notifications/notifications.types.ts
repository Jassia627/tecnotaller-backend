export type NotificationStatus = 'pendiente' | 'enviada' | 'fallida';

export interface NotificationRow {
  id: string;
  work_order_id: string;
  to_email: string;
  type: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  workOrderId: string;
  toEmail: string;
  type: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationMessage {
  toEmail: string;
  subject: string;
  body: string;
}

// Contrato de notificación (abstracción): el cliente solo conoce "enviar"
export interface INotifier {
  send(message: NotificationMessage): Promise<void>;
}
