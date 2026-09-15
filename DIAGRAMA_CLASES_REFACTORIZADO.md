# Diagrama de Clases Refactorizado - TecnoTaller Backend

## Resumen Ejecutivo

Este documento presenta la **versión refactorizada** del diagrama de clases de TecnoTaller Backend, que incorpora principios SOLID identificados en la actividad de auditoría y control de cambios.

### Principios SOLID Aplicados

| Principio | Violación Identificada | Solución Implementada | Archivo |
|-----------|------------------------|----------------------|---------|
| **OCP** | WorkOrderService verifica rol con if-else hardcodeado | Strategy Pattern + Factory Pattern | `CONTROL_DE_CAMBIOS_SOLID.md` (CC-05) |
| **SRP** | AuthController valida datos + orquesta HTTP | Middleware de Validación | `CONTROL_DE_CAMBIOS_SRP.md` (CC-06) |
| **DIP** | Dependencias concretas sin interfaces | Inyección de Interfaces: `IWorkOrderRepository`, `IAuthRepository` | Código implementado |

---

## 1. PATRÓN OCP - Strategy Pattern para Autorización (CC-05)

### Antes (Violación):
```typescript
async list(options: {
  status?: OrderStatus;
  userRole?: string;
  userTechnicianId?: string;
}): Promise<...> {
  // Regla de negocio y roles quemados dentro del servicio
  if (options.userRole === 'tecnico' && !options.technicianId) {
    options.technicianId = options.userTechnicianId;  // ❌ Hardcodeado
  }
  // Si mañana hay "supervisor", "auditor", etc., hay que modificar aquí
  
  const { rows, total } = await this.repository.list(options);
  return { items: rows.map(WorkOrder.fromRow), total };
}
```

**Problema:**
- El código está **abierto a modificación** (requiere editar el método `list()`)
- Cada nuevo rol requiere agregar un `if` más
- Violación de OCP: "Software entities should be open for extension, closed for modification"

---

### Después (OCP Compliant):

#### 1. Interfaz Strategy para Autorización:

```typescript
// src/shared/authorization/filters/authorization-filter.interface.ts
export interface IAuthorizationFilter {
  applyFilter(options: ListOptions): void;
}
```

#### 2. Estrategia para cada rol:

```typescript
// src/shared/authorization/filters/technician-authorization-filter.ts
export class TechnicianAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: ListOptions): void {
    if (!options.technicianId && options.userTechnicianId) {
      options.technicianId = options.userTechnicianId;
    }
  }
}

// src/shared/authorization/filters/admin-authorization-filter.ts
export class AdminAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: ListOptions): void {
    // Admin ve todas las órdenes, no aplica filtro
  }
}

// src/shared/authorization/filters/client-authorization-filter.ts
export class ClientAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: ListOptions): void {
    // Clientes solo ven sus propias órdenes
    if (!options.customerId && options.userCustomerId) {
      options.customerId = options.userCustomerId;
    }
  }
}
```

#### 3. Factory para crear estrategias:

```typescript
// src/shared/authorization/filters/authorization-filter-factory.ts
export class AuthorizationFilterFactory {
  static createFilter(role: string): IAuthorizationFilter {
    const filters: Record<string, IAuthorizationFilter> = {
      'tecnico': new TechnicianAuthorizationFilter(),
      'administrador': new AdminAuthorizationFilter(),
      'cliente': new ClientAuthorizationFilter(),
      // Fácil de extender: agregar 'supervisor', 'auditor', etc.
    };
    
    return filters[role] || new ClientAuthorizationFilter(); // Default
  }
}
```

#### 4. Servicio refactorizado (OCP compliant):

```typescript
// src/modules/work-orders/work-orders.service.ts
async list(options: {
  status?: OrderStatus;
  userRole?: string;
  userTechnicianId?: string;
}): Promise<{ items: WorkOrder[]; total: number }> {
  // Obtener estrategia según el rol (sin conocer detalles)
  const filter = AuthorizationFilterFactory.createFilter(options.userRole || 'cliente');
  
  // Aplicar filtro sin saber qué rol es
  filter.applyFilter(options);
  
  // Resto del código igual
  const { rows, total } = await this.repository.list(options);
  return { items: rows.map(WorkOrder.fromRow), total };
}
```

