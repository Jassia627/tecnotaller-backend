import { INotifier, NotificationMessage } from './notifications.types';
import {
  EmailNotifier,
  SmsNotifier,
  WhatsAppNotifier,
  ConsoleNotifier,
} from './notifiers';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'CONSOLE';

/**
 * Patrón Creacional: Factory Method
 * 
 * Define la interfaz del Creador (NotificationFactory) con el método de fábrica
 * abstracto createNotifier(). Las subclases concretas deciden qué producto instanciar.
 */
export abstract class NotificationFactory {
  // Método de Fábrica Abstracto (Factory Method)
  abstract createNotifier(): INotifier;

  /**
   * Operación de plantilla que utiliza el producto creado por el Factory Method.
   */
  async notify(message: NotificationMessage): Promise<void> {
    const notifier = this.createNotifier();
    await notifier.send(message);
  }
}

// Creador Concreto 1: Email
export class EmailNotificationFactory extends NotificationFactory {
  createNotifier(): INotifier {
    return new EmailNotifier();
  }
}

// Creador Concreto 2: SMS
export class SmsNotificationFactory extends NotificationFactory {
  createNotifier(): INotifier {
    return new SmsNotifier();
  }
}

// Creador Concreto 3: WhatsApp
export class WhatsAppNotificationFactory extends NotificationFactory {
  createNotifier(): INotifier {
    return new WhatsAppNotifier();
  }
}

// Creador Concreto 4: Consola (Testing / Desarrollo)
export class ConsoleNotificationFactory extends NotificationFactory {
  createNotifier(): INotifier {
    return new ConsoleNotifier();
  }
}

/**
 * Proveedor / Selector de Factorías
 * Permite obtener la factoría adecuada según el canal solicitado.
 */
export class NotificationFactoryProvider {
  private static readonly factories: Record<NotificationChannel, () => NotificationFactory> = {
    EMAIL: () => new EmailNotificationFactory(),
    SMS: () => new SmsNotificationFactory(),
    WHATSAPP: () => new WhatsAppNotificationFactory(),
    CONSOLE: () => new ConsoleNotificationFactory(),
  };

  public static getFactory(channel: NotificationChannel): NotificationFactory {
    const factoryCreator = this.factories[channel];
    if (!factoryCreator) {
      throw new Error(`Canal de notificación no soportado: ${channel}`);
    }
    return factoryCreator();
  }

  /**
   * Método de conveniencia directo para obtener el Notifier directamente
   */
  public static createNotifier(channel: NotificationChannel): INotifier {
    return this.getFactory(channel).createNotifier();
  }
}
