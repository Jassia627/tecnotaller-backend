import { Router } from 'express';
import { PurchaseRequestController } from './purchase-requests.controller';
import { PurchaseRequestService } from './purchase-requests.service';
import { PurchaseRequestRepository } from './purchase-requests.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createPurchaseRequestsRouter(): Router {
  const repository = new PurchaseRequestRepository();
  const service = new PurchaseRequestService(repository);
  const controller = new PurchaseRequestController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  // GET /api/v1/purchase-requests - Listar solicitudes
  router.get('/', asyncHandler(controller.list.bind(controller)));

  // POST /api/v1/purchase-requests - Crear solicitud
  router.post('/', asyncHandler(controller.create.bind(controller)));

  // GET /api/v1/purchase-requests/:id - Ver solicitud
  router.get('/:id', asyncHandler(controller.getById.bind(controller)));

  // PATCH /api/v1/purchase-requests/:id/status - Actualizar estado
  router.patch('/:id/status', asyncHandler(controller.updateStatus.bind(controller)));

  // POST /api/v1/purchase-requests/:id/receive - Recibir compra y actualizar stock
  router.post('/:id/receive', asyncHandler(controller.receive.bind(controller)));

  return router;
}
