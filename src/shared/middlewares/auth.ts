import { NextFunction, Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { UnauthorizedError } from '../errors/app-error';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autenticación requerido');
    }

    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError('Token inválido o expirado');
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: (data.user.user_metadata?.role as string) ?? 'cliente',
    };

    next();
  } catch (err) {
    next(err);
  }
}
