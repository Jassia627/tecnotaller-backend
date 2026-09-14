import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/app-error';

/**
 * Middleware de validación genérico
 * Encapsula la validación Zod fuera del controlador
 * Patrón: Middleware de Validación + SRP
 * 
 * Beneficios:
 * - El controlador solo orquesta HTTP, no valida
 * - Validación reutilizable en múltiples rutas
 * - Cambios en schemas no afectan el controlador
 */
export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validación ocurre aquí, no en el controlador
      const validated = schema.parse(req.body);
      
      // Adjuntar datos validados al request
      req.validatedData = validated;
      
      next();
    } catch (error: any) {
      // Manejo de errores de validación centralizado
      if (error.errors && Array.isArray(error.errors)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      
      res.status(400).json({
        error: 'Validation failed',
        message: error.message,
      });
    }
  };
}

/**
 * Extender Express Request para incluir validatedData
 * Esto permite que TypeScript entienda req.validatedData
 */
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}
