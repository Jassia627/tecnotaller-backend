import { Router } from 'express';
import { ReportController } from './reports.controller';
import { ReportService } from './reports.service';
import { ReportRepository } from './reports.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createReportsRouter(): Router {
  const repository = new ReportRepository();
  const service = new ReportService(repository);
  const controller = new ReportController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  router.get('/:type', asyncHandler(controller.generate.bind(controller)));

  return router;
}
