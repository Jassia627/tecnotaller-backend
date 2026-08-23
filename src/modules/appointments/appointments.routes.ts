import { Router } from 'express';
import { AppointmentController } from './appointments.controller';
import { AppointmentService } from './appointments.service';
import { AppointmentRepository } from './appointments.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';

export function createAppointmentsRouter(): Router {
  const repository = new AppointmentRepository();
  const service = new AppointmentService(repository);
  const controller = new AppointmentController(service);

  const router = Router();

  router.post('/', asyncHandler(controller.create.bind(controller)));

  router.use(authMiddleware);
  router.get('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.list.bind(controller)));
  router.patch('/:id/confirm', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.confirm.bind(controller)));
  router.patch('/:id/cancel', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.cancel.bind(controller)));

  return router;
}
