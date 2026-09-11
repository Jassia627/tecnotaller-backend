# AUDITORÍA - MÓDULO WORK-ORDERS

**Fecha:** 2026-09-11
**Módulo:** Work-Orders (Órdenes de Servicio)
**Endpoints:** 8 (públicos + autenticados)
**Status:** Análisis detallado

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Estado | Detalles |
|--------|--------|----------|
| **Endpoints** | ✅ | 8 rutas bien estructuradas |
| **Types/Validation** | ✅ | Zod schemas correctos |
| **Data Mapping** | ✅ | camelCase ↔ snake_case correcto |
| **Auth/Roles** | ⚠️ | Revisión de permisos requerida |
| **State Machine** | ✅ | Máquina de estados implementada |
| **CRUD Operations** | ⚠️ | Falta UPDATE/PATCH (solo transición) |
| **Database Integration** | ⚠️ | Usa RPC + Supabase funciones |
| **Security** | ⚠️ | Varios problemas identificados |

---

## 🔍 ANÁLISIS DETALLADO

### 1. ENDPOINTS REGISTRADOS

```
GET    /api/v1/work-orders/track/:guideNumber       (público, sin auth)
POST   /api/v1/work-orders                          (admin + técnico)
GET    /api/v1/work-orders                          (admin + técnico)
GET    /api/v1/work-orders/:id                      (admin + técnico)
PATCH  /api/v1/work-orders/:id/status               (admin + técnico)
GET    /api/v1/work-orders/:id/history              (admin + técnico + cliente)
POST   /api/v1/work-orders/:id/exit-register        (admin + técnico)
POST   /api/v1/work-orders/:id/activities           (admin + técnico)
GET    /api/v1/work-orders/:id/activities           (admin + técnico)
```

**Total: 9 endpoints (8 en rutas + 1 submount fotos)**

---

### 2. DATA MODEL - work-orders.types.ts

#### Interfaz WorkOrderRow (Base de Datos):
```typescript
export interface WorkOrderRow {
  id: string;
  guide_number: string;
  customer_id: string | null;
  technician_id: string | null;
  device_brand: string;
  device_model: string;
  device_serial: string;
  problem_description: string;
  device_password_encrypted: string | null;  // ⚠️ Campo no se devuelve
  accessories: string | null;
  current_status: OrderStatus;
  created_at: string;
}
```

**Problemas:**
- ⚠️ Falta `total_cost` (debería estar aquí)
- ⚠️ Falta campos de exit_register: `exit_final_state`, `exit_repairs_performed`, `exit_parts_used`, `exit_observations`
- ⚠️ `device_password_encrypted` no se mapea a la response

#### Interfaz WorkOrder (Response):
```typescript
export class WorkOrder {
  readonly id: string;
  readonly guideNumber: string;
  readonly customerId: string | null;
  readonly technicianId: string | null;
  readonly deviceBrand: string;
  readonly deviceModel: string;
  readonly deviceSerial: string;
  readonly problemDescription: string;
  readonly accessories: string | null;
  readonly currentStatus: OrderStatus;
  readonly createdAt: string;
}
```

**Problemas:**
- ❌ Falta `totalCost` en la response
- ❌ Falta información de exit-register
- ⚠️ Sin `toJSON()` para serialización explícita

---

### 3. MÁQUINA DE ESTADOS

```typescript
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  INGRESADO: ['EN_REVISION'],
  EN_REVISION: ['ESPERANDO_REPUESTO', 'EN_REPARACION'],
  ESPERANDO_REPUESTO: ['EN_REPARACION'],
  EN_REPARACION: ['REPARADO'],
  REPARADO: ['LISTO_PARA_ENTREGA'],
  LISTO_PARA_ENTREGA: ['ENTREGADO'],
  ENTREGADO: [],
};
```

**Análisis:**
- ✅ Estados bien definidos
- ✅ Transiciones válidas implementadas
- ✅ Método `canTransitionTo()` valida antes de transicionar
- ✅ Excelente implementación de patrón State Machine

---

### 4. VALIDACIÓN ZOD

