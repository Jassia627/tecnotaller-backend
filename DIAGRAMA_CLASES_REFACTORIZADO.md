# Diagrama de Clases Refactorizado - TecnoTaller Backend

## Resumen Ejecutivo

Este documento presenta la **versión refactorizada** del diagrama de clases de TecnoTaller Backend, que incorpora principios SOLID identificados en la actividad de auditoría y control de cambios.

### Principios SOLID Aplicados

| Principio | Violación Identificada | Solución Implementada | Archivo |
|-----------|------------------------|----------------------|---------|
| **OCP** | WorkOrderService verifica rol con if-else hardcodeado | Strategy Pattern + Factory Pattern | `CONTROL_DE_CAMBIOS_SOLID.md` (CC-01) |
| **SRP** | AuthController valida datos + orquesta HTTP | Middleware de Validación | `CONTROL_DE_CAMBIOS_SRP.md` (CC-02) |
| **DIP** | Dependencias concretas sin interfaces | Inyección de Interfaces: `IWorkOrderRepository`, `IAuthRepository` | Código implementado |

---

## Cambios Principales en Arquitectura

### 1. PATRÓN OCP - Strategy Pattern para Autorización

#### Antes (Violación):
```typescript
async list(options: {
  userRole?: string;
  userTechnicianId?: string;
}): Promise<...> {
  if (options.userRole === 'tecnico' && !options.technicianId) {
    options.technicianId = options.userTechnicianId;
  }
  // Si hay un nuevo rol, hay que modificar aquí ❌
}
```

#### Después (OCP Compliant):
```typescript
async list(options: {...}): Promise<...> {
  const authFilter = AuthorizationFilterFactory.createFilter(options.userRole);
  authFilter.applyFilter(options);
  // Nuevos roles se agregan SIN modificar este código ✅
}
```

#### Clases Agregadas al Diagrama:

```
IAuthorizationFilter <<interface>>
  + applyFilter(options: Record): void

TechnicianAuthorizationFilter <<implements>>
  + applyFilter(options): void [auto-asigna technicianId]

AdminAuthorizationFilter <<implements>>
  + applyFilter(options): void [sin restricciones]

ClientAuthorizationFilter <<implements>>
  + applyFilter(options): void [filtra por customerId]

AuthorizationFilterFactory
  + {static} createFilter(role: string): IAuthorizationFilter
```

**Beneficio**: Nuevos roles (supervisor, auditor) se agregan SIN modificar `WorkOrderService`.

---

### 2. PATRÓN SRP - Middleware de Validación

#### Antes (Violación):
```typescript
async register(req: Request, res: Response): void {
  const input = registerSchema.parse(req.body);  // ❌ Validación
  const user = await this.service.register(input);  // ✅ Orquestación
  res.status(201).json({ user });
}
```

**Problema**: El controlador tiene DOS responsabilidades.

#### Después (SRP Compliant):
```typescript
// Middleware (SRP: SOLO validación)
export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const validated = schema.parse(req.body);
    req.validatedData = validated;
    next();
  };
}

// Controlador (SRP: SOLO orquestación)
async register(req: Request, res: Response): void {
  const input = req.validatedData as RegisterInput;
  const user = await this.service.register(input);
  res.status(201).json({ user });
}

// Ruta (composición)
router.post(
  '/register',
  validateRequest(registerSchema),  // Middleware
  asyncHandler(controller.register.bind(controller))  // Controlador
);
```

#### Clase Agregada al Diagrama:

```
ValidateRequestMiddleware
  - schema: ZodSchema
  + handle(req, res, next): Promise<void>
```

**Beneficio**: Controladores solo orquestan HTTP. Validación reutilizable en todos los módulos.

---

### 3. PATRÓN DIP - Inyección de Dependencias

#### Interfaces Agregadas:

```typescript
interface IWorkOrderRepository {
  + findById(id: string): Promise<WorkOrderRow | null>
  + list(options): Promise<{rows, total}>
  + create(input, guideNumber, status): Promise<WorkOrderRow>
  + transitionStatus(id, from, to, userId): Promise<WorkOrderRow>
}

interface IAuthRepository {
  + register(input): Promise<AuthUser>
  + login(input): Promise<AuthSession>
  + logout(accessToken): Promise<void>
  + getUserById(id): Promise<AuthUser | null>
}
```

#### Relación en Servicios:

```typescript
// DIP: Servicio depende de interfaz, no de implementación
class WorkOrderService {
  constructor(private readonly repository: IWorkOrderRepository) {}
  // Repository puede ser mock, real, etc.
}
```

**Beneficio**: Fácil testing con mocks. Desacoplamiento de infraestructura.

---

## Nuevas Entidades de Dominio

### 1. PurchaseRequest (Compras)

Agregada para soportar la **Fase 25** del frontend.

```typescript
class PurchaseRequest {
  - id: string
  - supplierId: string
  - productId: string | null
  - partId: string | null
  - quantity: number
  - unitPrice: number
  - subtotal: number
  - total: number
  - _status: PurchaseStatus
  --
  + markAsReceived(): Promise<void>
  + canReceive(): boolean
  + get status(): PurchaseStatus
}
```

**Características**:
- Validación XOR: productId XOR partId (no ambos, no ninguno)
- Transaccional: actualiza stock de manera atómica
- Idempotente: rechaza si ya está RECIBIDO

### 2. Supplier (Proveedor)

Agregada para soportar compras.

