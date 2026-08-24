# 📊 Diagrama de Clases UML - TechnoTaller Backend

## Descripción General

Este diagrama UML representa el modelo de dominio del sistema TechnoTaller, incluyendo:
- **Clases del dominio** con atributos y métodos
- **Relaciones**: Herencia, Composición, Asociación, Agregación
- **Patrones de diseño**: Factory, State, Strategy, Observer
- **Máquinas de estado** en WorkOrder y Appointment

---

## 🎯 Clases Principales del Dominio

### 1. **TechnicalService** (Servicio Técnico)
```
┌─────────────────────────────┐
│    TechnicalService         │
├─────────────────────────────┤
│ - id: string                │
│ - name: string              │
│ - description: string       │
│ - price: number             │
│ - _active: boolean (pvt)    │
├─────────────────────────────┤
│ + activate(): void          │
│ + deactivate(): void        │
│ + get active(): boolean     │
│ + static fromRow()          │
└─────────────────────────────┘
```

---

### 2. **Appointment** (Cita)
```
┌─────────────────────────────────────┐
│         Appointment                 │
├─────────────────────────────────────┤
│ - id: string                        │
│ - serviceId: string (FK)            │
│ - customerName: string              │
│ - phone: string                     │
│ - date: Date                        │
│ - _status: AppointmentStatus (pvt)  │
│ - createdAt: Date                   │
├─────────────────────────────────────┤
│ + confirm(): void                   │
│ + cancel(): void                    │
│ + complete(): void                  │
│ + get status(): AppointmentStatus   │
│ + static fromRow()                  │
└─────────────────────────────────────┘

Estados: pendiente | confirmada | cancelada | completada
```

---

### 3. **WorkOrder** (Orden de Trabajo)
```
┌───────────────────────────────────────┐
│          WorkOrder                    │
├───────────────────────────────────────┤
│ - id: string                          │
│ - guideNumber: string                 │
│ - customerId: string | null (FK)      │
│ - technicianId: string | null (FK)    │
│ - deviceBrand: string                 │
│ - deviceModel: string                 │
│ - deviceSerial: string                │
│ - problemDescription: string          │
│ - accessories: string | null          │
│ - _currentStatus: OrderStatus (pvt)   │
│ - createdAt: string                   │
├───────────────────────────────────────┤
│ + canTransitionTo(status): boolean    │
│ + transitionTo(status): void          │
│ + get currentStatus(): OrderStatus    │
│ + static fromRow()                    │
└───────────────────────────────────────┘

Estados (7): INGRESADO → EN_REVISION → ESPERANDO_REPUESTO | EN_REPARACION
             → REPARADO → LISTO_PARA_ENTREGA → ENTREGADO

Máquina de Estados: STATUS_TRANSITIONS
```

---

### 4. **Product** (Producto)
```
┌──────────────────────────────────┐
│         Product                  │
├──────────────────────────────────┤
│ - id: string                     │
│ - sku: string                    │
│ - name: string                   │
│ - description: string            │
│ - imageUrl: string | null        │
│ - categoryId: string | null      │
│ - purchasePrice: number          │
│ - salePrice: number              │
│ - _stock: number (pvt)           │
│ - _active: boolean (pvt)         │
├──────────────────────────────────┤
│ + addStock(quantity): void       │
│ + removeStock(quantity): void    │
│ + activate(): void               │
│ + deactivate(): void             │
│ + get stock(): number            │
│ + get active(): boolean          │
│ + get available(): boolean       │
│ + static fromRow()               │
└──────────────────────────────────┘
```

---

### 5. **Part** (Repuesto)
```
┌────────────────────────────────┐
│         Part                   │
├────────────────────────────────┤
│ - id: string                   │
│ - name: string                 │
│ - sku: string                  │
│ - _stock: number (pvt)         │
│ - purchasePrice: number        │
│ - salePrice: number            │
├────────────────────────────────┤
│ + discount(quantity): void     │
│ + restock(quantity): void      │
│ + get stock(): number          │
│ + static fromRow()             │
└────────────────────────────────┘
```

---

### 6. **Customer** (Cliente)
```
┌──────────────────────────────┐
│       Customer               │
├──────────────────────────────┤
│ - id: string                 │
│ - email: string | null       │
│ - fullName: string           │
│ - phone: string | null       │
│ - createdAt: string          │
├──────────────────────────────┤
│ (Entidad anémica - sin lógica)
└──────────────────────────────┘
```

