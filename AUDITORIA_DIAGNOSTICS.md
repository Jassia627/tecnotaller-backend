# AUDITORÍA - MÓDULO DIAGNOSTICS

**Fecha:** 2026-09-11
**Módulo:** Diagnostics (Diagnósticos)
**Endpoints:** 2
**Status:** Análisis en proceso

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Estado | Detalles |
|--------|--------|----------|
| **Endpoints** | ✅ | 2 rutas (GET, POST) |
| **Types/Validation** | ✅ | Zod schema correcto |
| **Data Mapping** | ✅ | camelCase ↔ snake_case funciona |
| **Auth/Roles** | ✅ | TECNICO y ADMINISTRADOR |
| **Error Handling** | ⚠️ | Revisión requerida |
| **CRUD Operations** | ⚠️ | Falta UPDATE y DELETE |
| **Database Integration** | ✅ | Query correcta |

---

## 🔍 ANÁLISIS DETALLADO

### 1. ENDPOINTS REGISTRADOS

**Rutas actuales:**
```
POST   /api/v1/work-orders/:id/diagnostics     (crear diagnóstico)
GET    /api/v1/work-orders/:id/diagnostics     (listar diagnósticos)
```

**Problemas encontrados:**
- ❌ No hay endpoint GET individual: `GET /api/v1/work-orders/:id/diagnostics/:diagnosticId`
- ❌ No hay endpoint UPDATE: `PUT /api/v1/work-orders/:id/diagnostics/:diagnosticId`
- ❌ No hay endpoint DELETE: `DELETE /api/v1/work-orders/:id/diagnostics/:diagnosticId`

---

### 2. DATA MODEL - diagnostics.types.ts

#### Interfaz DiagnosticRow (Base de Datos):
```typescript
export interface DiagnosticRow {
  id: string;
  work_order_id: string;        // ✅ snake_case correcto
  technician_id: string;        // ✅ snake_case correcto
  observations: string;
  faults: string;
  recommended_actions: string;  // ✅ snake_case correcto
  created_at: string;           // ✅ ISO8601 format
}
```

#### Interfaz Diagnostic (Response):
```typescript
export interface Diagnostic {
  id: string;
  workOrderId: string;           // ✅ camelCase correcto
  technicianId: string;          // ✅ camelCase correcto
  observations: string;
  faults: string;
  recommendedActions: string;    // ✅ camelCase correcto
  createdAt: string;             // ✅ ISO8601 format
}
```

**Análisis:**
- ✅ Mapeo camelCase ↔ snake_case es correcto
- ✅ Tipos están bien definidos
- ⚠️ Falta validación en crear: Campos son `string.min(1)` - bueno

---

### 3. VALIDACIÓN ZOD

```typescript
export const createDiagnosticSchema = z.object({
  observations: z.string().min(1),
  faults: z.string().min(1),
  recommendedActions: z.string().min(1),
});
```

**Análisis:**
- ✅ Campos requeridos (min 1 caractér)
- ✅ Tipos correctos
- ⚠️ Falta schema para UPDATE (si se implementa)
- ⚠️ Sin límite máximo de caracteres (.max())

**Recomendación:**
```typescript
export const createDiagnosticSchema = z.object({
  observations: z.string().min(1).max(1000),
  faults: z.string().min(1).max(1000),
  recommendedActions: z.string().min(1).max(1000),
});

export const updateDiagnosticSchema = createDiagnosticSchema.partial();
```

---

### 4. CONTROLLER - diagnostics.controller.ts

```typescript
async list(req: Request, res: Response): Promise<void> {
  const items = await this.service.listByWorkOrder(req.params.id!);
  res.json({ items });
}

async create(req: Request, res: Response): Promise<void> {
  const input = createDiagnosticSchema.parse(req.body);
  const diagnostic = await this.service.create(req.params.id!, req.user!.id, input);
  res.status(201).json(diagnostic);
}
```