```typescript
export const createWorkOrderSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  technicianId: z.string().uuid().nullable().optional(),
  deviceBrand: z.string().min(1),
  deviceModel: z.string().min(1),
  deviceSerial: z.string().min(1),
  problemDescription: z.string().min(1),
  devicePassword: z.string().optional(),
  accessories: z.string().optional(),
});

export const transitionStatusSchema = z.object({
  toStatus: z.enum(ORDER_STATUSES),
});

export const exitRegisterSchema = z.object({
  finalState: z.string().min(1),
  repairsPerformed: z.string().min(1),
  partsUsed: z.string().optional(),
  observations: z.string().optional(),
});
```

**Análisis:**
- ✅ UUIDs validados correctamente
- ✅ Campos requeridos tienen min(1)
- ⚠️ Sin límite `.max()` en strings
- ⚠️ `toStatus` debe ser camelCase (es `toStatus` pero debería reflejar mejor)

---

### 5. CONTROLLER - work-orders.controller.ts

```typescript
async create(req: Request, res: Response): Promise<void> {
  const input = createWorkOrderSchema.parse(req.body);
  const order = await this.service.create(input);
  res.status(201).json(order);  // ⚠️ Debería ser {order: ...}
}

async list(req: Request, res: Response): Promise<void> {
  const { status, technicianId, fromDate, toDate, searchText } = req.query;
  const result = await this.service.list(...);
  res.json(result);  // ✅ Correcto: {items: [...], total: N}
}

async transitionStatus(req: Request, res: Response): Promise<void> {
  const { toStatus } = transitionStatusSchema.parse(req.body);
  const order = await this.service.transitionStatus(...);
  res.json(order);  // ⚠️ Debería ser {order: ...}
}

async registerExit(req: Request, res: Response): Promise<void> {
  const input = exitRegisterSchema.parse(req.body);
  const order = await this.service.registerExit(...);
  res.json(order);  // ⚠️ Debería ser {order: ...}
}

async addPhoto(req: Request, res: Response): Promise<void> {
  // ...
  res.status(201).json({ ok: true });  // ✅ Bueno para operación simple
}

async createActivity(req: Request, res: Response): Promise<void> {
  // ...
  res.status(201).json(activity);  // ⚠️ Debería ser {activity: ...}
}

async listActivities(req: Request, res: Response): Promise<void> {
  // ...
  res.json({ items: activities });  // ✅ Correcto
}
```

**Problemas encontrados:**
- ⚠️ Inconsistencia en respuestas:
  - Algunos retornan objeto directo: `res.json(order)`
  - Otros retornan con wrapper: `res.json({ items: [...] })`
  - Debe ser consistente

---

### 6. SERVICE LAYER - work-orders.service.ts

```typescript
async list(options: {
  status?: OrderStatus;
  technicianId?: string;
  fromDate?: string;
  toDate?: string;
  searchText?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: WorkOrder[]; total: number }> {
  // ✅ Paginación correcta
  // ✅ Filtros múltiples
  // ⚠️ Sin validación de ownership (técnico ve todas sus órdenes + admin)
}

async transitionStatus(id: string, to: OrderStatus, userId: string): Promise<WorkOrder> {
  const order = await this.getById(id);
  if (!order.canTransitionTo(to)) {
    throw new ForbiddenError(`Transición inválida: ${order.currentStatus} -> ${to}`);
  }
  // ✅ Valida transición con máquina de estados
  // ⚠️ Sin verificación de quién PUEDE transicionar (¿solo técnico asignado?)
}

async trackByGuide(guideNumber: string): Promise<{ 
  order: WorkOrder; 
  history: StatusHistoryEntry[] 
}> {
  // ✅ Público (sin auth)
  // ⚠️ Expone información de órdenes a cualquiera
}

async registerExit(id: string, input: ExitRegisterInput): Promise<WorkOrder> {
  // ✅ Actualiza campos de exit
  // ⚠️ Sin validación de estado (¿debe estar en LISTO_PARA_ENTREGA?)
}
```

