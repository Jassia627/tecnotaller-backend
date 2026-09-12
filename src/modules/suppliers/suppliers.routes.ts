import { Router } from 'express';
import { SupplierController } from './suppliers.controller';
import { SupplierRepository } from './suppliers.repository';
import { SupplierService } from './suppliers.service';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { asyncHandler } from '../../shared/utils/async-handler';

const repository = new SupplierRepository();
const service = new SupplierService(repository);
const controller = new SupplierController(service);

export function createSuppliersRouter(): Router {
  const router = Router();

  // GET /suppliers - Listar proveedores (público, sin autenticación)
  router.get('/', asyncHandler((req, res) => controller.list(req, res)));

  // GET /suppliers/:id - Obtener proveedor por ID (público)
  router.get('/:id', asyncHandler((req, res) => controller.getById(req, res)));

  // POST /suppliers - Crear proveedor (requiere autenticación de admin)
  router.post(
    '/',
    authMiddleware,
    authorizeRoles('administrador'),
    asyncHandler((req, res) => controller.create(req, res)),
  );

  // PUT /suppliers/:id - Actualizar proveedor (requiere autenticación de admin)
  router.put(
    '/:id',
    authMiddleware,
    authorizeRoles('administrador'),
    asyncHandler((req, res) => controller.update(req, res)),
  );

  // DELETE /suppliers/:id - Eliminar proveedor (soft-delete, requiere autenticación de admin)
  router.delete(
    '/:id',
    authMiddleware,
    authorizeRoles('administrador'),
    asyncHandler((req, res) => controller.delete(req, res)),
  );

  return router;
}
