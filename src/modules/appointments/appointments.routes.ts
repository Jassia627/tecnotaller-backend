import { Router } from 'express';
import { AppointmentController } from './appointments.controller';
import { AppointmentService } from './appointments.service';
import { AppointmentRepository } from './appointments.repository';
import { WorkOrderService } from '../work-orders/work-orders.service';
import { WorkOrderRepository } from '../work-orders/work-orders.repository';
import { CustomerRepository } from '../customers/customers.repository';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { guidGenerator } from '../../shared/utils/guid';

export function createAppointmentsRouter(): Router {
  const repository = new AppointmentRepository();
  
  // Inyectar WorkOrderService para la conversión de citas a órdenes
  const workOrderRepository = new WorkOrderRepository();
  const workOrderService = new WorkOrderService(workOrderRepository, guidGenerator);
  
  // Inyectar CustomerRepository para buscar clientes por teléfono
  const customerRepository = new CustomerRepository();
  
  const service = new AppointmentService(repository, workOrderService, customerRepository);
  const controller = new AppointmentController(service);

  const router = Router();

  // Endpoint público para crear citas (clientes desde la web)
  router.post('/', asyncHandler(controller.create.bind(controller)));

  router.use(authMiddleware);
  
  // Listar citas (admin)
  router.get('/', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.list.bind(controller)));
  
  // Obtener cita por ID (admin)
  router.get('/:id', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.getById.bind(controller)));
  
  // Confirmar cita (admin)
  router.patch('/:id/confirm', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.confirm.bind(controller)));
  
  // Cancelar cita (admin)
  router.patch('/:id/cancel', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.cancel.bind(controller)));
  
  // Completar cita - servicio realizado en el momento (admin)
  router.patch('/:id/complete', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.complete.bind(controller)));
  
  // Convertir cita a orden de servicio (admin) - idempotente
  router.post('/:id/convert', authorizeRoles(ROLES.ADMINISTRADOR), asyncHandler(controller.convertToOrder.bind(controller)));

  return router;
}
