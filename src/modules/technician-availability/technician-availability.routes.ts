import { Router } from 'express';
import { TechnicianAvailabilityController } from './technician-availability.controller';
import { TechnicianAvailabilityService } from './technician-availability.service';
import { TechnicianAvailabilityRepository } from './technician-availability.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { ROLES } from '../../shared/types';
import { ForbiddenError } from '../../shared/errors/app-error';

export function createTechnicianAvailabilityRouter(): Router {
  const repository = new TechnicianAvailabilityRepository();
  const service = new TechnicianAvailabilityService(repository);
  const controller = new TechnicianAvailabilityController(service);

  const router = Router();

  router.use(authMiddleware);

  // GET /api/v1/technicians/:id/availability
  router.get('/:id/availability', asyncHandler(controller.getByTechnicianId.bind(controller)));

  // PATCH /api/v1/technicians/:id/availability - El técnico puede actualizar su propia disponibilidad o admin
  router.patch('/:id/availability', asyncHandler(async (req, res, next) => {
    try {
      if (req.user?.role !== ROLES.ADMINISTRADOR && req.user?.id !== req.params.id) {
        throw new ForbiddenError('No tienes permisos para actualizar esta disponibilidad');
      }
      await controller.update(req, res);
    } catch (err) {
      next(err);
    }
  }));

  return router;
}
