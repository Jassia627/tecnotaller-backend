# CRITICAL ISSUES - AUDITORÍA DEL FRONTEND

**Fecha:** 2026-09-11
**Reportado por:** Equipo Frontend
**Severidad:** CRÍTICA - Bloquea desarrollo
**Estado:** En análisis y corrección

---

## 📋 RESUMEN DE ISSUES

El frontend realizó auditoría exhaustiva de 3 endpoints de compras y encontró:

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| **1** | GET /suppliers → 404 (No existe) | 🔴 CRÍTICA | ❌ Sin resolver |
| **2** | POST /purchase-requests → 500 (Error interno) | 🔴 CRÍTICA | ⚠️ Analizando |
| **3** | Rutas divergentes (/purchases vs /purchase-requests) | 🟡 MEDIA | ✅ Identificado |

---

## 🔍 ANÁLISIS DETALLADO

### ISSUE 1: Endpoint Suppliers (404 Not Found)

**Endpoint:** `GET /api/v1/suppliers`  
**Response:** 404 Not Found  
**Error:** `{"error":{"code":"NOT_FOUND","message":"Ruta no encontrada"}}`

**Análisis:**
- ✅ Se revisó la estructura de módulos
- ❌ **NO EXISTE módulo `suppliers`**
- ✅ Existe: `products`, `parts`, `inventory`
- ❌ Falta: `suppliers` (module de proveedores)

**Impacto en Frontend:**
- No puede implementar selector de proveedores
- Bloquea formulario de "Nueva Compra"

**Acción Requerida:**
- Crear módulo `suppliers` con CRUD completo
- Endpoints necesarios:
  ```
  GET    /api/v1/suppliers              (listar)
  POST   /api/v1/suppliers              (crear)
  GET    /api/v1/suppliers/:id          (obtener)
  PUT    /api/v1/suppliers/:id          (actualizar)
  DELETE /api/v1/suppliers/:id          (soft-delete)
  ```

---

### ISSUE 2: POST /purchase-requests → 500 Internal Server Error

**Endpoint:** `POST /api/v1/purchase-requests`  
**Response:** 500 Internal Server Error  
**Error:** `{"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}`

**Análisis del Problema:**

El frontend probó múltiples payloads:

```
1. {"items": [{}]} 
   → 400 Bad Request (items: ["Required"])
   ✅ Validación Zod funciona

2. {"items": [{"productId": "test", "quantity": 1}]} 
   → 400 Bad Request (Invalid uuid)
   ✅ Validación UUID funciona

3. {"items": [{"partId": "<uuid-real>", "quantity": 5, "unitPrice": 10}]} 
   → 500 Internal Server Error
   ❌ FALLA AQUÍ

4. {"items": [{"productId": "<uuid-real>", "quantity": 5, "unitPrice": 10}]} 
   → 500 Internal Server Error
   ❌ FALLA AQUÍ
```

**Observaciones:**
- ✅ Validación Zod funciona correctamente
- ✅ UUIDs se validan correctamente
- ❌ **Falla después de pasar validación**
- ⚠️ Posibles causas:
  1. Tabla `purchase_requests` o `purchase_request_items` no existe
  2. Columnas esperadas no existen en Supabase
  3. Error de inserción en BD (constraints, etc.)

**Código actual (repository.ts):**
```typescript
async create(input: CreatePurchaseRequestInput, userId: string): Promise<PurchaseRequestRow> {
  // 1. Crear solicitud de compra
  const { data: purchaseRequest, error: prError } = await supabase
    .from('purchase_requests')
    .insert({
      status: 'PENDIENTE',
      total_items: input.items.length,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select('*')
    .single();

  if (prError) throw prError;  // ← FALLA AQUÍ

  // 2. Crear items
  const itemsToInsert = input.items.map((item) => ({
    purchase_request_id: purchaseRequest.id,
    product_id: item.productId ?? null,
    part_id: item.partId ?? null,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from('purchase_request_items').insert(itemsToInsert);

  if (itemsError) throw itemsError;

  return purchaseRequest as PurchaseRequestRow;
}
```

