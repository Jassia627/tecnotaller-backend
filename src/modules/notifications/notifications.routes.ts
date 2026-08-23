import { Router } from 'express';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { NotificationRepository } from './notifications.repository';
import { EmailNotifier } from './notifiers';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createNotificationsRouter(): Router {
  const repository = new NotificationRepository();
  const notifier = new EmailNotifier();
  const service = new NotificationService(repository, notifier);
  const controller = new NotificationController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO));

  router.get('/work-orders/:id/notifications', asyncHandler(controller.listByWorkOrder.bind(controller)));

  return router;
}
