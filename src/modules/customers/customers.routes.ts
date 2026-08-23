import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { CustomerService } from './customers.service';
import { CustomerRepository } from './customers.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createCustomersRouter(): Router {
  const repository = new CustomerRepository();
  const service = new CustomerService(repository);
  const controller = new CustomerController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  router.get('/', asyncHandler(controller.list.bind(controller)));
  router.post('/', asyncHandler(controller.create.bind(controller)));
  router.get('/:id', asyncHandler(controller.getById.bind(controller)));
  router.get('/:id/work-orders', asyncHandler(controller.listWorkOrders.bind(controller)));

  return router;
}
