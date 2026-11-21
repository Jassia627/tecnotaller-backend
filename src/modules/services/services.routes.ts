import { Router } from 'express';
import { ServiceController } from './services.controller';
import { ServiceService } from './services.service';
import { ServiceRepository } from './services.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { resolveTenantMiddleware } from '../../shared/middlewares/resolve-tenant';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createServicesRouter(): Router {
  const repository = new ServiceRepository();
  const service = new ServiceService(repository);
  const controller = new ServiceController(service);

  const router = Router();

  router.get('/', resolveTenantMiddleware, asyncHandler(controller.listPublic.bind(controller)));
  router.post('/quote', resolveTenantMiddleware, asyncHandler(controller.quote.bind(controller)));

  router.use(authMiddleware);

  router.get('/admin/all', asyncHandler(controller.listAll.bind(controller)));
  router.post('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.put('/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.update.bind(controller)));
  router.patch('/:id/status', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.changeStatus.bind(controller)));
  router.delete('/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.delete.bind(controller)));

  return router;
}