**Análisis:**
- ✅ Validación Zod correcta en create
- ✅ Status 201 en creación
- ✅ Usa req.user!.id para obtener technicianId
- ⚠️ Sin respuesta con estructura {items: [...]} en create (devuelve objeto directo)
- ❌ Falta método findById() en controller
- ❌ Falta método update() en controller
- ❌ Falta método delete() en controller

---

### 5. SERVICE LAYER - diagnostics.service.ts

```typescript
async listByWorkOrder(workOrderId: string): Promise<Diagnostic[]> {
  const order = await this.workOrderRepository.findById(workOrderId);
  if (!order) throw new NotFoundError('Orden de servicio no encontrada');
  const rows = await this.repository.listByWorkOrder(workOrderId);
  return rows.map((r) => this.mapRow(r));
}

async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<Diagnostic> {
  const order = await this.workOrderRepository.findById(workOrderId);
  if (!order) throw new NotFoundError('Orden de servicio no encontrada');
  const row = await this.repository.create(workOrderId, technicianId, input);
  return this.mapRow(row);
}
```

**Análisis:**
- ✅ Verifica que workOrder existe antes de operar
- ✅ Manejo de errores con NotFoundError (404)
- ✅ Mapeo correcto de datos
- ⚠️ Sin verificación de permisos (¿puede cualquier técnico ver diagnósticos de cualquier orden?)
- ❌ Falta método findById()
- ❌ Falta método update()
- ❌ Falta método delete()

**Posible Security Issue:**
```
¿PROBLEMA DE SEGURIDAD?
Un técnico podría hacer GET a diagnósticos de una orden que no es suya.

Debe validar:
- GET /work-orders/:id/diagnostics → Solo técnico asignado + admin
- POST /work-orders/:id/diagnostics → Solo técnico asignado + admin
```

---

### 6. REPOSITORY - diagnostics.repository.ts

```typescript
async listByWorkOrder(workOrderId: string): Promise<DiagnosticRow[]> {
  const { data, error } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as DiagnosticRow[]) ?? [];
}

async create(workOrderId: string, technicianId: string, input: CreateDiagnosticInput): Promise<DiagnosticRow> {
  const { data, error } = await supabase
    .from('diagnostics')
    .insert({
      work_order_id: workOrderId,
      technician_id: technicianId,
      observations: input.observations,
      faults: input.faults,
      recommended_actions: input.recommendedActions,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DiagnosticRow;
}
```

**Análisis:**
- ✅ Queries correctas
- ✅ Error handling
- ✅ Order by created_at DESC (último primero)
- ✅ Insert con select() para retornar datos
- ❌ Falta método findById()
- ❌ Falta método update()
- ❌ Falta método delete()

---

### 7. RUTAS - diagnostics.routes.ts

```typescript
export function createDiagnosticsRouter(): Router {
  const repository = new DiagnosticRepository();
  const workOrderRepository = new WorkOrderRepository();
  const service = new DiagnosticService(repository, workOrderRepository);
  const controller = new DiagnosticController(service);

  const router = Router({ mergeParams: true });

  router.use(authMiddleware);

  router.post('/work-orders/:id/diagnostics', authorizeRoles(ROLES.TECNICO, ROLES.ADMINISTRADOR), asyncHandler(controller.create.bind(controller)));
  router.get('/work-orders/:id/diagnostics', authorizeRoles(ROLES.TECNICO, ROLES.ADMINISTRADOR), asyncHandler(controller.list.bind(controller)));

  return router;
}
```

**Análisis:**
- ✅ Auth middleware en todas las rutas
- ✅ Roles correctos (TECNICO y ADMINISTRADOR)
- ✅ asyncHandler en todas las rutas
- ⚠️ Rutas están registradas con `/work-orders/:id/diagnostics` 
- ❌ Falta ruta GET por ID
- ❌ Falta ruta PUT/PATCH
- ❌ Falta ruta DELETE

**Problema de Estructura:**
Las rutas están usando `/work-orders/:id/diagnostics` pero deberían ser:
```
GET    /work-orders/:id/diagnostics              (lista todos)
POST   /work-orders/:id/diagnostics              (crear)
GET    /work-orders/:id/diagnostics/:diagnosticId (obtener uno)
PUT    /work-orders/:id/diagnostics/:diagnosticId (actualizar)
DELETE /work-orders/:id/diagnostics/:diagnosticId (eliminar)
```

