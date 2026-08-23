-- =====================================================================
-- FIX: corregir funciones RPC transaccionales
-- Pegar en Dashboard > SQL Editor > Run
-- Corrige el error "subquery must return only one column".
-- =====================================================================

create or replace function public.register_inventory_movement(
  p_product_id uuid, p_type text, p_quantity integer, p_reason text, p_user_id uuid
)
returns public.products language plpgsql security definer set search_path = public as $$
declare v_stock integer; v_result public.products;
begin
  select stock into v_stock from public.products where id = p_product_id for update;
  if not found then raise exception 'Producto no encontrado'; end if;
  if p_type = 'OUT' then
    if v_stock < p_quantity then raise exception 'Stock insuficiente'; end if;
    update public.products set stock = stock - p_quantity, updated_at = now() where id = p_product_id;
  elsif p_type = 'IN' then
    update public.products set stock = stock + p_quantity, updated_at = now() where id = p_product_id;
  else
    raise exception 'Tipo de movimiento inválido';
  end if;
  insert into public.inventory_movements (product_id, type, quantity, reason, user_id)
  values (p_product_id, p_type, p_quantity, p_reason, p_user_id);
  select * into v_result from public.products where id = p_product_id;
  return v_result;
end;
$$;

create or replace function public.transition_order_status(
  p_work_order_id uuid, p_from_status text, p_to_status text, p_user_id uuid
)
returns public.work_orders language plpgsql security definer set search_path = public as $$
declare v_result public.work_orders;
begin
  update public.work_orders
  set current_status = p_to_status, updated_at = now()
  where id = p_work_order_id and current_status = p_from_status;
  if not found then raise exception 'Transición de estado inválida'; end if;
  insert into public.order_status_history (work_order_id, from_status, to_status, user_id)
  values (p_work_order_id, p_from_status, p_to_status, p_user_id);
  select * into v_result from public.work_orders where id = p_work_order_id;
  return v_result;
end;
$$;

create or replace function public.assign_part_to_order(
  p_work_order_id uuid, p_part_id uuid, p_quantity integer
)
returns public.parts language plpgsql security definer set search_path = public as $$
declare v_stock integer; v_price numeric; v_result public.parts;
begin
  select stock, sale_price into v_stock, v_price from public.parts where id = p_part_id for update;
  if not found then raise exception 'Repuesto no encontrado'; end if;
  if v_stock < p_quantity then raise exception 'Stock de repuesto insuficiente'; end if;
  update public.parts set stock = stock - p_quantity, updated_at = now() where id = p_part_id;
  insert into public.order_parts (work_order_id, part_id, quantity, unit_price)
  values (p_work_order_id, p_part_id, p_quantity, v_price);
  select * into v_result from public.parts where id = p_part_id;
  return v_result;
end;
$$;
