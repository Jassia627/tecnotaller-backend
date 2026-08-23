import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors/app-error';

export function authorizeRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new ForbiddenError('Usuario no autenticado'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`Requiere rol: ${roles.join(', ')}`));
    }
    next();
  };
}
