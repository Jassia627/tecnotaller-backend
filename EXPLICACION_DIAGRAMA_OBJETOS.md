# Explicación del Diagrama de Objetos - TecnoTaller Backend

## ¿Qué es un Diagrama de Objetos?

Un **Diagrama de Objetos** es una representación de las **instancias específicas** del sistema en tiempo de ejecución. Mientras que un **Diagrama de Clases** muestra la estructura de clases (plantillas), el **Diagrama de Objetos** muestra **objetos reales** con valores concretos de atributos.

### Diferencia Clave

| Diagrama de Clases | Diagrama de Objetos |
|-------------------|-------------------|
| Define estructura genérica | Muestra instancias específicas |
| `class WorkOrder { ... }` | `wo001: WorkOrder { id = "5083ceb-1234", ... }` |
| "Qué puede ser" | "Qué está siendo en este momento" |
| Conceptual, abstracto | Concreto, tangible |
| Un modelo para muchos objetos | Múltiples objetos del modelo |

---

## Estructura del Diagrama de Objetos

El diagrama `diagrama_objetos_runtime.puml` representa instancias reales del sistema TecnoTaller organizadas en **7 capas** (similar a la arquitectura):

### 1️⃣ Capa de Configuración

**Objetos**: Factories y Middlewares

```
authFilterFactory: AuthorizationFilterFactory
├─ technicianFilter: TechnicianAuthorizationFilter
├─ adminFilter: AdminAuthorizationFilter
└─ clientFilter: ClientAuthorizationFilter

validatorMiddleware: ValidateRequestMiddleware
```

**Propósito**: Configuración compartida del sistema (OCP, SRP)

---

### 2️⃣ Capa de Servicios

**Objetos**: Servicios de negocio

```
workOrderService: WorkOrderService
  - repository = workOrderRepo
  - guid = guidGenerator

authService: AuthService
  - repository = authRepo

purchaseService: PurchaseRequestService
  - repository = purchaseRepo

activityService: ActivityService
  - repository = activityRepo
```

**Propósito**: Lógica de negocio (crear, listar, transicionar estados)

---

### 3️⃣ Capa de Repositorios

**Objetos**: Acceso a datos (inyección de dependencias - DIP)

```
workOrderRepo: WorkOrderRepository
  - supabase = supabaseClient

authRepo: AuthRepository
  - supabase = supabaseClient

purchaseRepo: PurchaseRequestRepository
  - supabase = supabaseClient

activityRepo: ActivityRepository
  - supabase = supabaseClient
```

**Propósito**: Persistencia en Supabase (aislada de servicios)

---

### 4️⃣ Capa de Controladores

**Objetos**: Orquestación HTTP (SRP)

```
workOrderController: WorkOrderController
  - service = woService
  - activityService = activityService

authController: AuthController
  - service = authService
```

**Propósito**: Recibir requests, orquestar servicios, enviar respuestas

---

### 5️⃣ Capa de Entidades de Dominio

**Órdenes de Trabajo** (WorkOrder)

```
wo001: WorkOrder
  - id = "5083ceb-1234"
  - guideNumber = "WO-1789166462584"
  - customerId = "cust-001"
  - technicianId = null
  - deviceBrand = "Samsung"
  - deviceModel = "Galaxy S21"
  - problemDescription = "No enciende"
  - _currentStatus = "PENDIENTE"
  - scheduledTime = "2026-09-15 14:00:00"
  - createdAt = "2026-09-13 14:30:00"

wo002: WorkOrder
  - id = "ad6de68-5678"
  - ... (orden diferente con otros atributos)
```

**Propósito**: Dominio central - una orden de trabajo = un objeto único

---

### 6️⃣ Entidades Relacionadas

#### Historial de Estados
```
sh001: StatusHistoryEntry
  - id = "hist-001"
  - fromStatus = "INGRESADO"
  - toStatus = "PENDIENTE"
  - userId = "cust-001"
  - createdAt = "2026-09-13 14:30:00"

sh002: StatusHistoryEntry
  - id = "hist-002"
  - fromStatus = "PENDIENTE"
  - toStatus = "ACEPTADA"
  - userId = "admin-001"
  - createdAt = "2026-09-13 15:00:00"
```

**Relación**: Cada WorkOrder tiene múltiples StatusHistoryEntry (1-a-N)

