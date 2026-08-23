import { supabase } from '../../config/supabase';
import { logger } from '../../shared/utils/logger';
import { INotifier, NotificationMessage } from './notifications.types';

// Adapter: adapta la Edge Function de Supabase (envío de email) al contrato INotifier
export class EmailNotifier implements INotifier {
  async send(message: NotificationMessage): Promise<void> {
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: message.toEmail,
        subject: message.subject,
        body: message.body,
      },
    });

    if (error) {
      logger.error({ error, to: message.toEmail }, 'Error al enviar notificación');
      throw new Error('No se pudo enviar la notificación');
    }
  }
}

// Implementación alternativa (para testing/desarrollo)
export class ConsoleNotifier implements INotifier {
  async send(message: NotificationMessage): Promise<void> {
    logger.info({ to: message.toEmail, subject: message.subject }, 'Notificación (console)');
  }
}
