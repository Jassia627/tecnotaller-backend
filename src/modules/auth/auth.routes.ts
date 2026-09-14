import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { loginSchema, registerSchema } from './auth.types';
import { validateRequest } from '../../shared/middleware/validate-request.middleware';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authMiddleware } from '../../shared/middlewares/auth';

export function createAuthRouter(): Router {
  const repository = new AuthRepository();
  const service = new AuthService(repository);
  const controller = new AuthController(service);

  const router = Router();

  // Validación ocurre en middleware, controlador solo orquesta
  router.post('/register', validateRequest(registerSchema), asyncHandler(controller.register.bind(controller)));
  router.post('/login', validateRequest(loginSchema), asyncHandler(controller.login.bind(controller)));
  router.post('/logout', authMiddleware, asyncHandler(controller.logout.bind(controller)));
  router.get('/me', authMiddleware, asyncHandler(controller.me.bind(controller)));

  return router;
}