#### Diagnósticos
```
diag001: Diagnostic
  - id = "diag-001"
  - workOrderId = "5083ceb-1234"
  - technicianId = "tech-001"
  - observations = "Batería descargada"
  - faults = "No enciende, batería al 0%"
```

**Relación**: Una WorkOrder puede tener múltiples Diagnostic

#### Garantías
```
war001: Warranty
  - id = "war-001"
  - workOrderId = "5083ceb-1234"
  - periodDays = 90
  - expiresAt = "2026-12-13"
  - status = "VIGENTE"
```

**Relación**: Una WorkOrder tiene una Warranty (1-a-1)

---

### 7️⃣ Entidades de Usuario y Negocio

#### Usuarios
```
user001: AuthUser (cliente)
  - id = "cust-001"
  - email = "juan.perez@email.com"
  - role = "cliente"
  - fullName = "Juan Pérez"

user002: AuthUser (técnico)
  - id = "tech-001"
  - email = "carlos.tech@tecnotaller.com"
  - role = "tecnico"
  - fullName = "Carlos Mendoza"

user003: AuthUser (admin)
  - id = "admin-001"
  - role = "administrador"
```

#### Clientes y Técnicos
```
cust001: Customer
  - id = "cust-001"
  - fullName = "Juan Pérez"
  - email = "juan.perez@email.com"

tech001: Technician
  - id = "tech-001"
  - fullName = "Carlos Mendoza"
  - active = true
```

#### Compras y Proveedores
```
supp001: Supplier
  - id = "supp-001"
  - name = "Samsung Parts Latin America"
  - active = true

pr001: PurchaseRequest
  - id = "pr-001"
  - supplierId = "supp-001"
  - partId = "part-001"
  - quantity = 2
  - unitPrice = 85000
  - _status = "RECIBIDO"
```

#### Productos y Repuestos
```
prod001: Product
  - id = "prod-001"
  - sku = "BATT-SAMSUNG-001"
  - name = "Batería Samsung Galaxy S21"
  - _stock = 15

part001: Part
  - id = "part-001"
  - name = "Screen Display Samsung S21"
  - _stock = 8
```

#### Servicios y Citas
```
svc001: TechnicalService
  - id = "svc-001"
  - name = "Cambio de Batería"
  - price = 50000

appt001: Appointment
  - id = "appt-001"
  - serviceId = "svc-001"
  - customerName = "Juan Pérez"
  - _status = "CONFIRMADA"
```

---

## Relaciones en el Diagrama de Objetos

### Relación 1-a-1
```
wo001: WorkOrder ──── war001: Warranty
(una orden tiene una garantía)
```

### Relación 1-a-N
```
wo001: WorkOrder ─────┬──── sh001: StatusHistoryEntry
                      ├──── sh002: StatusHistoryEntry
                      └──── diag001: Diagnostic
(una orden tiene múltiples estados y diagnósticos)
```

### Relación N-a-1
```
pr001: PurchaseRequest ──── supp001: Supplier
pr002: PurchaseRequest ──── supp001: Supplier
(múltiples compras del mismo proveedor)
```

### Relación de Referencia
```
wo001: WorkOrder ──── cust001: Customer
(la orden tiene un cliente)

wo002: WorkOrder ──── tech001: Technician
(la orden asignada a un técnico)

user001: AuthUser ──── cust001: Customer
(usuario cliente corresponde a customer)
```

---

## Flujo de Datos - Ejemplo Concreto

### Escenario: Cliente Juan crea orden de trabajo

