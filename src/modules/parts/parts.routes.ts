import { Router } from 'express';
import { PartController } from './parts.controller';
import { PartService } from './parts.service';
import { PartRepository } from './parts.repository';
import { WorkOrderRepository } from '../work-orders/work-orders.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createPartsRouter(): Router {
  const repository = new PartRepository();
  const workOrderRepository = new WorkOrderRepository();
  const service = new PartService(repository, workOrderRepository);
  const controller = new PartController(service);

  const router = Router();

  router.use(authMiddleware);

  router.get('/parts', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.list.bind(controller)));
  router.post('/parts', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.put('/parts/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.update.bind(controller)));
  router.post('/work-orders/:id/parts', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.assign.bind(controller)));

  return router;
}
