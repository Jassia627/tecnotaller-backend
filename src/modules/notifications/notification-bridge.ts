/**
 * PATRÓN BRIDGE: Separa la abstracción (tipo de notificación) de la implementación (canal de envío)
 * 
 * Abstracción: NotificationAbstraction (y sus refinamientos)
 *   - StatusChangeNotification
 *   - AppointmentReminderNotification
 *   - WarrantyAlertNotification
 * 
 * Implementación: INotificationChannel (y sus implementaciones)
 *   - EmailChannel
 *   - SmsChannel
 *   - WhatsAppChannel
 *   - ConsoleChannel
 * 
 * Beneficios:
 * - Agregar un nuevo tipo de notificación NO requiere modificar los canales
 * - Agregar un nuevo canal NO requiere modificar los tipos de notificación
 * - Evita explosión combinatoria de clases (4 tipos × 4 canales = 8 clases, no 16)
 */

import { supabase } from '../../config/supabase';
import { logger } from '../../shared/utils/logger';

// ============================================================================
// IMPLEMENTACIÓN (Canales de envío)
// ============================================================================

/**
 * Interfaz para los canales de envío (implementación del Bridge)
 */
export interface INotificationChannel {
  readonly channelName: string;
  send(to: string, subject: string, body: string): Promise<void>;
}

/**
 * Canal de Email - usa Supabase Edge Functions
 */
export class EmailChannel implements INotificationChannel {
  readonly channelName = 'email';

  async send(to: string, subject: string, body: string): Promise<void> {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, body },
    });
    if (error) {
      logger.error({ error, to }, 'Error al enviar email');
      throw new Error('No se pudo enviar el email');
    }
    logger.info({ to, subject }, 'Email enviado');
  }
}

/**
 * Canal de SMS
 */
export class SmsChannel implements INotificationChannel {
  readonly channelName = 'sms';

  async send(to: string, subject: string, body: string): Promise<void> {
    // En producción, integrar con Twilio u otro proveedor
    logger.info({ to, body }, 'SMS enviado');
  }
}

/**
 * Canal de WhatsApp
 */
export class WhatsAppChannel implements INotificationChannel {
  readonly channelName = 'whatsapp';

  async send(to: string, subject: string, body: string): Promise<void> {
    // En producción, integrar con Meta Cloud API
    logger.info({ to, body }, 'WhatsApp enviado');
  }
}

/**
 * Canal de Consola (para desarrollo/testing)
 */
export class ConsoleChannel implements INotificationChannel {
  readonly channelName = 'console';

  async send(to: string, subject: string, body: string): Promise<void> {
    logger.info({ to, subject, body }, 'Notificación (console)');
  }
}

// ============================================================================
// ABSTRACCIÓN (Tipos de notificación)
// ============================================================================

/**
 * Abstracción base del Bridge - define la interfaz para tipos de notificación
 */
export abstract class NotificationAbstraction {
  constructor(protected channel: INotificationChannel) {}

  /**
   * Cambia el canal de envío en runtime (flexibilidad del Bridge)
   */
  setChannel(channel: INotificationChannel): void {
    this.channel = channel;
  }

  /**
   * Método abstracto que cada tipo de notificación debe implementar
   */
  abstract send(): Promise<void>;

  /**
   * Retorna información del canal actual
   */
  getChannelName(): string {
    return this.channel.channelName;
  }
}

/**
 * Notificación de cambio de estado de orden
 */
export class StatusChangeNotification extends NotificationAbstraction {
  constructor(
    channel: INotificationChannel,
    private readonly toEmail: string,
    private readonly guideNumber: string,
    private readonly fromStatus: string,
    private readonly toStatus: string,
    private readonly customerName: string,
  ) {
    super(channel);
  }

  async send(): Promise<void> {
    const subject = `TecnoTaller - Orden ${this.guideNumber}: Estado actualizado`;
    const body = `
Hola ${this.customerName},

Le informamos que su orden de servicio #${this.guideNumber} ha cambiado de estado.

Estado anterior: ${this.fromStatus}
Estado actual: ${this.toStatus}

Puede consultar el estado de su orden en cualquier momento usando su número de guía.

Gracias por confiar en TecnoTaller.
    `.trim();

    await this.channel.send(this.toEmail, subject, body);
  }
}

/**
 * Notificación de recordatorio de cita
 */
export class AppointmentReminderNotification extends NotificationAbstraction {
  constructor(
    channel: INotificationChannel,
    private readonly toEmail: string,
    private readonly customerName: string,
    private readonly appointmentDate: Date,
    private readonly serviceName: string,
  ) {
    super(channel);
  }

  async send(): Promise<void> {
    const formattedDate = this.appointmentDate.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const subject = `TecnoTaller - Recordatorio de cita`;
    const body = `
Hola ${this.customerName},

Le recordamos que tiene una cita programada en TecnoTaller.

Servicio: ${this.serviceName}
Fecha y hora: ${formattedDate}

Por favor llegue 10 minutos antes de su cita. Si necesita cancelar o reprogramar, contáctenos con anticipación.

Gracias por confiar en TecnoTaller.
    `.trim();

    await this.channel.send(this.toEmail, subject, body);
  }
}

/**
 * Notificación de alerta de garantía próxima a vencer
 */
export class WarrantyAlertNotification extends NotificationAbstraction {
  constructor(
    channel: INotificationChannel,
    private readonly toEmail: string,
    private readonly customerName: string,
    private readonly guideNumber: string,
    private readonly expirationDate: Date,
    private readonly daysRemaining: number,
  ) {
    super(channel);
  }

  async send(): Promise<void> {
    const formattedDate = this.expirationDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = `TecnoTaller - Garantía próxima a vencer`;
    const body = `
Hola ${this.customerName},

Le informamos que la garantía de su reparación está próxima a vencer.

Orden de servicio: #${this.guideNumber}
Fecha de vencimiento: ${formattedDate}
Días restantes: ${this.daysRemaining}

Si experimenta algún problema con su dispositivo, contáctenos antes de que expire la garantía.

Gracias por confiar en TecnoTaller.
    `.trim();

    await this.channel.send(this.toEmail, subject, body);
  }
}

/**
 * Notificación de orden lista para entrega
 */
export class ReadyForPickupNotification extends NotificationAbstraction {
  constructor(
    channel: INotificationChannel,
    private readonly toEmail: string,
    private readonly customerName: string,
    private readonly guideNumber: string,
    private readonly deviceDescription: string,
  ) {
    super(channel);
  }

  async send(): Promise<void> {
    const subject = `TecnoTaller - Su dispositivo está listo para recoger`;
    const body = `
Hola ${this.customerName},

¡Buenas noticias! Su dispositivo ya está listo para ser recogido.

Orden de servicio: #${this.guideNumber}
Dispositivo: ${this.deviceDescription}

Puede pasar a recogerlo en nuestro horario de atención. No olvide traer su número de guía.

Gracias por confiar en TecnoTaller.
    `.trim();

    await this.channel.send(this.toEmail, subject, body);
  }
}