---

### 7. **Technician** (Técnico)
```
┌──────────────────────────────┐
│       Technician             │
├──────────────────────────────┤
│ - id: string                 │
│ - fullName: string           │
│ - email: string              │
│ - phone: string | null       │
│ - active: boolean            │
│ - createdAt: string          │
├──────────────────────────────┤
│ (Entidad anémica - sin lógica)
└──────────────────────────────┘
```

---

### 8. **AuthUser** (Usuario Autenticado)
```
┌──────────────────────────────┐
│       AuthUser               │
├──────────────────────────────┤
│ - id: string                 │
│ - email: string              │
│ - role: Role                 │
│ - fullName: string           │
│ - phone: string | null       │
├──────────────────────────────┤
│ (Interfaz - sin lógica)      │
└──────────────────────────────┘

Role: admin | cliente | tecnico
```

---

### 9. **Diagnostic** (Diagnóstico)
```
┌────────────────────────────────┐
│       Diagnostic               │
├────────────────────────────────┤
│ - id: string                   │
│ - workOrderId: string (FK)     │
│ - technicianId: string (FK)    │
│ - observations: string         │
│ - faults: string               │
│ - recommendedActions: string   │
│ - createdAt: string            │
├────────────────────────────────┤
│ (Entidad anémica - sin lógica) │
└────────────────────────────────┘
```

---

### 10. **Warranty** (Garantía)
```
┌──────────────────────────────────┐
│         Warranty                 │
├──────────────────────────────────┤
│ - id: string                     │
│ - workOrderId: string (FK)       │
│ - periodDays: number             │
│ - expiresAt: string              │
│ - status: WarrantyStatus         │
│ - createdAt: string              │
│ - isActive: boolean (computed)   │
├──────────────────────────────────┤
│ (Entidad anémica - sin lógica)   │
└──────────────────────────────────┘

Status: vigente | vencida
```

---

### 11. **Notification** (Notificación)
```
┌────────────────────────────────┐
│       Notification             │
├────────────────────────────────┤
│ - id: string                   │
│ - workOrderId: string (FK)     │
│ - toEmail: string              │
│ - type: string                 │
│ - status: NotificationStatus   │
│ - sentAt: string | null        │
│ - createdAt: string            │
├────────────────────────────────┤
│ (Entidad anémica - sin lógica) │
└────────────────────────────────┘

Status: pendiente | enviada | fallida
```

---

### 12. **AuditLog** (Registro de Auditoría)
```
┌────────────────────────────────┐
│       AuditLog                 │
├────────────────────────────────┤
│ - id: string                   │
│ - userId: string | null (FK)   │
│ - action: string               │
│ - entity: string               │
│ - entityId: string | null      │
│ - details: unknown             │
│ - createdAt: string            │
├────────────────────────────────┤
│ (Patrón: Observer/Auditoría)   │
└────────────────────────────────┘

Actions: CREATE | UPDATE | DELETE | etc.
```

---

### 13. **INotifier** (Interfaz - Strategy Pattern)
```
┌────────────────────────────────┐
│     <<interface>>               │
│       INotifier                │
├────────────────────────────────┤
│ + send(message): Promise<void> │
└────────────────────────────────┘

NotificationMessage: { toEmail, subject, body }
```

---

## 📐 Relaciones UML

### **Diagrama Completo de Relaciones**

