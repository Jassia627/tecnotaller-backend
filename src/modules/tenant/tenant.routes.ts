import { Request, Response, Router } from 'express';
import { supabase } from '../../config/supabase';
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { authMiddleware } from '../../shared/middlewares/auth';
import { planLimitService } from '../../shared/services/plan-limits.service';
import { asyncHandler } from '../../shared/utils/async-handler';

export function createTenantRouter(): Router {
  const router = Router();

  // Información pública de un taller por slug (para /t/:slug en el portal de clientes)
  router.get(
    '/public/:slug',
    asyncHandler(async (req: Request, res: Response) => {
      const slug = req.params.slug!.trim().toLowerCase();
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, logo_url, whatsapp_number, phone, address, active')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new NotFoundError('Taller no encontrado o suspendido');
      }

      res.json({
        id: data.id,
        name: data.name,
        slug: data.slug,
        logoUrl: data.logo_url,
        whatsappNumber: data.whatsapp_number,
        phone: data.phone,
        address: data.address,
      });
    }),
  );

  // Información del taller autenticado + uso del plan
  router.get(
    '/me',
    authMiddleware,
    asyncHandler(async (req: Request, res: Response) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        throw new ForbiddenError('El usuario no pertenece a un taller específico');
      }

      const [{ data: tenant, error }, planUsage] = await Promise.all([
        supabase
          .from('tenants')
          .select('id, name, slug, logo_url, whatsapp_number, email, phone, address, active')
          .eq('id', tenantId)
          .maybeSingle(),
        planLimitService.getTenantUsage(tenantId),
      ]);

      if (error) throw error;
      if (!tenant) throw new NotFoundError('Taller no encontrado');

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logo_url,
          whatsappNumber: tenant.whatsapp_number,
          email: tenant.email,
          phone: tenant.phone,
          address: tenant.address,
          active: tenant.active,
        },
        plan: planUsage,
      });
    }),
  );

  return router;
}
