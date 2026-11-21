import { supabase } from '../../config/supabase';
import { ForbiddenError } from '../errors/app-error';

export interface TenantPlanUsage {
  planName: string;
  planSlug: string;
  limits: {
    maxTechnicians: number;
    maxMonthlyOrders: number;
    maxProducts: number;
  };
  usage: {
    technicians: number;
    monthlyOrders: number;
    products: number;
  };
}

interface TenantPlanRow {
  id: string;
  active: boolean;
  plans: {
    name: string;
    slug: string;
    max_technicians: number;
    max_monthly_orders: number;
    max_products: number;
  } | null;
}

export class PlanLimitService {
  private async getTenantPlan(tenantId: string): Promise<NonNullable<TenantPlanRow['plans']>> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, active, plans(name, slug, max_technicians, max_monthly_orders, max_products)')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new ForbiddenError('Taller no encontrado para validar el plan');
    }

    const row = data as unknown as TenantPlanRow;
    if (!row.active) {
      throw new ForbiddenError('Este taller se encuentra suspendido.');
    }

    if (!row.plans) {
      throw new ForbiddenError('El taller no tiene un plan activo asignado.');
    }

    return row.plans;
  }

  async assertCanCreateTechnician(tenantId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);

    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'tecnico')
      .eq('active', true);

    if (error) throw error;
    const current = count ?? 0;

    if (current >= plan.max_technicians) {
      throw new ForbiddenError(
        `Has alcanzado el límite de ${plan.max_technicians} técnico(s) del plan ${plan.name}. Actualiza tu plan para agregar más.`,
      );
    }
  }

  async assertCanCreateWorkOrder(tenantId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth.toISOString());

    if (error) throw error;
    const current = count ?? 0;

    if (current >= plan.max_monthly_orders) {
      throw new ForbiddenError(
        `Has alcanzado el límite de ${plan.max_monthly_orders} órdenes mensuales del plan ${plan.name}. Actualiza tu plan para continuar.`,
      );
    }
  }

  async assertCanCreateProduct(tenantId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);

    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (error) throw error;
    const current = count ?? 0;

    if (current >= plan.max_products) {
      throw new ForbiddenError(
        `Has alcanzado el límite de ${plan.max_products} producto(s) del plan ${plan.name}. Actualiza tu plan para agregar más.`,
      );
    }
  }

  async getTenantUsage(tenantId: string): Promise<TenantPlanUsage> {
    const plan = await this.getTenantPlan(tenantId);

    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const [techRes, ordersRes, productsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('role', 'tecnico')
        .eq('active', true),
      supabase
        .from('work_orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfMonth.toISOString()),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('active', true),
    ]);

    if (techRes.error) throw techRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;

    return {
      planName: plan.name,
      planSlug: plan.slug,
      limits: {
        maxTechnicians: plan.max_technicians,
        maxMonthlyOrders: plan.max_monthly_orders,
        maxProducts: plan.max_products,
      },
      usage: {
        technicians: techRes.count ?? 0,
        monthlyOrders: ordersRes.count ?? 0,
        products: productsRes.count ?? 0,
      },
    };
  }
}

export const planLimitService = new PlanLimitService();