```
                          ┌─────────────────┐
                          │  TechnicalService│
                          └────────┬─────────┘
                                   │
                                   │ <<asociación>>
                                   │ referencia
                                   ↓
        ┌──────────────┐    ┌──────────────┐
        │  Appointment │    │  Customer    │
        └──────┬───────┘    └──────┬───────┘
               │                   │
               │ <<asociación>>    │ <<agregación>>
               │ serviceId         │ ordenes
               │                   │
               │    ┌──────────────┴──────────────┐
               │    │                             │
               ↓    ↓                             ↓
        ┌─────────────────────────────────────────────┐
        │           WorkOrder                        │
        ├─────────────────────────────────────────────┤
        │ - guideNumber, device*, problem*, status    │
        │ - customerId (nullable) ← Customer         │
        │ - technicianId (nullable) ← Technician     │
        ├─────────────────────────────────────────────┤
        │ + canTransitionTo()                         │
        │ + transitionTo() [STATE PATTERN]            │
        └─────────────────────────────────────────────┘
               │
        ┌──────┼──────┬──────────┬────────────┐
        │      │      │          │            │
   <<agregación>> │  │          │            │
        │      │      │          │            │
        ↓      ↓      ↓          ↓            ↓
    ┌─────┐ ┌────────┐  ┌──────────┐  ┌───────────┐
    │Part │ │Diagnostic│ │Warranty  │  │Notification
    └─────┘ └────────┘  └──────────┘  └───────────┘
        │         │
    <<composición>> │
    inventario     │ <<asociación>>
        │          │ technicianId → Technician
        │          │
    Stock         ┌────────────────┐
   (privado)      │  Technician    │
                  └────────────────┘

    ┌────────────┐   ┌──────────────┐
    │  Product   │   │   AuthUser   │
    │  (similar) │   │  (contexto)  │
    └────────────┘   └──────────────┘
            │
       <<agregación>>
       InventoryMovement

    ┌──────────────────┐
    │   AuditLog       │
    │ (referencia      │ <<asociación>>
    │  genérica)       │→ userId (cualquier entidad)
    └──────────────────┘

    ┌──────────────────┐
    │  INotifier       │ <<interface>>
    │ (Strategy)       │
    └──────────────────┘
```

---

## 🔗 Tipos de Relaciones Identificadas

### **1. Asociación Simple**
- **WorkOrder** ↔ **Customer** (workOrder.customerId)
- **WorkOrder** ↔ **Technician** (workOrder.technicianId)
- **Appointment** ↔ **TechnicalService** (appointment.serviceId)
- **Diagnostic** ↔ **Technician** (diagnostic.technicianId)
- **Warranty** ↔ **WorkOrder** (warranty.workOrderId)
- **Notification** ↔ **WorkOrder** (notification.workOrderId)
- **AuditLog** ↔ **AuthUser** (auditLog.userId)

### **2. Agregación**
- **WorkOrder** ◆─ **Diagnostic** (múltiples diagnósticos por orden)
- **Customer** ◆─ **WorkOrder** (múltiples órdenes por cliente)
- **Customer** ◆─ **Appointment** (múltiples citas por cliente)
- **Technician** ◆─ **WorkOrder** (múltiples órdenes por técnico)
- **Technician** ◆─ **Diagnostic** (múltiples diagnósticos por técnico)
- **Product** ◆─ **InventoryMovement** (historial de movimientos)
- **Part** ◆─ **WorkOrder** (repuestos usados en órdenes)

### **3. Composición**
- **Product** ◆─ **Stock** (privado: _stock es parte integral)
- **Part** ◆─ **Stock** (privado: _stock es parte integral)
- **WorkOrder** ◆─ **OrderStatus** (estado privado: _currentStatus)
- **Appointment** ◆─ **AppointmentStatus** (estado privado: _status)
- **Product** ◆─ **_active** (estado privado)
- **TechnicalService** ◆─ **_active** (estado privado)

### **4. NO hay Herencia (ZERO) **
- Cada clase es una entidad independiente
- NO hay jerarquías de herencia
- Patrón: **Composition over Inheritance**

---

## 🎨 Patrones de Diseño Identificados

### **1. Factory Pattern**
```typescript
// En todas las clases principales
class TechnicalService {
  static fromRow(row: ServiceRow): TechnicalService { ... }
}

class WorkOrder {
  static fromRow(row: WorkOrderRow): WorkOrder { ... }
}

class Appointment {
  static fromRow(row: AppointmentRow): Appointment { ... }
}
```

### **2. State Pattern**
```typescript
// WorkOrder
class WorkOrder {
  private _currentStatus: OrderStatus;
  
  canTransitionTo(next: OrderStatus): boolean {
    return STATUS_TRANSITIONS[this._currentStatus].includes(next);
  }
  
  transitionTo(next: OrderStatus): void {
    if (!this.canTransitionTo(next)) throw new Error(...);
    this._currentStatus = next;
  }
}

// Appointment
class Appointment {
  private _status: AppointmentStatus;
  
  confirm(): void { ... }
  cancel(): void { ... }
  complete(): void { ... }
}
```

### **3. Strategy Pattern**
```typescript
// INotifier es una interfaz extensible
interface INotifier {
  send(message: NotificationMessage): Promise<void>;
}

// Permite múltiples implementaciones:
// - EmailNotifier
// - SMSNotifier
// - SlackNotifier
```

