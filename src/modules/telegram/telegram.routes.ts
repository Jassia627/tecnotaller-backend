import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { ForbiddenError } from '../../shared/errors/app-error';
import { asyncHandler } from '../../shared/utils/async-handler';
import { telegramService } from './telegram.service';

const sendOrderMessageSchema = z.object({
  workOrderId: z.string().uuid(),
  message: z.string().min(2),
});

export function createTelegramRouter(): Router {
  const router = Router();

  // Webhook opcional para producción
  router.post(
    '/webhook',
    asyncHandler(async (req: Request, res: Response) => {
      await telegramService.handleIncomingUpdate(req.body);
      res.json({ ok: true });
    }),
  );

  // Enviar mensaje desde el panel del taller al Telegram del cliente
  router.post(
    '/send-order-message',
    authMiddleware,
    authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO),
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new ForbiddenError('Usuario sin taller asignado');
      const input = sendOrderMessageSchema.parse(req.body);
      const result = await telegramService.sendOrderMessage(
        tenantId,
        input.workOrderId,
        input.message,
      );
      res.json(result);
    }),
  );

  return router;
}
