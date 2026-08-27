import { Router } from 'express';
import { ProductController } from './products.controller';
import { ProductService } from './products.service';
import { ProductRepository } from './products.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createProductsRouter(): Router {
  const repository = new ProductRepository();
  const service = new ProductService(repository);
  const controller = new ProductController(service);

  const router = Router();

  router.get('/admin/all', authMiddleware, authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.listAll.bind(controller)));

  router.get('/', asyncHandler(controller.listPublic.bind(controller)));
  router.get('/:id', asyncHandler(controller.getById.bind(controller)));

  router.use(authMiddleware);

  router.post('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.put('/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.update.bind(controller)));
  router.patch('/:id/availability', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.changeAvailability.bind(controller)));
  router.get('/:id/movements', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.listMovements.bind(controller)));
  router.post('/:id/movements', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.registerMovement.bind(controller)));

  return router;
}
