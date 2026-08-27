import { Router } from 'express';
import { CustomerController } from './customers.controller';
import { CustomerService } from './customers.service';
import { CustomerRepository } from './customers.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { ForbiddenError } from '../../shared/errors/app-error';

export function createCustomersRouter(): Router {
  const repository = new CustomerRepository();
  const service = new CustomerService(repository);
  const controller = new CustomerController(service);

  const router = Router();

  router.use(authMiddleware);

  // Listar clientes - solo admin
  router.get('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.list.bind(controller)));
  
  // Crear cliente - solo admin
  router.post('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  
  // Ver cliente por ID - solo admin o el cliente autenticado
  router.get('/:id', asyncHandler(async (req, res, next) => {
    try {
      // Permitir solo si es admin o el cliente autenticado
      if (req.user?.role !== ROLES.ADMINISTRADOR && req.user?.id !== req.params.id) {
        throw new ForbiddenError('No tienes permisos para ver este cliente');
      }
      await controller.getById(req, res);
    } catch (err) {
      next(err);
    }
  }));
  
  // Ver órdenes del cliente - solo admin o el cliente autenticado
  router.get('/:id/work-orders', asyncHandler(async (req, res, next) => {
    try {
      // Permitir solo si es admin o el cliente autenticado
      if (req.user?.role !== ROLES.ADMINISTRADOR && req.user?.id !== req.params.id) {
        throw new ForbiddenError('No tienes permisos para ver las órdenes de este cliente');
      }
      await controller.listWorkOrders(req, res);
    } catch (err) {
      next(err);
    }
  }));

  return router;
}
