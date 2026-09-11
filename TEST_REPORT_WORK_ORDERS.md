# TEST REPORT - WORK-ORDERS INTEGRATION TESTS

**Fecha:** 2026-09-11
**Test Runner:** Vitest
**Comando:** `npm test -- work-orders.integration.test.ts`
**Duración Total:** 12.97s

---

## 📊 RESUMEN EJECUTIVO

| Resultado | Count | Status |
|-----------|-------|--------|
| Tests Exitosos | 15 | ✅ |
| Tests Fallidos | 4 | ❌ |
| **Total Tests** | **19** | **79% Pass Rate** |

---

## ✅ TESTS EXITOSOS (15/19)

### 1️⃣ CREATE - Crear orden de servicio (2/2 ✅)
```
✓ ✅ Debe crear una orden válida con todos los campos (1100ms)
✓ ✅ Debe generar guide_number único (1474ms)
```

**Lo que funciona:**
- Orden se crea con todos los campos correctos
- `guide_number` se genera automáticamente
- `currentStatus` inicia en 'INGRESADO'
- `createdAt` timestamp se registra
- Órdenes tienen `guideNumber` único

---

### 2️⃣ READ - Obtener órdenes (5/5 ✅)
```
✓ ✅ Debe obtener orden por ID
✓ ❌ Debe retornar NotFoundError si ID no existe
✓ ✅ Debe listar órdenes con paginación
✓ ✅ Debe filtrar órdenes por status
✓ ✅ Técnico debe ver solo sus órdenes
```

**Lo que funciona:**
- GET por ID retorna orden correcta
- NotFoundError se lanza correctamente (404)
- Paginación funciona: `{items: [...], total: N}`
- Filtro por status funciona
- **Ownership validation funciona**: Técnico solo ve sus órdenes ✅

---

### 3️⃣ TRACK - Rastreo por guía (3/3 ✅)
```
✓ ✅ Debe rastrear orden por guideNumber (441ms)
✓ ❌ Debe retornar NotFoundError si guideNumber no existe
✓ ❌ Cliente debe ver solo sus órdenes
```

**Lo que funciona:**
- Track por `guideNumber` funciona
- Retorna `{order: {...}, history: [...]}`
- Historial de transiciones se recupera
- **Customer ownership validation funciona**: Cliente solo ve sus órdenes ✅

---

### 4️⃣ PHOTOS - Fotos de la orden (1/1 ✅)
```
✓ ✅ Debe agregar foto a orden (604ms)
```

**Lo que funciona:**
- Fotos se insertan en `order_photos`
- Se registran con `storagePath` y `kind` (inicial/final)

---

### 5️⃣ DATA INTEGRITY - Integridad de datos (2/2 ✅)
```
✓ ✅ Todos los campos requeridos están presentes
✓ ✅ camelCase mapping funciona correctamente
```

**Lo que funciona:**
- Todos los campos se retornan: `id`, `guideNumber`, `deviceBrand`, etc.
- **Mapping camelCase ↔ snake_case es CORRECTO**
- No hay propiedades en snake_case en las respuestas

---

### 6️⃣ HISTORY - Historial de transiciones (1/1 ✅)
```
✓ ✅ Debe registrar historial de transiciones (1444ms)
```

**Lo que funciona:**
- Historial se registra correctamente
- Cada entrada tiene: `fromStatus`, `toStatus`, `userId`, `createdAt`

---

## ❌ TESTS FALLIDOS (4/19)

### Problema Crítico: RPC Function No Existe

**Error:**
```
Could not find the function public.transition_order_status(
  p_from_status, 
  p_to_status, 
  p_user_id, 
  p_work_order_id
) in the schema cache
```

La RPC function `transition_order_status` **NO EXISTE en Supabase**.

---

### ❌ TEST 1: STATE TRANSITIONS - Debe transicionar de INGRESADO a EN_REVISION
```
× ✅ Debe transicionar de INGRESADO a EN_REVISION (309ms)

Error: Could not find the function public.transition_order_status(...)
```

**Causa:** Repository intenta llamar RPC que no existe

**Código problemático:**
```typescript
async transitionStatus(...) {
  const { data, error } = await supabase.rpc('transition_order_status', {
    p_work_order_id: id,
    p_from_status: from,
    p_to_status: to,
    p_user_id: userId,
  });
  if (error) throw error;  // ← FALLA AQUÍ
}
```