**Impacto en Frontend:**
- Bloqueo TOTAL - No se puede registrar ninguna compra
- Los validadores pasan pero falla la BD

**Acción Requerida:**
1. Verificar tablas en Supabase:
   - `purchase_requests` (debe existir)
   - `purchase_request_items` (debe existir)
2. Verificar columnas:
   - `purchase_requests`: id, status, total_items, notes, created_by, created_at, updated_at
   - `purchase_request_items`: id, purchase_request_id, product_id, part_id, quantity, created_at
3. Agregar error logging detallado
4. Ejecutar migración 0011 en Supabase

---

### ISSUE 3: Rutas Divergentes (Naming Inconsistency)

**Observación del Frontend:**
```
GET /api/v1/purchases       → 404 Not Found
GET /api/v1/purchase_requests → 404 Not Found  
GET /api/v1/purchase-requests → 200 OK ✅
```

**Análisis:**
- ✅ El módulo se llama `purchase-requests` (con guión)
- ❌ Frontend asumió `purchases` (sin guión)
- ⚠️ Inconsistencia en naming (camelCase vs kebab-case)

**Impacto en Frontend:**
- MEDIO - Ya descubrieron la ruta correcta
- Requiere claridad en documentación

**Solución:**
- ✅ Usar `/api/v1/purchase-requests` (ya identificado)
- Documentar claramente en README o API docs

---

## 🔧 PLAN DE CORRECCIÓN

### Prioridad 1 (INMEDIATA - Desbloquea Frontend):

#### 1.1 Corregir POST /purchase-requests (500 error)
- [ ] Verificar tablas `purchase_requests` y `purchase_request_items` en Supabase
- [ ] Ejecutar migración 0011 si no existe
- [ ] Agregar error logging en repository
- [ ] Test con payload válido
- Tiempo: 1-2 horas

#### 1.2 Crear módulo Suppliers
- [ ] Estructura básica: Controller, Service, Repository, Routes
- [ ] CRUD endpoints (GET, POST, PUT, DELETE)
- [ ] Tipos Zod con validaciones
- [ ] Integración en app.ts
- Tiempo: 2-3 horas

### Prioridad 2 (IMPORTANTE):
- [ ] Documentación de endpoints de compras
- [ ] Clarificar naming conventions
- [ ] Tests para purchase-requests

---

## 📊 EVIDENCIA DE PRUEBAS DEL FRONTEND

### Test 1: Listar Compras
```
GET /api/v1/purchase-requests
Headers: Authorization: Bearer <token-admin>
Response 200: {"items": [], "total": 0}
✅ Listado funciona (aunque vacío)
```

### Test 2: Crear Compra (FALLA)
```
POST /api/v1/purchase-requests
Headers: Authorization: Bearer <token-admin>
Body: {"items": [{"productId": "<uuid>", "quantity": 5}]}
Response 500: {"error": {"code": "INTERNAL_ERROR", ...}}
❌ Falla con 500
```

### Test 3: Obtener Proveedores
```
GET /api/v1/suppliers
Headers: Authorization: Bearer <token-admin>
Response 404: {"error": {"code": "NOT_FOUND", ...}}
❌ Endpoint no existe
```

---

## 💡 RECOMENDACIONES

1. **Error Logging Mejorado**
   - Agregar logs detallados en el catch de errores
   - Incluir stack trace en desarrollo
   - Reportar al frontend con más contexto

2. **Validación de Dependencias**
   - Verificar tablas en Supabase antes de crear módulos
   - Ejecutar todas las migraciones
   - Documentar dependencias

3. **Comunicación con Frontend**
   - Proporcionar payload de ejemplo completo
   - Documentar estructura esperada
   - Incluir errores posibles en docs

---

## 📝 PRÓXIMOS PASOS

1. **Ahora:** Corregir POST /purchase-requests
2. **Luego:** Crear módulo suppliers
3. **Finalmente:** Documentar y comunicar al frontend

**Tiempo Total Estimado:** 4-5 horas

---
