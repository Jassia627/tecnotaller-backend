import { Router } from 'express';
import { DiagnosticController } from './diagnostics.controller';
import { DiagnosticService } from './diagnostics.service';
import { DiagnosticRepository } from './diagnostics.repository';
import { WorkOrderRepository } from '../work-orders/work-orders.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createDiagnosticsRouter(): Router {
  const repository = new DiagnosticRepository();
  const workOrderRepository = new WorkOrderRepository();
  const service = new DiagnosticService(repository, workOrderRepository);
  const controller = new DiagnosticController(service);

  const router = Router({ mergeParams: true });

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.TECNICO, ROLES.ADMINISTRADOR));

  // Listar diagnósticos de una orden
  router.get('/work-orders/:id/diagnostics', asyncHandler(controller.list.bind(controller)));

  // Crear diagnóstico
  router.post('/work-orders/:id/diagnostics', asyncHandler(controller.create.bind(controller)));

  // Obtener diagnóstico por ID
  router.get('/work-orders/:id/diagnostics/:diagnosticId', asyncHandler(controller.getById.bind(controller)));

  // Actualizar diagnóstico
  router.put('/work-orders/:id/diagnostics/:diagnosticId', asyncHandler(controller.update.bind(controller)));

  // Eliminar diagnóstico (soft-delete)
  router.delete('/work-orders/:id/diagnostics/:diagnosticId', asyncHandler(controller.delete.bind(controller)));

  return router;
}