---

### 8. INTEGRACIÓN EN app.ts

```typescript
app.use('/api/v1', createDiagnosticsRouter());
```

**Problema:**
⚠️ Las rutas están duplicadas/registradas 3 veces en app.ts:
```
import { createDiagnosticsRouter } from './modules/diagnostics/diagnostics.routes';
import { createDiagnosticsRouter } from './modules/diagnostics/diagnostics.routes';
import { createDiagnosticsRouter } from './modules/diagnostics/diagnostics.routes';
```

Debe ser solo 1 import y 1 registro.

---

## 🚨 ISSUES ENCONTRADOS

### 🔴 CRÍTICO

1. **Seguridad - Control de Acceso**
   - No verifica si el técnico está asignado a la orden de trabajo
   - Un técnico podría ver/crear diagnósticos en órdenes ajenas
   - **Necesita:** Validación de ownership en service/controller

2. **Importaciones Duplicadas en app.ts**
   - createDiagnosticsRouter importada 3 veces
   - Podría causar problemas de registro de rutas

### 🟡 MEDIA

3. **CRUD Incompleto**
   - Falta endpoint GET por ID
   - Falta endpoint UPDATE/PATCH
   - Falta endpoint DELETE
   - Solo tiene 2 de 5 operaciones esperadas

4. **Límite de Caracteres**
   - createDiagnosticSchema sin .max() en strings
   - Podría permitir strings muy largos

### 🟢 BAJA

5. **Inconsistencia en Response**
   - GET devuelve: `{ items: [...] }`
   - POST devuelve: `{ diagnostic }`
   - Debería ser consistente

---

## ✅ LO QUE FUNCIONA BIEN

- ✅ Validación Zod correcta
- ✅ Mapeo camelCase ↔ snake_case correcto
- ✅ Manejo de NotFoundError
- ✅ Query de base de datos correcta
- ✅ Auth middleware y roles
- ✅ asyncHandler en rutas

---

## 📋 RECOMENDACIONES

### Prioridad 1 (CRÍTICO):
1. **Validar ownership** - Verificar que técnico esté asignado a la orden
2. **Eliminar imports duplicados** en app.ts

### Prioridad 2 (IMPORTANTE):
3. Implementar GET por ID: `GET /work-orders/:id/diagnostics/:diagnosticId`
4. Implementar UPDATE: `PUT /work-orders/:id/diagnostics/:diagnosticId`
5. Implementar DELETE (soft-delete): `DELETE /work-orders/:id/diagnostics/:diagnosticId`
6. Agregar `.max(1000)` en Zod schemas

### Prioridad 3 (MEJORA):
7. Consistencia en respuestas (usar `{ items: [...] }` en POST también)
8. Tests unitarios para validar ownership

---

## 📊 TABLA COMPARATIVA

| Característica | Status | Notas |
|---|---|---|
| GET Lista | ✅ | Funciona pero sin validación de ownership |
| GET Individual | ❌ | Falta implementar |
| POST Crear | ✅ | Funciona pero sin validación de ownership |
| PUT Actualizar | ❌ | Falta implementar |
| DELETE Borrar | ❌ | Falta implementar (soft-delete) |
| Validación Zod | ⚠️ | Falta .max() en strings |
| Auth/Roles | ✅ | Correcto |
| Error Handling | ✅ | Correcto |
| Data Mapping | ✅ | Correcto |

---

## 🎯 VEREDICTO

**Estado: ⚠️ APROBADO CON OBSERVACIONES**

El módulo funciona pero tiene:
- ❌ 1 Issue de SEGURIDAD (validación de ownership)
- ❌ 3 Endpoints faltantes (GET/:id, PUT, DELETE)
- ⚠️ Importaciones duplicadas
- ⚠️ Validación incompleta

**Recomendación:** Proceder con cautela. Implementar fixes críticos antes de producción.

**Tiempo estimado de fixes:** 2-3 horas

---
