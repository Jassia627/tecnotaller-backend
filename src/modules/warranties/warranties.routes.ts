import { Router } from 'express';
import { WarrantyController } from './warranties.controller';
import { WarrantyService } from './warranties.service';
import { WarrantyRepository } from './warranties.repository';
import { WorkOrderRepository } from '../work-orders/work-orders.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createWarrantiesRouter(): Router {
  const repository = new WarrantyRepository();
  const workOrderRepository = new WorkOrderRepository();
  const service = new WarrantyService(repository, workOrderRepository);
  const controller = new WarrantyController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO));

  router.post('/work-orders/:id/warranty', asyncHandler(controller.create.bind(controller)));
  router.get('/work-orders/:id/warranty', asyncHandler(controller.get.bind(controller)));

  return router;
}
