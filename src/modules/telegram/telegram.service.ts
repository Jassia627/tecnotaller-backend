import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { logger } from '../../shared/utils/logger';

interface TelegramUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    text?: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente de confirmación',
  ACEPTADA: 'Ingresado al taller',
  EN_REVISION: 'En revisión técnica',
  ESPERANDO_REPUESTO: 'Esperando repuesto',
  EN_REPARACION: 'En reparación',
  REPARADO: 'Reparado',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  CANCELADA: 'Cancelada',
};

export class TelegramService {
  private pollingActive = false;
  private lastOffset = 0;

  private getApiUrl(method: string): string {
    return `https://api.telegram.org/bot${env.telegram.botToken}/${method}`;
  }

  async sendMessage(chatId: string | number, text: string): Promise<void> {
    if (!env.telegram.botToken) {
      throw new BadRequestError(
        'Falta configurar TELEGRAM_BOT_TOKEN en el archivo .env del backend.',
      );
    }

    const res = await fetch(this.getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new BadRequestError(`Error de Telegram: ${errBody}`);
    }
  }

  async sendOrderMessage(
    tenantId: string,
    workOrderId: string,
    message: string,
  ): Promise<{
    sent: boolean;
    chatLinked: boolean;
    botLink: string | null;
    shareUrl: string;
  }> {
    const [{ data: order, error: orderErr }, { data: tenant }] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, guide_number, customer_id, customers(id, telegram_chat_id)')
        .eq('id', workOrderId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase.from('tenants').select('slug').eq('id', tenantId).maybeSingle(),
    ]);

    if (orderErr) throw orderErr;
    if (!order) throw new NotFoundError('Orden de servicio no encontrada');

    const customer = order.customers as unknown as {
      id?: string;
      telegram_chat_id?: string | null;
    } | null;

    const trackingUrl = `${env.frontendUrl}/t/${tenant?.slug || 'tecnotaller'}/seguimiento?guia=${order.guide_number}`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(trackingUrl)}&text=${encodeURIComponent(message)}`;
    const botLink = env.telegram.botUsername
      ? `https://t.me/${env.telegram.botUsername.replace(/^@/, '')}?start=${order.guide_number}`
      : null;

    if (customer?.telegram_chat_id && env.telegram.botToken) {
      await this.sendMessage(customer.telegram_chat_id, message);
      return { sent: true, chatLinked: true, botLink, shareUrl };
    }

    return { sent: false, chatLinked: false, botLink, shareUrl };
  }

  async handleIncomingUpdate(update: TelegramUpdate): Promise<void> {
    const chatId = update.message?.chat?.id;
    const rawText = update.message?.text?.trim();
    if (!chatId || !rawText) return;

    // Soporta: "/start 544F2D9D", "/guia 544F2D9D", o directamente "544F2D9D"
    let guideCandidate = '';
    if (rawText.startsWith('/start')) {
      guideCandidate = rawText.replace(/^\/start\s*/i, '').trim();
    } else if (rawText.startsWith('/guia')) {
      guideCandidate = rawText.replace(/^\/guia\s*/i, '').trim();
    } else if (!rawText.startsWith('/')) {
      guideCandidate = rawText.trim();
    }

    if (!guideCandidate) {
      await this.sendMessage(
        chatId,
        '¡Hola! Soy el asistente de TecnoTaller.\nEnvíame tu número de guía (ej: 544F2D9D o /guia 544F2D9D) para consultar el estado de tu reparación y recibir notificaciones aquí.',
      );
      return;
    }

    const cleanGuide = guideCandidate.toUpperCase();
    const { data: order, error } = await supabase
      .from('work_orders')
      .select('id, guide_number, device_brand, device_model, current_status, customer_id, tenants(name, slug)')
      .ilike('guide_number', cleanGuide)
      .limit(1)
      .maybeSingle();

    if (error || !order) {
      await this.sendMessage(
        chatId,
        `No encontré ninguna orden con la guía "${cleanGuide}". Verifica el código e inténtalo de nuevo.`,
      );
      return;
    }

    // Vincular el telegram_chat_id al cliente de esa orden
    if (order.customer_id) {
      await supabase
        .from('customers')
        .update({ telegram_chat_id: String(chatId) })
        .eq('id', order.customer_id);
    }

    const tenantInfo = order.tenants as unknown as { name?: string; slug?: string } | null;
    const statusLabel = STATUS_LABELS[order.current_status] || order.current_status;
    const trackingUrl = `${env.frontendUrl}/t/${tenantInfo?.slug || 'tecnotaller'}/seguimiento?guia=${order.guide_number}`;

    const reply = [
      `🔧 ${tenantInfo?.name || 'TecnoTaller'}`,
      `Guía: ${order.guide_number}`,
      `Equipo: ${order.device_brand} ${order.device_model}`,
      `Estado actual: ${statusLabel}`,
      ``,
      `Tu chat quedó vinculado para recibir actualizaciones de esta orden.`,
      `Ver detalle: ${trackingUrl}`,
    ].join('\n');

    await this.sendMessage(chatId, reply);
  }

  startPolling(): void {
    if (!env.telegram.botToken || this.pollingActive) {
      return;
    }

    this.pollingActive = true;
    logger.info('🤖 Bot de Telegram iniciado (polling activo)');

    const poll = async () => {
      while (this.pollingActive) {
        try {
          const url = `${this.getApiUrl('getUpdates')}?offset=${this.lastOffset}&timeout=20`;
          const res = await fetch(url);
          if (res.ok) {
            const payload = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
            if (payload.ok && Array.isArray(payload.result)) {
              for (const upd of payload.result) {
                this.lastOffset = Math.max(this.lastOffset, upd.update_id + 1);
                await this.handleIncomingUpdate(upd).catch((err) => {
                  logger.error({ err }, 'Error procesando mensaje de Telegram');
                });
              }
            }
          }
        } catch (err) {
          logger.warn({ err }, 'Reintentando polling de Telegram...');
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
    };

    void poll();
  }
}

export const telegramService = new TelegramService();