**Problemas:**
- ⚠️ Sin validación de ownership - técnico ve órdenes no asignadas
- ⚠️ `transitionStatus` no valida permiso de quién realiza cambio
- ⚠️ `trackByGuide` público expone información
- ⚠️ Sin validación de estado para `registerExit`

---

### 7. REPOSITORY - work-orders.repository.ts

```typescript
async list(options: {...}): Promise<{ rows: WorkOrderRow[]; total: number }> {
  // ✅ Filtros por status, technicianId, fecha, búsqueda
  // ✅ Paginación correcta
  // ✅ ILIKE search en múltiples campos
  // ✅ Order by created_at DESC
}

async create(input: CreateWorkOrderInput, guideNumber: string): Promise<WorkOrderRow> {
  // ✅ Insert datos básicos
  // ✅ Encripta password si se proporciona
  // ✅ Crea entrada inicial en order_status_history
  // ⚠️ No calcula total_cost
}

async transitionStatus(id: string, from: OrderStatus, to: OrderStatus, userId: string): Promise<WorkOrderRow> {
  // ✅ Usa RPC function (transition_order_status)
  // ⚠️ Dependencia en función Supabase (cambios requieren SQL)
}

async registerExit(...): Promise<WorkOrderRow> {
  // ✅ Actualiza campos de exit_*
  // ⚠️ Sin validación de estado previo
}

async addPhoto(workOrderId: string, storagePath: string, kind: 'inicial' | 'final'): Promise<void> {
  // ✅ Inserta en order_photos
  // ⚠️ Sin validación de workOrderId existente
}

private async encryptAndStorePassword(...): Promise<void> {
  // ✅ Usa RPC (encrypt_order_password)
  // ✅ Password nunca almacenado en texto plano
}
```

**Análisis:**
- ✅ Queries bien estructuradas
- ✅ Error handling correcto
- ⚠️ Dependencia en RPC functions (lock-in con Supabase)
- ⚠️ Sin validación de integridad en algunos métodos

---

### 8. RUTAS - work-orders.routes.ts

```typescript
// Público (sin auth)
router.get('/track/:guideNumber', ...)

// Autenticado
router.use(authMiddleware);

// Todos requieren (admin + tecnico)
router.post('/', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO), ...)
router.get('/', ...)
router.get('/:id', ...)
router.patch('/:id/status', ...)
router.post('/:id/exit-register', ...)
router.post('/:id/activities', ...)
router.get('/:id/activities', ...)

// GET history permite cliente también
router.get('/:id/history', authorizeRoles(ROLES.ADMINISTRADOR, ROLES.TECNICO, ROLES.CLIENTE), ...)

// Submount
router.use('/:id/photos', createPhotosRouter())
```

**Análisis:**
- ✅ Auth middleware correctamente aplicado
- ✅ Roles especificados
- ⚠️ Sin validación de ownership en rutas (depende de service)
- ⚠️ `GET /track` público expone toda la información

---

## 🚨 ISSUES ENCONTRADOS

### 🔴 CRÍTICO

1. **Validación de Ownership Faltante**
   - Técnico puede ver todas las órdenes, no solo las asignadas
   - `GET /work-orders` → Sin filtro automático por técnico asignado
   - **Impacto:** Técnico accede a datos de órdenes ajenas

2. **Endpoint Track Público Expone Información**
   - `GET /work-orders/track/:guideNumber` devuelve detalles completos
   - Cualquiera puede rastrear cualquier orden sin autenticación
   - **Impacto:** Fuga de información de privacidad del cliente

3. **Validación Incompleta en registerExit**
   - No verifica estado actual (¿debe estar en LISTO_PARA_ENTREGA?)
   - No valida que technicianId sea correctamente asignado
   - **Impacto:** Datos inconsistentes en BD

### 🟡 MEDIA

4. **Inconsistencia en Respuestas**
   - POST /create retorna objeto directo
   - POST /activities retorna objeto directo
   - GET /list retorna {items: [...], total}
   - **Debería ser consistente**: `{order: ...}` o `{items: [...]}`

5. **Sin Límite de Caracteres en Zod**
   - Strings sin `.max()` en createWorkOrderSchema
   - Podría permitir strings muy largos

