# Patrón Prototype - Implementación en WorkOrder

## 📋 Información General

| Campo | Valor |
|-------|-------|
| **Patrón** | Prototype (Creacional) |
| **Archivo modificado** | `src/modules/work-orders/work-orders.types.ts` |
| **Clase afectada** | `WorkOrder` |
| **Fecha de implementación** | Octubre 2026 |

---

## 🎯 ¿Por qué usar Prototype aquí?

### Problema Identificado

En TecnoTaller, frecuentemente se presentan escenarios donde se necesita crear una nueva orden de servicio basada en una existente:

1. **Órdenes de Garantía**: Un dispositivo regresa porque la reparación falló
2. **Dispositivos Recurrentes**: Un cliente frecuente trae el mismo equipo varias veces
3. **Seguimientos**: Se necesita crear una orden de seguimiento para un dispositivo

**Sin el patrón Prototype**, para duplicar una orden había que:
```typescript
// ❌ ANTES: Código tedioso y propenso a errores
const original = await service.getById(orderId);
const newOrder = await service.create({
  customerId: original.customerId,
  technicianId: null,
  deviceBrand: original.deviceBrand,
  deviceModel: original.deviceModel,
  deviceSerial: original.deviceSerial,
  problemDescription: "Nuevo problema...",
  accessories: original.accessories,
  // ... 14 campos más
}, 'PENDIENTE');
```

---

## ✅ ¿Para qué sirve?

El patrón Prototype permite:

1. **Clonar objetos** sin conocer su clase concreta
2. **Evitar código repetitivo** al duplicar objetos complejos
3. **Crear variantes** de un objeto base fácilmente
4. **Desacoplar** el código cliente de las clases concretas

### Beneficios en TecnoTaller

| Escenario | Beneficio |
|-----------|-----------|
| Orden de garantía | Clone con 1 línea, cambie solo la descripción |
| Cliente frecuente | Reutilice datos del dispositivo automáticamente |
| Múltiples problemas | Clone y modifique descripción para cada problema |
| Testing | Cree objetos de prueba fácilmente |

---

## 📝 Código ANTES (sin Prototype)

```typescript
// src/modules/work-orders/work-orders.types.ts

export class WorkOrder {
  private constructor(
    readonly id: string,
    readonly guideNumber: string,
    readonly customerId: string | null,
    readonly technicianId: string | null,
    readonly deviceBrand: string,
    readonly deviceModel: string,
    readonly deviceSerial: string,
    readonly problemDescription: string,
    readonly accessories: string | null,
    readonly scheduledTime: string | null,
    readonly assignedTime: string | null,
    private _currentStatus: OrderStatus,
    readonly createdAt: string,
    readonly appointmentId: string | null,
  ) {}

  static fromRow(row: WorkOrderRow): WorkOrder {
    return new WorkOrder(
      row.id,
      row.guide_number,
      row.customer_id,
      row.technician_id,
      row.device_brand,
      row.device_model,
      row.device_serial,
      row.problem_description,
      row.accessories,
      row.scheduled_time,
      row.assigned_time,
      row.current_status,
      row.created_at,
      row.appointment_id,
    );
  }

  get currentStatus(): OrderStatus {
    return this._currentStatus;
  }

  canTransitionTo(next: OrderStatus): boolean {
    return STATUS_TRANSITIONS[this._currentStatus].includes(next);
  }

  transitionTo(next: OrderStatus): void {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Transición inválida: ${this._currentStatus} -> ${next}`);
    }
    this._currentStatus = next;
  }

  toJSON() {
    return {
      id: this.id,
      guideNumber: this.guideNumber,
      customerId: this.customerId,
      technicianId: this.technicianId,
      deviceBrand: this.deviceBrand,
      deviceModel: this.deviceModel,
      deviceSerial: this.deviceSerial,
      problemDescription: this.problemDescription,
      accessories: this.accessories,
      scheduledTime: this.scheduledTime,
      assignedTime: this.assignedTime,
      currentStatus: this._currentStatus,
      createdAt: this.createdAt,
      appointmentId: this.appointmentId,
    };
  }
}
```

### ❌ Problemas del código anterior:

1. **No hay forma de clonar** una orden existente
2. **Código repetitivo** al crear órdenes similares
3. **Propenso a errores** al olvidar campos
4. **Difícil mantenimiento** si se agregan nuevos campos

---

## 📝 Código DESPUÉS (con Prototype)

```typescript
// src/modules/work-orders/work-orders.types.ts

/**
 * PATRÓN PROTOTYPE
 * Interfaz que define el contrato para objetos clonables.
 */
export interface IPrototype<T> {
  clone(): T;
}

