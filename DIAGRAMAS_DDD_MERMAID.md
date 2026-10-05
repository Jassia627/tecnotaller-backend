# 🧩 Diseño Dirigido por el Dominio (DDD) - TecnoTaller / TecnoFix

Basado en los fundamentos de **Domain Driven Design (DDD)** explicados en la guía de referencia (Enfoque en el dominio, Lenguaje Ubicuo, Bounded Contexts, Agregados, Value Objects, Repositorios y Context Mapping).

---

## 1. 🗺️ Mapa de Contextos Delimitados (Bounded Contexts & Context Map)

En DDD, un **Bounded Context** delimita las fronteras conceptuales donde un término tiene un significado estricto e inequívoco.

```mermaid
flowchart TD
    subgraph GenericDomains ["Genéricos (Generic Subdomains)"]
        AUTH["🔐 Bounded Context: Auth & IAM\n(Autenticación, Roles y Permisos)"]
        NOTIF["🔔 Bounded Context: Notificaciones\n(Email / SMS / Push)"]
        AUDIT["📜 Bounded Context: Auditoría\n(Trazabilidad de Logs)"]
    end

    subgraph CoreDomain ["Dominio Principal (Core Domain)"]
        WO["🛠️ Bounded Context: Reparaciones y Servicio Técnico\n- Work Orders\n- Diagnostics\n- Evidencias Fotográficas"]
    end

    subgraph SupportingDomains ["Dominios de Soporte (Supporting Subdomains)"]
        INV["📦 Bounded Context: Inventario y Repuestos\n- Productos y Catálogo\n- Repuestos (Parts)\n- Movimientos de Stock (RPC)"]
        CITAS["📅 Bounded Context: Citas y Agenda\n- Citas de Clientes\n- Disponibilidad de Técnicos"]
        WARR["🛡️ Bounded Context: Garantías\n- Pólizas post-reparación\n- Reclamaciones"]
    end

    %% Relaciones Context Mapping (U / D / ACL / OHS)
    AUTH -->|"Upstream (OHS/PL)\nProvee identidad"| WO
    AUTH -->|"Upstream (OHS/PL)\nProvee identidad"| INV
    AUTH -->|"Upstream (OHS/PL)\nProvee identidad"| CITAS

    CITAS -->|"Upstream (Customer/Supplier)\nCita genera orden"| WO

    INV -->|"Upstream (U)\nStock y Piezas"| ACL["🛡️ ACL (Anti-Corruption Layer)\nTraducción de Repuestos"]
    ACL -->|"Downstream (D)\nConsumo en Orden"| WO

    WO -->|"Upstream (Evento: Orden Entregada)"| WARR
    WO -->|"Upstream (Evento: Cambio de Estado)"| NOTIF
    CITAS -->|"Upstream (Evento: Cita Confirmada)"| NOTIF

    WO -.->|"Domain Events"| AUDIT
    INV -.->|"Domain Events"| AUDIT

    classDef core fill:#fff3cd,stroke:#ffc107,stroke-width:2px,color:#000;
    classDef support fill:#d1ecf1,stroke:#17a2b8,stroke-width:2px,color:#000;
    classDef generic fill:#e2e3e5,stroke:#6c757d,stroke-width:2px,color:#000;
    classDef acl fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#000;

    class WO core;
    class INV,CITAS,WARR support;
    class AUTH,NOTIF,AUDIT generic;
    class ACL acl;
```

### 🤝 Relaciones entre Contextos (Patrones DDD de la Infografía):
1. **Upstream (U) / Downstream (D)**:
   * `Auth` es **Upstream**: provee tokens y claims a los demás módulos.
   * `Work Orders` es **Downstream** respecto a `Auth` y `Citas`.
2. **Anti-Corruption Layer (ACL)**:
   * El módulo de **Reparaciones** no acopla directamente su modelo interno al modelo de inventario físico. Usa una capa **ACL** para solicitar y reservar repuestos sin contaminar el dominio de reparación.
3. **Open Host Service (OHS) / Published Language (PL)**:
   * `Auth` expone un servicio abierto estandarizado basado en JWT y contratos TypeScript compartidos.
4. **Customer / Supplier (C/S)**:
   * El contexto de **Citas** actúa como proveedor que alimenta el flujo de recepción de **Reparaciones**.

---

## 2. 🎯 Modelo Táctico DDD: Bounded Context de Reparaciones (Core Domain)

Siguiendo el ejemplo práctico de la infografía (Cliente $\rightarrow$ Pedido $\rightarrow$ Línea de Pedido $\rightarrow$ Total $\rightarrow$ Repositorio):