6. **Falta campo `totalCost` en WorkOrder**
   - Según auditoría anterior, debe retornarse total_cost
   - No está en WorkOrderRow ni WorkOrder

7. **Sin Validación de Integridad**
   - `addPhoto` no verifica que workOrderId exista
   - `registerExit` no valida estado previo

### 🟢 BAJA

8. **Dependencia en RPC Functions**
   - `transitionStatus` usa RPC (transition_order_status)
   - `encryptAndStorePassword` usa RPC (encrypt_order_password)
   - Lock-in con Supabase (cambios en lógica requieren SQL)

9. **Campos Exit-Register Faltantes en WorkOrderRow**
   - `exit_final_state`, `exit_repairs_performed`, `exit_parts_used`, `exit_observations`
   - No se retornan en las responses

---

## ✅ LO QUE FUNCIONA BIEN

- ✅ Máquina de estados bien implementada
- ✅ Validación Zod en crear y transiciones
- ✅ Paginación correcta
- ✅ Búsqueda ILIKE funciona
- ✅ Filtros por fecha, status, técnico
- ✅ Password encriptado en BD
- ✅ State transitions validadas
- ✅ Error handling correcto
- ✅ Auth middleware aplicado
- ✅ Roles configurados

---

## 📋 RECOMENDACIONES

### Prioridad 1 (CRÍTICO):
1. **Validar ownership** - Técnico solo ver sus órdenes
2. **Restringir GET /track** - Requerir autenticación o cliente verificable
3. **Validar estado en registerExit** - Solo si está LISTO_PARA_ENTREGA

### Prioridad 2 (IMPORTANTE):
4. Agregar `.max()` en Zod schemas
5. Incluir `totalCost` en WorkOrder
6. Agregar campos de exit-register a WorkOrderRow
7. Consistencia en respuestas de API
8. Validar integridad en addPhoto

### Prioridad 3 (MEJORA):
9. Documentar RPC functions
10. Tests unitarios para máquina de estados

---

## 📊 TABLA COMPARATIVA

| Característica | Status | Notas |
|---|---|---|
| Crear Orden | ✅ | Funciona pero falta totalCost |
| Listar Órdenes | ⚠️ | Sin filtro automático por técnico |
| Obtener Orden | ✅ | Funciona |
| Transición Estado | ✅ | Máquina de estados valida |
| Historial | ✅ | Funciona |
| Rastreo Público | ❌ | Expone información |
| Exit Register | ⚠️ | Sin validación de estado |
| Fotos | ✅ | Funciona pero sin validación |
| Actividades | ✅ | Submount correcto |
| Auth/Roles | ⚠️ | Sin validación de ownership |
| Data Mapping | ✅ | camelCase ↔ snake_case correcto |

---

## 🎯 VEREDICTO

**Estado: ⚠️ APROBADO CON OBSERVACIONES CRÍTICAS**

El módulo funciona pero tiene:
- ❌ 3 Issues de SEGURIDAD (ownership, track público, exit validation)
- ⚠️ 5 Issues de DATOS (campos faltantes, inconsistencia)
- ⚠️ 1 Issue de ARQUITECTURA (dependencia RPC)

**Recomendación:** Proceder con cautela. Implementar fixes críticos ANTES de producción.

**Tiempo estimado de fixes:** 4-6 horas

**Criticidad:** ALTA - Problemas de seguridad y datos

---

## 📝 NOTAS TÉCNICAS

### RPC Functions Utilizadas:
1. `transition_order_status` - Transiciona estado + registra en historial
2. `encrypt_order_password` - Encripta password de dispositivo

**Acción:** Documentar estas funciones en BD para futuras modificaciones

### Campos Esperados en BD (según exitRegisterSchema):
- `exit_final_state`
- `exit_repairs_performed`
- `exit_parts_used`
- `exit_observations`

**Acción:** Confirmar que existen en tabla `work_orders`

### Campos Faltantes en WorkOrder Response:
- `totalCost` - Usado en reportes y cálculos
- `exitFinalState`, `exitRepairsPerformed`, `exitPartsUsed`, `exitObservations`

**Acción:** Incluir en próxima migración o actualización

---