---

### Beneficios de la Mejora:

| Aspecto | Antes | Después |
|--------|-------|---------|
| **Escalabilidad** | ❌ Modificar servicio | ✅ Crear nueva estrategia |
| **OCP** | ❌ Abierto a modificación | ✅ Cerrado a modificación |
| **Testabilidad** | ❌ Difícil mockear roles | ✅ Fácil inyectar estrategia |
| **Responsabilidad** | ❌ Servicio + autorización | ✅ Servicio solo lógica negocio |
| **Mantenibilidad** | ❌ Cambios en core | ✅ Cambios en interfaces |

### Patrón Aplicado:

- **Strategy Pattern**: Cada rol es una estrategia intercambiable
- **Factory Pattern**: Creación centralizada de estrategias
- **Dependency Inversion**: El servicio depende de la interfaz, no de implementaciones concretas

### Cómo Agregar un Nuevo Rol (sin modificar el servicio):

```typescript
// 1. Crear nueva estrategia
export class SupervisorAuthorizationFilter implements IAuthorizationFilter {
  applyFilter(options: ListOptions): void {
    // Lógica específica de supervisor
  }
}

// 2. Registrar en factory (única línea)
filters['supervisor'] = new SupervisorAuthorizationFilter();

// 3. ¡Listo! El servicio NO se modifica
```

✅ **Código cerrado a modificación, abierto a extensión**

---

## 2. PATRÓN SRP - Middleware de Validación (CC-06)

### Antes (Violación SRP):

```typescript
// ❌ Controlador hace DOS cosas: orquestar HTTP + validar datos
export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    // Responsabilidad 1: Validación (debería estar en middleware)
    const input = registerSchema.parse(req.body);
    
    // Responsabilidad 2: Orquestación HTTP
    const user = await this.service.register(input);
    res.status(201).json({ user });
  }

  async login(req: Request, res: Response): Promise<void> {
    // Responsabilidad 1: Validación (debería estar en middleware)
    const input = loginSchema.parse(req.body);
    
    // Responsabilidad 2: Orquestación HTTP
    const session = await this.service.login(input);
    res.json(session);
  }
}
```

**Problema:**
- El código está **abierto a modificación** (requiere editar el método `list()`)
- Si cambia `registerSchema`, hay que modificar el controlador
- Si cambia el formato de error de validación, hay que modificar el controlador
- Violación de SRP: "Una clase debe tener una única razón para cambiar"

---

### Después (SRP Compliant):

#### 1. Middleware Genérico de Validación:

```typescript
// src/shared/middleware/validate-request.middleware.ts
export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validación ocurre aquí, no en el controlador
      const validated = schema.parse(req.body);
      
      // Adjuntar datos validados al request
      req.validatedData = validated;
      
      next();
    } catch (error: any) {
      // Manejo de errores de validación centralizado
      if (error.errors && Array.isArray(error.errors)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e: any) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      
      res.status(400).json({
        error: 'Validation failed',
        message: error.message,
      });
    }
  };
}

/**
 * Extender Express Request para incluir validatedData
 * Esto permite que TypeScript entienda req.validatedData
 */
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}
```

#### 2. Controlador Refactorizado (SRP Compliant):

```typescript
// src/modules/auth/auth.controller.ts
export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    // ✅ Datos ya validados por middleware
    const input = req.validatedData as RegisterInput;
    
    // ✅ Solo orquestación HTTP (una única responsabilidad)
    const user = await this.service.register(input);
    res.status(201).json({ user });
  }

  async login(req: Request, res: Response): Promise<void> {
    // ✅ Datos ya validados por middleware
    const input = req.validatedData as LoginInput;
    
    // ✅ Solo orquestación HTTP (una única responsabilidad)
    const session = await this.service.login(input);
    res.json(session);
  }
}
```

#### 3. Rutas Inyectan Middleware de Validación:

```typescript
// src/modules/auth/auth.routes.ts
export function createAuthRouter(): Router {
  const repository = new AuthRepository();
  const service = new AuthService(repository);
  const controller = new AuthController(service);

  const router = Router();

  // ✅ Validación en middleware, no en controlador
  router.post(
    '/register',
    validateRequest(registerSchema),  // ← Middleware de validación
    asyncHandler(controller.register.bind(controller))
  );
  
  router.post(
    '/login',
    validateRequest(loginSchema),     // ← Middleware de validación
    asyncHandler(controller.login.bind(controller))
  );

  return router;
}
```

