import { Router } from 'express';
import { ServiceController } from './services.controller';
import { ServiceService } from './services.service';
import { ServiceRepository } from './services.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createServicesRouter(): Router {
  const repository = new ServiceRepository();
  const service = new ServiceService(repository);
  const controller = new ServiceController(service);

  const router = Router();

  router.get('/', asyncHandler(controller.listPublic.bind(controller)));

  router.use(authMiddleware);

  router.get('/admin/all', asyncHandler(controller.listAll.bind(controller)));
  router.post('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.put('/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.update.bind(controller)));
  router.patch('/:id/status', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.changeStatus.bind(controller)));

  return router;
}
