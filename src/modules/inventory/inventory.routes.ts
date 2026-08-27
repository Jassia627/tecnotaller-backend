import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createInventoryRouter(): Router {
  const repository = new InventoryRepository();
  const service = new InventoryService(repository);
  const controller = new InventoryController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  // GET /api/v1/inventory/low-stock - Listar productos/repuestos con stock bajo
  router.get('/low-stock', asyncHandler(controller.getLowStock.bind(controller)));

  return router;
}
