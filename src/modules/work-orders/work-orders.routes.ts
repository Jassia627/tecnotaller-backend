import { Router } from 'express';
import { WorkOrderController } from './work-orders.controller';
import { WorkOrderService } from './work-orders.service';
import { WorkOrderRepository } from './work-orders.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { guidGenerator } from '../../shared/utils/guid';
import { createPhotosRouter } from '../photos/photos.routes';

export function createWorkOrdersRouter(): Router {
  const repository = new WorkOrderRepository();
  const service = new WorkOrderService(repository, guidGenerator);
  const controller = new WorkOrderController(service);

  const router = Router();

  // Seguimiento público por guía (RF-15)
  router.get('/track/:guideNumber', asyncHandler(controller.trackByGuide.bind(controller)));

  router.use(authMiddleware);

  router.post('/', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.create.bind(controller)));
  router.get('/', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.list.bind(controller)));
  router.get('/:id', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.getById.bind(controller)));
  router.patch('/:id/status', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.transitionStatus.bind(controller)));
  router.get('/:id/history', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.CLIENTE), asyncHandler(controller.getHistory.bind(controller)));
  router.post('/:id/exit-register', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.registerExit.bind(controller)));
  router.post('/:id/activities', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.createActivity.bind(controller)));
  router.get('/:id/activities', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), asyncHandler(controller.listActivities.bind(controller)));
  
  // Submount fotos módulo
  router.use('/:id/photos', createPhotosRouter());

  return router;
}