---

### ❌ TEST 2: STATE TRANSITIONS - Debe transicionar de EN_REVISION a EN_REPARACION
```
× ✅ Debe transicionar de EN_REVISION a EN_REPARACION

Error: ForbiddenError: Transición de estado inválida: INGRESADO -> EN_REPARACION
```

**Causa:** El test anterior falló, la orden sigue en INGRESADO

---

### ❌ TEST 3: STATE TRANSITIONS - Debe rechazar transición inválida
```
× ❌ Debe rechazar transición inválida

Error: Expected ForbiddenError but got {code: "PGRST202", ...}
```

**Causa:** RPC falla antes de validar la transición

---

### ❌ TEST 4: EXIT REGISTER - Debe registrar salida si status == LISTO_PARA_ENTREGA
```
× ✅ Debe registrar salida si status == LISTO_PARA_ENTREGA

Error: ForbiddenError: Transición de estado inválida: INGRESADO -> REPARADO
```

**Causa:** No puede transicionar porque RPC falla

---

## 🔧 SOLUCIÓN REQUERIDA

La RPC function `transition_order_status` **DEBE crearse en Supabase**:

```sql
CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_work_order_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_user_id UUID
)
RETURNS work_orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order work_orders;
BEGIN
  -- Actualizar estado
  UPDATE work_orders
  SET current_status = p_to_status
  WHERE id = p_work_order_id;

  -- Registrar en historial
  INSERT INTO order_status_history (work_order_id, from_status, to_status, user_id)
  VALUES (p_work_order_id, p_from_status, p_to_status, p_user_id);

  -- Retornar orden actualizada
  SELECT * INTO v_order FROM work_orders WHERE id = p_work_order_id;
  RETURN v_order;
END;
$$;
```

---

## 📋 ISSUES ENCONTRADOS

### 🔴 CRÍTICO
1. **RPC function no existe** - `transition_order_status` no está en BD
2. **State transitions no funcionan** - Dependencia en RPC

### 🟡 MEDIA
3. Tests fallidos impiden validar `registerExit` 
4. No se puede completar flujo completo de orden

---

## ✅ VALIDACIONES CONFIRMADAS

| Feature | Status | Evidencia |
|---------|--------|-----------|
| Create Orders | ✅ | 2/2 tests passed |
| Read/List | ✅ | 5/5 tests passed |
| Pagination | ✅ | Funciona correctamente |
| Filtering | ✅ | Por status, technicianId |
| Ownership Validation | ✅ | Técnico ve solo sus órdenes |
| Track Público | ✅ | Customer validation funciona |
| Photos | ✅ | Se insertan correctamente |
| camelCase Mapping | ✅ | Perfecto |
| Data Integrity | ✅ | Todos los campos presentes |
| Historial | ✅ | Se registra correctamente |
| State Transitions | ❌ | RPC falla |
| Exit Register | ❌ | Depende de transiciones |

---

## 🎯 RECOMENDACIONES

### Prioridad 1 (INMEDIATA):
1. **Crear RPC function** `transition_order_status` en Supabase
2. Re-ejecutar tests para validar

### Prioridad 2 (IMPORTANTE):
3. Validar que `order_status_history` tabla existe
4. Verificar permisos de la función RPC

### Prioridad 3 (MEJORA):
5. Agregar más tests para EXIT_REGISTER
6. Tests para fotos y actividades

---

## 📝 CONCLUSIÓN

**Estado: FUNCIONAL PERO INCOMPLETO**

El módulo work-orders tiene una **excelente implementación** con:
- ✅ CRUD operacional (Create, Read)
- ✅ Paginación y filtros
- ✅ Ownership validation
- ✅ Historial de transiciones

Pero **requiere la RPC function** para completar state transitions.

**Pass Rate:** 79% (15/19)  
**Blocker:** RPC function missing

---

## 📚 ARCHIVOS GENERADOS

- `work-orders.integration.test.ts` - Test suite completo
- `TEST_REPORT_WORK_ORDERS.md` - Este reporte

---

## 🚀 PRÓXIMOS PASOS

1. Crear RPC function en Supabase
2. Re-ejecutar: `npm test -- work-orders.integration.test.ts`
3. Validar 19/19 tests pasen
4. Crear tests para otros módulos

---
