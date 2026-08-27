import { Router } from 'express';
import { ActivityController } from './activities.controller';
import { ActivityService } from './activities.service';
import { ActivityRepository } from './activities.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createActivitiesRouter(): Router {
  const repository = new ActivityRepository();
  const service = new ActivityService(repository);
  const controller = new ActivityController(service);

  const router = Router({ mergeParams: true });

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO));

  router.post('/', asyncHandler(controller.create.bind(controller)));
  router.get('/', asyncHandler(controller.listByWorkOrder.bind(controller)));

  return router;
}