```mermaid
classDiagram
    direction TB

    class WorkOrder {
        <<Aggregate Root>>
        +UUID id
        +TrackingCode trackingCode
        +UUID customerId
        +UUID technicianId
        +OrderStatus status
        +DeviceDetails device
        +Money totalEstimatedCost
        +Money finalCost
        +DateTime createdAt
        +assignTechnician(technicianId)
        +transitionTo(newStatus)
        +addDiagnostic(description, quote)
        +addPartUsed(partId, qty, unitPrice)
        +attachPhoto(url, stage)
    }

    class Diagnostic {
        <<Entity>>
        +UUID id
        +String problemDescription
        +String solutionProposed
        +Money estimatedLaborCost
        +Boolean clientApproved
    }

    class OrderPart {
        <<Entity>>
        +UUID id
        +UUID partId
        +Quantity quantity
        +Money unitPrice
        +subtotal() Money
    }

    class OrderPhoto {
        <<Entity>>
        +UUID id
        +String fileUrl
        +PhotoStage stage
        +DateTime capturedAt
    }

    class TrackingCode {
        <<Value Object>>
        +String code
        +isValid() Boolean
    }

    class OrderStatus {
        <<Value Object / State Machine>>
        +String current
        +canTransitionTo(nextStatus) Boolean
    }

    class Money {
        <<Value Object>>
        +Decimal amount
        +String currency
        +add(Money) Money
    }

    class WorkOrderRepository {
        <<Repository>>
        +findById(id) WorkOrder
        +findByTrackingCode(code) WorkOrder
        +save(workOrder) Void
        +updateStatus(id, newStatus) Void
    }

    %% Relaciones del Agregado
    WorkOrder *-- Diagnostic : "1 contiene"
    WorkOrder *-- OrderPart : "0..* contiene"
    WorkOrder *-- OrderPhoto : "0..* contiene"
    WorkOrder --> TrackingCode : "posee"
    WorkOrder --> OrderStatus : "controla estado con"
    WorkOrder --> Money : "totaliza con"
    WorkOrderRepository ..> WorkOrder : "persiste y recupera"
```

---

## 3. 🧠 Conceptos Fundamentales Aplicados al Sistema

| Concepto DDD | Elemento en TecnoTaller | Justificación |
|---|---|---|
| **Entidad (Entity)** | `Diagnostic`, `OrderPart`, `OrderPhoto` | Tienen un identificador único (UUID) y su estado cambia en el tiempo, pero existen subordinadas a la orden de trabajo. |
| **Objeto de Valor (Value Object)** | `TrackingCode`, `Money`, `OrderStatus`, `Quantity` | Son **inmutables** y se definen por sus atributos, no por su identidad. Por ejemplo, dos instancias de `Money(50, 'USD')` son idénticas e intercambiables. |
| **Raíz del Agregado (Aggregate Root)** | `WorkOrder` | Es la puerta de entrada única. Ninguna entidad externa puede modificar una `OrderPart` o un `Diagnostic` sin pasar por los métodos de control de `WorkOrder`. Asegura la consistencia del conjunto. |
| **Agregado (Aggregate)** | `[WorkOrder + Diagnostic + OrderParts + Photos]` | Se tratan como una sola unidad transaccional. Al guardar o cambiar de estado, se validan todas las reglas globales del conjunto. |
| **Repositorio (Repository)** | `WorkOrderRepository` (`work-orders.repository.ts`) | Encapsula el acceso a la base de datos (PostgreSQL/Supabase) y devuelve entidades y agregados de dominio limpios, ocultando el SQL y las consultas CRUD. |
| **Lenguaje Ubicuo (Ubiquitous Language)** | Términos de negocio unificados | Todos (código, base de datos, frontend y taller) usan exactamente los mismos términos: `received`, `diagnosing`, `waiting_parts`, `completed`, `delivered`, `tracking_code`. |

---

## 4. 📋 Reglas de Negocio del Agregado de Reparaciones

1. **Invariante de Diagnóstico**:
   * Una orden no puede pasar a estado `IN_PROGRESS` ni `APPROVED` sin antes haber registrado un `Diagnostic` con costo estimado.
2. **Cálculo Consistente de Costo**:
   * $\text{Costo Total} = \sum (\text{OrderPart.subtotal}) + \text{Diagnostic.estimatedLaborCost}$.
3. **Control de Transiciones (State Pattern)**:
   * Solo se permiten transiciones válidas:
     $$\text{RECEIVED} \rightarrow \text{DIAGNOSING} \rightarrow \text{PENDING\_APPROVAL} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{COMPLETED} \rightarrow \text{DELIVERED}$$
4. **Registro de Trazabilidad**:
   * Cada cambio de estado en `WorkOrder` dispara automáticamente una entrada en el historial de auditoría y notifica al cliente si corresponde.
