-- Migración 0014: Crear RPC function para transicionar estado de órdenes

CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_work_order_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_user_id UUID
)
RETURNS public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.work_orders;
  v_current_status TEXT;
BEGIN
  -- Obtener estado actual para validación
  SELECT current_status INTO v_current_status 
  FROM public.work_orders 
  WHERE id = p_work_order_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Orden de servicio no encontrada: %', p_work_order_id;
  END IF;

  -- Validar que el estado coincida con p_from_status (para integridad)
  IF v_current_status != p_from_status THEN
    RAISE EXCEPTION 'Estado actual (%) no coincide con estado esperado (%)', v_current_status, p_from_status;
  END IF;

  -- Actualizar estado de la orden
  UPDATE public.work_orders
  SET current_status = p_to_status
  WHERE id = p_work_order_id;

  -- Registrar transición en historial
  INSERT INTO public.order_status_history (work_order_id, from_status, to_status, user_id)
  VALUES (p_work_order_id, p_from_status, p_to_status, p_user_id);

  -- Retornar orden actualizada
  SELECT * INTO v_order FROM public.work_orders WHERE id = p_work_order_id;
  
  RETURN v_order;
END;
$$;

-- Comentario para documentar
COMMENT ON FUNCTION public.transition_order_status(UUID, TEXT, TEXT, UUID) IS
  'Transiciona el estado de una orden de servicio y registra el cambio en el historial.
   Parámetros:
   - p_work_order_id: ID de la orden de servicio
   - p_from_status: Estado anterior (para validación)
   - p_to_status: Estado nuevo
   - p_user_id: ID del usuario que realiza el cambio
   
   Retorna: La orden actualizada con el nuevo estado';
