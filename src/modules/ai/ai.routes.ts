import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../shared/middlewares/auth';
import { authorizeRoles } from '../../shared/middlewares/authorize-roles';
import { ROLES } from '../../shared/types';
import { ForbiddenError } from '../../shared/errors/app-error';
import { asyncHandler } from '../../shared/utils/async-handler';
import { aiService } from './ai.service';

const inspectPhotoSchema = z.object({
  images: z
    .array(
      z.object({
        base64: z.string().min(10),
        mimeType: z.string().default('image/jpeg'),
      }),
    )
    .min(1)
    .max(4),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
});

const suggestDiagnosticSchema = z.object({
  workOrderId: z.string().uuid(),
});

const draftMessageSchema = z.object({
  workOrderId: z.string().uuid(),
  customContext: z.string().optional(),
});

export function createAiRouter(): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use(authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO));

  router.post(
    '/inspect-photo',
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new ForbiddenError('Usuario sin taller asignado');
      const input = inspectPhotoSchema.parse(req.body);
      const result = await aiService.inspectReceptionPhotos(tenantId, input);
      res.json(result);
    }),
  );

  router.post(
    '/suggest-diagnostic',
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new ForbiddenError('Usuario sin taller asignado');
      const input = suggestDiagnosticSchema.parse(req.body);
      const result = await aiService.suggestDiagnostic(tenantId, input.workOrderId);
      res.json(result);
    }),
  );

  router.post(
    '/draft-message',
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) throw new ForbiddenError('Usuario sin taller asignado');
      const input = draftMessageSchema.parse(req.body);
      const result = await aiService.draftCustomerMessage(
        tenantId,
        input.workOrderId,
        input.customContext,
      );
      res.json(result);
    }),
  );

  return router;
}