```
1️⃣ SOLICITUD HTTP
   Cliente HTTP → POST /api/v1/work-orders/client
   Body: {deviceBrand: "Samsung", deviceModel: "Galaxy S21", ...}

2️⃣ MIDDLEWARE (SRP)
   validatorMiddleware.validate(body, createWorkOrderSchema)
   ✅ Válido → adjunta req.validatedData

3️⃣ CONTROLADOR (SRP)
   workOrderController.createAsClient(req, res)
   - Lee req.validatedData ✅
   - Llama woService.create(input, 'PENDIENTE')

4️⃣ SERVICIO
   woService.create(input, 'PENDIENTE')
   - Crea workOrder = new WorkOrder(...)
   - Llama workOrderRepo.create(workOrder, guideNumber, 'PENDIENTE')

5️⃣ REPOSITORIO (DIP)
   workOrderRepo.create(...)
   - Inserta en Supabase (tabla work_orders)
   - Retorna WorkOrderRow

6️⃣ DOMINIO
   → wo001: WorkOrder es creada
   {
     id: "5083ceb-1234",
     guideNumber: "WO-1789166462584",
     customerId: "cust-001",  // Auto-asignado de req.user.id
     _currentStatus: "PENDIENTE",
     scheduledTime: "2026-09-15 14:00:00"  // Propuesto por cliente
   }

7️⃣ HISTORIAL
   → sh001: StatusHistoryEntry es creada
   {
     fromStatus: "INGRESADO",
     toStatus: "PENDIENTE",
     userId: "cust-001"  // Cliente que creó
   }

8️⃣ RESPUESTA HTTP
   res.status(201).json(wo001)
   ✅ Cliente recibe la orden creada
```

---

## Diferencias SOLID Reflejadas en el Diagrama de Objetos

### OCP - Strategy Pattern para Roles

```
authFilterFactory.createFilter("cliente")
  → clientFilter: ClientAuthorizationFilter

authFilterFactory.createFilter("tecnico")
  → technicianFilter: TechnicianAuthorizationFilter

authFilterFactory.createFilter("administrador")
  → adminFilter: AdminAuthorizationFilter
```

**En tiempo de ejecución**: Cada rol obtiene su filtro sin modificar WorkOrderService.

### SRP - Middleware de Validación

```
request → validatorMiddleware
          (SOLO VALIDA)
          ↓
       workOrderController
          (SOLO ORQUESTA)
```

**En tiempo de ejecución**: Validación separada de orquestación.

### DIP - Inyección de Dependencias

```
woService.constructor(repository: IWorkOrderRepository)

En tiempo de ejecución:
  woService.repository = workOrderRepo (real)
  woService.repository = mockRepo (en tests)
```

---

## Lectura del Diagrama

### Sintaxis PlantUML

```
object "nombre_variable: Clase" as nombre_corto {
    atributo1 = valor1
    atributo2 = valor2
}
```

### Ejemplo

```
object "wo001: WorkOrder" as wo001 {
    id = "5083ceb-1234"
    _currentStatus = "PENDIENTE"
}
```

Significa: Existe una instancia del objeto `wo001`, que es una instancia de la clase `WorkOrder`, con el atributo `id` = `"5083ceb-1234"`.

### Relaciones

```
wo001 --> cust001 : "pertenece a"
```

Significa: El objeto `wo001` tiene una relación de pertenencia con `cust001`.

---

## Ventajas del Diagrama de Objetos

1. **Visualización Concreta**: Ver instancias reales, no abstracciones
2. **Verificación de Consistencia**: Asegurar que los atributos tengan sentido
3. **Testing**: Documentar escenarios esperados del sistema
4. **Comunicación**: Facilita explicar al equipo cómo se ve el sistema en funcionamiento
5. **Traceabilidad**: Seguir cómo fluyen los datos de una capa a otra

---

## Comparación: Diagrama de Clases vs. Diagrama de Objetos

### Diagrama de Clases (Abstracto)
```
class WorkOrder {
    - id: string
    - customerId: string | null
    - _currentStatus: OrderStatus
    + canTransitionTo(status): boolean
}
```

### Diagrama de Objetos (Concreto)
```
wo001: WorkOrder {
    id = "5083ceb-1234"
    customerId = "cust-001"
    _currentStatus = "PENDIENTE"
}
```

El diagrama de clases dice "un WorkOrder tiene estos atributos".  
El diagrama de objetos dice "esta orden específica tiene estos valores".

---

## Resumen

El **Diagrama de Objetos de TecnoTaller** muestra:

✅ **Instancias reales** del sistema en un momento determinado  
✅ **Valores concretos** en atributos de objetos  
✅ **Relaciones activas** entre objetos (quién usa quién)  
✅ **Capas arquitectónicas** desde middleware hasta dominio  
✅ **SOLID aplicado**: OCP (filtros), SRP (validación), DIP (repositorios)  
✅ **Flujo de datos**: Cómo los datos viajan desde HTTP hasta la BD  

Es la **fotografía en tiempo de ejecución** del sistema documentado en el Diagrama de Clases.