export class WorkOrder implements IPrototype<WorkOrder> {
  private constructor(
    readonly id: string,
    readonly guideNumber: string,
    readonly customerId: string | null,
    readonly technicianId: string | null,
    readonly deviceBrand: string,
    readonly deviceModel: string,
    readonly deviceSerial: string,
    readonly problemDescription: string,
    readonly accessories: string | null,
    readonly scheduledTime: string | null,
    readonly assignedTime: string | null,
    private _currentStatus: OrderStatus,
    readonly createdAt: string,
    readonly appointmentId: string | null,
  ) {}

  static fromRow(row: WorkOrderRow): WorkOrder {
    return new WorkOrder(
      row.id,
      row.guide_number,
      row.customer_id,
      row.technician_id,
      row.device_brand,
      row.device_model,
      row.device_serial,
      row.problem_description,
      row.accessories,
      row.scheduled_time,
      row.assigned_time,
      row.current_status,
      row.created_at,
      row.appointment_id,
    );
  }

  /**
   * PATRÓN PROTOTYPE: Clona la orden de servicio.
   * Crea una copia con IDs vacíos pero mantiene datos del dispositivo.
   */
  clone(): WorkOrder {
    return new WorkOrder(
      '',                          // ID vacío (se generará al persistir)
      '',                          // guideNumber vacío (se generará al persistir)
      this.customerId,             // Mismo cliente
      null,                        // Sin técnico asignado
      this.deviceBrand,            // Misma marca
      this.deviceModel,            // Mismo modelo
      this.deviceSerial,           // Mismo serial
      this.problemDescription,     // Misma descripción
      this.accessories,            // Mismos accesorios
      null,                        // Sin tiempo programado
      null,                        // Sin tiempo asignado
      'PENDIENTE',                 // Estado inicial
      new Date().toISOString(),    // Nueva fecha
      null,                        // Sin cita asociada
    );
  }

  /**
   * Clona la orden con modificaciones específicas.
   */
  cloneWith(overrides: Partial<{
    problemDescription: string;
    accessories: string | null;
    customerId: string | null;
    technicianId: string | null;
  }>): WorkOrder {
    return new WorkOrder(
      '',
      '',
      overrides.customerId ?? this.customerId,
      overrides.technicianId ?? null,
      this.deviceBrand,
      this.deviceModel,
      this.deviceSerial,
      overrides.problemDescription ?? this.problemDescription,
      overrides.accessories ?? this.accessories,
      null,
      null,
      'PENDIENTE',
      new Date().toISOString(),
      null,
    );
  }

  /**
   * Convierte el clon a input para persistir.
   */
  toCreateInput(): CreateWorkOrderInput {
    return {
      customerId: this.customerId,
      technicianId: this.technicianId,
      deviceBrand: this.deviceBrand,
      deviceModel: this.deviceModel,
      deviceSerial: this.deviceSerial,
      problemDescription: this.problemDescription,
      accessories: this.accessories ?? undefined,
      scheduledTime: this.scheduledTime,
    };
  }

  // ... resto de métodos igual
}
```

### ✅ Mejoras del código con Prototype:

1. **Clonación en 1 línea**: `order.clone()` o `order.cloneWith({...})`
2. **Código limpio y mantenible**: Toda la lógica de clonación está encapsulada
3. **Tipado fuerte**: TypeScript garantiza que no se olviden campos
4. **Extensible**: Fácil agregar nuevos campos sin romper el código existente

---

## 🔄 Ejemplo de Uso

```typescript
// En el servicio
async duplicateOrder(originalOrderId: string, newProblem?: string): Promise<WorkOrder> {
  const original = await this.getById(originalOrderId);
  
  // ✅ PATRÓN PROTOTYPE: Clonación simple
  const cloned = newProblem 
    ? original.cloneWith({ problemDescription: newProblem })
    : original.clone();
  
  return this.create(cloned.toCreateInput(), 'PENDIENTE');
}
```

### Endpoint disponible

```
POST /api/v1/work-orders/:id/duplicate
Body: { "problemDescription": "Nuevo problema (opcional)" }
```

---

## 📊 Diagramas

### Diagrama ANTES (sin Prototype)
Ver archivo: `diagrama_prototype_ANTES.puml`

### Diagrama DESPUÉS (con Prototype)
Ver archivo: `diagrama_prototype_DESPUES.puml`

Para generar las imágenes, usar PlantUML:
- Online: https://www.plantuml.com/plantuml/uml/
- VS Code: Extensión "PlantUML"

---

## 📚 Referencias

- **GoF (Gang of Four)**: Design Patterns: Elements of Reusable Object-Oriented Software
- **Patrón Prototype**: Capítulo sobre patrones creacionales
- **Refactoring Guru**: https://refactoring.guru/design-patterns/prototype