```typescript
class Supplier {
  - id: string
  - name: string
  - contactEmail: string | null
  - phone: string | null
  - active: boolean
  - createdAt: string
}
```

### 3. Estados Adicionales en WorkOrder

```typescript
enum OrderStatus {
  INGRESADO           // Original
  PENDIENTE           // Nuevo: cliente propone
  ACEPTADA            // Nuevo: admin/tech acepta
  EN_REVISION         // Original
  ESPERANDO_REPUESTO  // Original
  EN_REPARACION       // Original
  REPARADO            // Original
  LISTO_PARA_ENTREGA  // Original
  ENTREGADO           // Original
}
```

### 4. Campos Adicionales en WorkOrder

```typescript
class WorkOrder {
  + scheduledTime: string | null     // Propuesto por cliente
  + assignedTime: string | null      // Asignado por admin/tech
}
```

**Lógica**: Si cliente crea orden → PENDIENTE + scheduledTime. Si admin crea → ACEPTADA + assignedTime.

---

## Relaciones Arquitectónicas

### Dependencias Explícitas (DIP)

```
WorkOrderService ──depends on──> IWorkOrderRepository
AuthService ──depends on──> IAuthRepository
PurchaseRequestService ──depends on──> IPurchaseRequestRepository
```

### Factory Pattern (OCP)

```
AuthorizationFilterFactory ──creates──> IAuthorizationFilter
  ├─> TechnicianAuthorizationFilter
  ├─> AdminAuthorizationFilter
  └─> ClientAuthorizationFilter
```

### Middleware Chain (SRP)

```
ValidateRequestMiddleware ──→ AuthController
  (valida)                  (orquesta)
```

---

## Tabla Comparativa: Antes vs. Después

| Aspecto | Antes | Después |
|--------|-------|---------|
| **OCP en Autorización** | ❌ if-else en servicio | ✅ Strategy Pattern + Factory |
| **SRP en Validación** | ❌ Validación en controlador | ✅ Middleware separado |
| **DIP en Repositorios** | ❌ Dependencias concretas | ✅ Inyección de interfaces |
| **Nuevas Entidades** | ❌ Sin PurchaseRequest, Supplier | ✅ Completo para Fase 25 |
| **Estados WorkOrder** | ❌ 7 estados (INGRESADO...) | ✅ 9 estados (+ PENDIENTE, ACEPTADA) |
| **Campos WorkOrder** | ❌ Sin horarios | ✅ scheduledTime, assignedTime |
| **Testabilidad** | ❌ Difícil aislar lógica | ✅ Fácil inyectar mocks |
| **Extensibilidad** | ❌ Modificar código existente | ✅ Crear nuevas estrategias/middlewares |

---

## Impacto en la Arquitectura General

### Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│  Router / Rutas                         │  ← Inyecta middlewares
├─────────────────────────────────────────┤
│  ValidateRequestMiddleware              │  ← SRP: Solo validación
├─────────────────────────────────────────┤
│  AuthMiddleware (auth)                  │  ← Autentica usuario
├─────────────────────────────────────────┤
│  Controller                             │  ← SRP: Solo orquestación
│  (recibe datos en req.validatedData)    │
├─────────────────────────────────────────┤
│  Service                                │  ← Lógica de negocio
│  (usa AuthorizationFilterFactory)       │  ← OCP: Delega autorización
├─────────────────────────────────────────┤
│  Repository (inyectado)                 │  ← DIP: Dependencia de interfaz
├─────────────────────────────────────────┤
│  Database / Supabase                    │
└─────────────────────────────────────────┘
```

### Beneficios por Principio SOLID

| Principio | Beneficio | Evidencia |
|-----------|-----------|-----------|
| **OCP** | Escalar roles sin modificar WorkOrderService | `AuthorizationFilterFactory.createFilter()` |
| **SRP** | Cambiar validación sin afectar controladores | `validateRequest()` reutilizable |
| **DIP** | Testear servicios con mocks | `IWorkOrderRepository` inyectada |
| **LSP** | (Futuro) Todas las estrategias cumplen contrato | `IAuthorizationFilter` |
| **ISP** | (Futuro) Interfaces pequeñas y cohesivas | Interfaces separadas por dominio |

---

## Próximas Iteraciones Recomendadas

### Corto Plazo (Sprint Actual)

- ✅ **CC-01**: Implementar OCP en work-orders (COMPLETADO)
- ✅ **CC-02**: Implementar SRP en auth (COMPLETADO)
- ⏳ Extender SRP a otros módulos (customers, technicians, suppliers, etc.)

### Mediano Plazo

- Implementar LSP: Revisar jerarquías de herencia
- Implementar ISP: Dividir interfaces grandes en pequeñas
- Cobertura de tests en clases strategy y middleware

### Largo Plazo

- Event Sourcing para auditabilidad
- CQRS para optimizar queries
- Event-driven architecture para notificaciones

---

## Referencias

- **Commit CC-01**: `feat: implementar Strategy Pattern en work-orders para cumplir OCP`
- **Commit CC-02**: `refactor: implementar SRP en auth con Middleware de Validación`
- **Archivos de Control de Cambios**: 
  - `CONTROL_DE_CAMBIOS_SOLID.md`
  - `CONTROL_DE_CAMBIOS_SRP.md`

---

**Versión del Diagrama**: 2.0  
**Fecha de Actualización**: Septiembre 2026  
**Estado**: ✅ Refactorizado con SOLID  
**Build Status**: ✅ TypeScript + npm run build → SUCCESS