### **4. Observer/Audit Pattern**
```typescript
// AuditLog registra todas las acciones
interface AuditLog {
  userId: string | null;
  action: string;    // CREATE, UPDATE, DELETE
  entity: string;    // Nombre de la entidad
  entityId: string;  // ID del registro
  details: unknown;  // Datos adicionales
}
```

### **5. Value Object Pattern**
```typescript
// Estados como tipos discriminados
type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
type OrderStatus = 'INGRESADO' | 'EN_REVISION' | ... | 'ENTREGADO';
type Role = 'admin' | 'cliente' | 'tecnico';
type NotificationStatus = 'pendiente' | 'enviada' | 'fallida';
```

---

## 📝 Especificación de Relaciones

### **WorkOrder - Entidad Central**

```
WorkOrder (Entidad Agregada)
│
├─ Asociación: Customer (1:N)
│  └─ Un cliente puede tener múltiples órdenes
│
├─ Asociación: Technician (1:N)
│  └─ Un técnico puede tener múltiples órdenes
│
├─ Agregación: Diagnostic (1:N)
│  └─ Una orden tiene múltiples diagnósticos (sólo existen con orden)
│
├─ Agregación: StatusHistoryEntry (1:N)
│  └─ Historia de transiciones de estado
│
├─ Asociación: Warranty (1:1)
│  └─ Una orden genera una garantía
│
├─ Agregación: Part (N:M)
│  └─ Repuestos utilizados en la reparación
│
└─ Agregación: Notification (1:N)
   └─ Notificaciones relacionadas con la orden
```

---

## 🔄 Flujo de Entidades

```
CREACIÓN:
Customer → Appointment → Confirmation → WorkOrder → Diagnostic → Resolution
                                           ↓
                                      Warranty
                                           ↓
                                      Part/Product

AUDITORÍA:
Cualquier cambio → AuditLog (userId, action, entity, entityId)

NOTIFICACIÓN:
Cualquier evento → Notification → INotifier.send()
```

---

## 📊 Resumen de Relaciones

| Relación | Tipo | Multiplicidad | Descripción |
|----------|------|---------------|-------------|
| WorkOrder - Customer | Asociación | 1:N | Orden pertenece a cliente |
| WorkOrder - Technician | Asociación | 1:N | Orden asignada a técnico |
| WorkOrder - Diagnostic | Agregación | 1:N | Diagnósticos de la orden |
| WorkOrder - Warranty | Asociación | 1:1 | Garantía de la orden |
| WorkOrder - Notification | Agregación | 1:N | Notificaciones de orden |
| WorkOrder - Part | Asociación | N:M | Repuestos utilizados |
| Appointment - TechnicalService | Asociación | N:1 | Cita reserva servicio |
| Appointment - Customer | Asociación | N:1 | Cita del cliente |
| Product - InventoryMovement | Agregación | 1:N | Historial de stock |
| Part - Stock | Composición | 1:1 | Inventario privado |
| AuthUser - AuditLog | Asociación | 1:N | Usuario audita acciones |
| Technician - Diagnostic | Asociación | 1:N | Técnico realiza diagnóstico |

---

## ✅ Checklist de Relaciones UML

- [x] **Herencia**: NO identificada (cero jerarquías)
- [x] **Composición**: Identificada en atributos privados (stock, status, active)
- [x] **Asociación**: Identificada en relaciones 1:N y N:M (FK)
- [x] **Agregación**: Identificada en colecciones de entidades relacionadas
- [x] **Métodos principales**: Factory, State transitions, validaciones
- [x] **Atributos**: Todos incluidos (públicos, privados, computados)
- [x] **Patrones de diseño**: Factory, State, Strategy, Observer

---

## 🎯 Conclusión

El modelo de dominio de TechnoTaller presenta:

✅ **Composición sobre Herencia** - Usa composición de estados y atributos privados
✅ **Entidades con Lógica** - WorkOrder y Appointment tienen máquinas de estado
✅ **Entidades Anémicas** - Customer, Technician, Diagnostic (sin lógica de negocio)
✅ **Patrón Factory** - Construcción mediante `fromRow()` en todas partes
✅ **Patrón State** - Transiciones validadas de estado en WorkOrder y Appointment
✅ **Patrón Strategy** - INotifier para extensibilidad de notificaciones
✅ **Auditoría Centralizada** - AuditLog registra todas las acciones

El diseño es flexible, extensible y sigue principios SOLID.