---

### Beneficios de la Mejora:

| Aspecto | Antes | Después |
|--------|-------|---------|
| **SRP** | ❌ 2 responsabilidades | ✅ 1 responsabilidad |
| **Cambios en validación** | ❌ Modificar controlador | ✅ Modificar solo middleware/rutas |
| **Testabilidad** | ❌ Difícil aislar lógica HTTP | ✅ Fácil testear middleware y controlador por separado |
| **Reutilización** | ❌ Validación solo en auth | ✅ Middleware reutilizable en todos los módulos |
| **Mantenibilidad** | ❌ Lógica de validación dispersa | ✅ Validación centralizada en middleware |
| **Acoplamiento** | ❌ Controlador → Zod | ✅ Controlador → Express Request (genérico) |

### Patrón Aplicado:

- **Middleware Pattern**: Middleware de validación genérico antes del controlador
- **Separation of Concerns**: Validación (middleware) vs. Orquestación (controlador)
- **Chain of Responsibility**: Cadena middleware → controlador → servicio

### Cómo Reutilizar en Otros Módulos:

```typescript
// En cualquier ruta
router.post(
  '/create-work-order',
  validateRequest(createWorkOrderSchema),  // ← Reutilizable
  asyncHandler(workOrderController.create.bind(workOrderController))
);

router.put(
  '/update-product/:id',
  validateRequest(updateProductSchema),    // ← Reutilizable
  asyncHandler(productController.update.bind(productController))
);
```

✅ **Sin modificar validación de ningún controlador existente**

---

## Resumen de Cambios

| Antes | Después |
|-------|---------|
| Verificación de rol hardcodeada en servicio | Estrategia por rol en interfaces |
| Requiere modificar `WorkOrderService` para agregar rol | Solo crea nueva clase Strategy |
| Lógica de autorización mezclada con negocio | Autorización separada y reutilizable |
| Difícil de testear y mockear | Fácil inyectar estrategias mock |
| Validación dentro del controlador | Validación en middleware previo |
| Controlador = orquestación + validación | Controlador = solo orquestación |
| Cambios en schemas afectan controlador | Cambios en schemas solo afectan middleware |
| Validación no reutilizable | Validación reutilizable en todas las rutas |
| Difícil testear controlador aislado | Fácil testear middleware y controlador por separado |

---

## Archivos Modificados y Creados

### ✅ CREADOS:

1. **`src/shared/authorization/filters/authorization-filter.interface.ts`** ✅
   - Interfaz Strategy para encapsular lógica de filtrado

2. **`src/shared/authorization/filters/technician-authorization-filter.ts`** ✅
   - Estrategia para técnicos

3. **`src/shared/authorization/filters/admin-authorization-filter.ts`** ✅
   - Estrategia para administradores

4. **`src/shared/authorization/filters/client-authorization-filter.ts`** ✅
   - Estrategia para clientes

5. **`src/shared/authorization/filters/authorization-filter-factory.ts`** ✅
   - Factory para crear estrategias por rol

6. **`src/shared/middleware/validate-request.middleware.ts`** ✅
   - Middleware genérico de validación

### ✅ MODIFICADOS:

1. **`src/modules/work-orders/work-orders.service.ts`** ✅
   - Refactorizado para usar AuthorizationFilterFactory

2. **`src/modules/work-orders/work-orders.controller.ts`** ✅
   - Actualizado para pasar userCustomerId al servicio

3. **`src/modules/work-orders/work-orders.repository.ts`** ✅
   - Extendido para soportar filtrado por customer_id

4. **`src/modules/auth/auth.controller.ts`** ✅
   - Refactorizado: recibe datos en req.validatedData

5. **`src/modules/auth/auth.routes.ts`** ✅
   - Agrega validateRequest() middleware en rutas

---

**Estado: ✅ COMPLETADO**
**Build Status**: ✅ TypeScript + npm run build → SUCCESS
**Patrón Implementado**: Strategy Pattern + Factory Pattern (CC-05), Middleware Pattern (CC-06)
**Resultado**: OCP y SRP = ✅ CUMPLIDO
