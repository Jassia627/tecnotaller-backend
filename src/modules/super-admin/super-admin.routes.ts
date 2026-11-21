import { Request, Response, Router } from 'express';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { asyncHandler } from '../../shared/utils/async-handler';
import { SuperAdminService } from './super-admin.service';
import {
  createPlanSchema,
  createTenantSchema,
  updatePlanSchema,
  updateTenantSchema,
} from './super-admin.types';

export function createSuperAdminRouter(): Router {
  const service = new SuperAdminService();
  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.SUPER_ADMIN));

  // Planes
  router.get(
    '/plans',
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await service.listPlans();
      res.json({ items });
    }),
  );

  router.post(
    '/plans',
    asyncHandler(async (req: Request, res: Response) => {
      const input = createPlanSchema.parse(req.body);
      const created = await service.createPlan(input);
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/plans/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const input = updatePlanSchema.parse(req.body);
      const updated = await service.updatePlan(req.params.id!, input);
      res.json(updated);
    }),
  );

  // Talleres (Tenants)
  router.get(
    '/tenants',
    asyncHandler(async (_req: Request, res: Response) => {
      const items = await service.listTenants();
      res.json({ items });
    }),
  );

  router.post(
    '/tenants',
    asyncHandler(async (req: Request, res: Response) => {
      const input = createTenantSchema.parse(req.body);
      const created = await service.createTenant(input);
      res.status(201).json(created);
    }),
  );

  router.patch(
    '/tenants/:id',
    asyncHandler(async (req: Request, res: Response) => {
      const input = updateTenantSchema.parse(req.body);
      const updated = await service.updateTenant(req.params.id!, input);
      res.json(updated);
    }),
  );

  return router;
}
