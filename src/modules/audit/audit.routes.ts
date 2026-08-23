import { Router } from 'express';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createAuditRouter(): Router {
  const repository = new AuditRepository();
  const service = new AuditService(repository);
  const controller = new AuditController(service);

  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR));

  router.get('/', asyncHandler(controller.list.bind(controller)));

  return router;
}
