import { Router } from 'express';
import { TechnicianController } from './technicians.controller';
import { TechnicianService } from './technicians.service';
import { TechnicianRepository } from './technicians.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createTechniciansRouter(): Router {
  const repository = new TechnicianRepository();
  const service = new TechnicianService(repository);
  const controller = new TechnicianController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  router.get('/', asyncHandler(controller.list.bind(controller)));
  router.post('/', asyncHandler(controller.register.bind(controller)));
  router.patch('/:id', asyncHandler(controller.update.bind(controller)));
  router.patch('/:id/status', asyncHandler(controller.setActive.bind(controller)));
  router.delete('/:id', asyncHandler(controller.delete.bind(controller)));
  router.get('/:id/work-orders', asyncHandler(controller.listWorkOrders.bind(controller)));

  return router;
}
