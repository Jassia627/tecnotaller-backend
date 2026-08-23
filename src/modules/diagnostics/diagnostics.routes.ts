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

  router.post('/work-orders/:id/diagnostics', authorizeRoles(ROLES.TECNICO, ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.get('/work-orders/:id/diagnostics', authorizeRoles(ROLES.TECNICO, ROLES.ADMINISTRADOR), asyncHandler(controller.list.bind(controller)));

  return router;
}
