import { supabase } from '../../config/supabase';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { invalidateTenantTokens } from '../../shared/middlewares/auth';
import { clearTenantCache } from '../../shared/middlewares/resolve-tenant';
import { planLimitService } from '../../shared/services/plan-limits.service';
import { ROLES } from '../../shared/types';
import {
  CreatePlanInput,
  CreateTenantInput,
  UpdatePlanInput,
  UpdateTenantInput,
} from './super-admin.types';

export class SuperAdminService {
  // === PLANES ===
  async listPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      maxTechnicians: p.max_technicians,
      maxMonthlyOrders: p.max_monthly_orders,
      maxProducts: p.max_products,
      priceMonthly: Number(p.price_monthly),
      active: p.active,
      createdAt: p.created_at,
    }));
  }

  async createPlan(input: CreatePlanInput) {
    const { data, error } = await supabase
      .from('plans')
      .insert({
        name: input.name,
        slug: input.slug.toLowerCase(),
        max_technicians: input.maxTechnicians,
        max_monthly_orders: input.maxMonthlyOrders,
        max_products: input.maxProducts,
        price_monthly: input.priceMonthly,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError(`Ya existe un plan con el slug "${input.slug}"`);
      }
      throw error;
    }

    return data;
  }

  async updatePlan(id: string, input: UpdatePlanInput) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.slug !== undefined) updates.slug = input.slug.toLowerCase();
    if (input.maxTechnicians !== undefined) updates.max_technicians = input.maxTechnicians;
    if (input.maxMonthlyOrders !== undefined) updates.max_monthly_orders = input.maxMonthlyOrders;
    if (input.maxProducts !== undefined) updates.max_products = input.maxProducts;
    if (input.priceMonthly !== undefined) updates.price_monthly = input.priceMonthly;
    if (input.active !== undefined) updates.active = input.active;

    const { data, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Plan no encontrado');
    return data;
  }

  // === TALLERES (TENANTS) ===
  async listTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, plans(id, name, slug, max_technicians, max_monthly_orders, max_products, price_monthly)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tenantsWithUsage = await Promise.all(
      (data ?? []).map(async (t) => {
        let usage = null;
        try {
          usage = await planLimitService.getTenantUsage(t.id as string);
        } catch {
          usage = null;
        }
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          planId: t.plan_id,
          plan: t.plans,
          logoUrl: t.logo_url,
          whatsappNumber: t.whatsapp_number,
          email: t.email,
          phone: t.phone,
          address: t.address,
          active: t.active,
          createdAt: t.created_at,
          usage: usage?.usage ?? null,
        };
      }),
    );

    return tenantsWithUsage;
  }

  async createTenant(input: CreateTenantInput) {
    const slug = input.slug.trim().toLowerCase();

    // 1. Verificar que el plan exista
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id')
      .eq('id', input.planId)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) throw new BadRequestError('El plan seleccionado no existe');

    // 2. Crear taller
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: input.name.trim(),
        slug,
        plan_id: input.planId,
        whatsapp_number: input.whatsappNumber || null,
        logo_url: input.logoUrl || null,
        email: input.adminEmail,
        phone: input.phone || null,
        address: input.address || null,
      })
      .select('*')
      .single();

    if (tenantErr) {
      if (tenantErr.code === '23505') {
        throw new ConflictError(`Ya existe un taller con el slug "${slug}"`);
      }
      throw tenantErr;
    }

    // 3. Crear usuario administrador en Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: input.adminEmail.trim(),
      password: input.adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.adminFullName.trim(),
        role: ROLES.ADMINISTRADOR,
        tenant_id: tenant.id,
      },
    });

    if (authErr || !authData.user) {
      // Rollback del taller si falla creación del usuario admin
      await supabase.from('tenants').delete().eq('id', tenant.id);
      throw new BadRequestError(authErr?.message || 'No se pudo crear el usuario administrador del taller');
    }

    // 4. Asegurar perfil en public.profiles con role = administrador y tenant_id
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: authData.user.id,
      full_name: input.adminFullName.trim(),
      role: ROLES.ADMINISTRADOR,
      tenant_id: tenant.id,
      active: true,
    });

    if (profileErr) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from('tenants').delete().eq('id', tenant.id);
      throw profileErr;
    }

    clearTenantCache(slug);
    return {
      tenant,
      adminUser: {
        id: authData.user.id,
        email: authData.user.email,
        fullName: input.adminFullName.trim(),
      },
    };
  }

  async updateTenant(id: string, input: UpdateTenantInput) {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.planId !== undefined) updates.plan_id = input.planId;
    if (input.whatsappNumber !== undefined) updates.whatsapp_number = input.whatsappNumber;
    if (input.logoUrl !== undefined) updates.logo_url = input.logoUrl;
    if (input.email !== undefined) updates.email = input.email || null;
    if (input.phone !== undefined) updates.phone = input.phone;
    if (input.address !== undefined) updates.address = input.address;
    if (input.active !== undefined) updates.active = input.active;

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError('Taller no encontrado');

    clearTenantCache(data.slug as string);
    invalidateTenantTokens(id);
    return data;
  }
}
