# Diagrama C4 - Arquitectura de Software - TechnoTaller

## 📐 Introducción

Este documento describe la **Arquitectura de Software** de TechnoTaller usando el **Modelo C4**, un estándar de visualización de arquitectura que incluye 4 niveles de detalle progresivo:

- **Nivel 1 (Contexto)**: Visión de alto nivel del sistema y actores externos
- **Nivel 2 (Contenedores)**: Componentes principales y tecnologías
- **Nivel 3 (Componentes)**: Arquitectura interna de módulos (opcional - incluido para Work Orders)
- **Nivel 4 (Código)**: Implementación específica (fuera de alcance)

---

## 🎯 Objetivo

Proporcionar una visión clara y escalable de cómo está construida la arquitectura del sistema TechnoTaller, facilitando la comunicación entre stakeholders técnicos y no técnicos.

---

## 📊 NIVEL 1: CONTEXTO DEL SISTEMA

### Descripción General

El **Nivel 1 (Contexto)** muestra el sistema como una "caja negra" y su interacción con actores externos.

```
┌─────────────────────────────────────────────────────────────┐
│                    MUNDO EXTERIOR                           │
│                                                              │
│  👤 Cliente         👨‍🔧 Técnico         📋 Administrador      │
│      │                  │                    │              │
│      └──────────────────┼────────────────────┘              │
│                         │                                   │
│                    [Interactúa]                             │
│                         ▼                                   │
│  ┌────────────────────────────────────────────────────┐   │
│  │         TechnoTaller Backend System                │   │
│  │   (Gestión de Taller de Reparación Electrónica)   │   │
│  └────────────────────────────────────────────────────┘   │
│        │                │                      │           │
│        └────────────────┼──────────────────────┘           │
│                         │                                   │
│              ┌──────────┼──────────┐                       │
│              ▼          ▼          ▼                       │
│         📧 Email    📱 SMS     🔔 Push                     │
│         Service    Service    Service                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Actores

| Actor | Rol | Interacciones |
|-------|-----|---------------|
| **Cliente** | Usuario final que solicita servicios | Agenda citas, consulta estado, ve garantías |
| **Técnico** | Especialista que ejecuta reparaciones | Recibe órdenes, actualiza estado, sube fotos |
| **Administrador** | Gestor del sistema | Crea órdenes, asigna técnicos, genera reportes |

### Sistemas Externos

| Sistema | Propósito | Proveedor |
|---------|----------|-----------|
| **Email Service** | Envía notificaciones por correo | SendGrid / Resend |
| **SMS Service** | Envía recordatorios por SMS | Twilio / Vonage |
| **Push Service** | Envía notificaciones en tiempo real | Firebase Cloud Messaging |

---

## 🏗️ NIVEL 2: CONTENEDORES DEL SISTEMA

### Descripción General

El **Nivel 2 (Contenedores)** descompone el sistema en componentes principales (típicamente desplegables de forma independiente).

```
┌──────────────────────────────────────────────────────────────────┐
│                    TechnoTaller Backend                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    REST API                             │   │
│  │  (Node.js + Express + TypeScript)                       │   │
│  │  - Rutas de órdenes, citas, inventario, técnicos       │   │
│  │  - Controladores y validadores                         │   │
│  │  - Lógica de negocio                                   │   │
│  │  - Autenticación/Autorización                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │             │             │              │            │
│         ▼             ▼             ▼              ▼            │
│  ┌─────────────┬──────────────┬─────────────┬──────────────┐   │
│  │    Auth     │   Database   │  Realtime   │   Storage    │   │
│  │  (Supabase  │  (PostgreSQL │  (Supabase  │  (Supabase   │   │
│  │   Auth)     │  + Supabase) │  Realtime)  │  Storage)    │   │
│  │             │              │             │              │   │
│  │ Valida JWT  │ Almacena:    │ WebSocket   │ Fotos de     │   │
│  │ Gestiona    │ - Órdenes    │ conexiones  │ reparación   │   │
│  │ permisos    │ - Citas      │ Actualiza   │ Documentos   │   │
│  │             │ - Técnicos   │ estado en   │              │   │
│  │             │ - Clientes   │ tiempo real │              │   │
│  │             │ - Inventario │             │              │   │
│  │             │ - Auditoría  │             │              │   │
│  └─────────────┴──────────────┴─────────────┴──────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Contenedores Identificados

#### 1. **REST API** (Node.js + Express)
- **Propósito**: Punto de entrada principal del sistema
- **Responsabilidades**:
  - Procesar requests HTTP (GET, POST, PATCH, DELETE)
  - Validar entrada de datos
  - Ejecutar lógica de negocio
  - Devolver respuestas JSON
  - Gestionar autenticación/autorización
- **Tecnología**: Node.js 18+, Express, TypeScript
- **Endpoint**: `http://api.tecnotaller.local`

#### 2. **Auth Service** (Supabase Auth)
- **Propósito**: Gestionar identidad y autenticación
- **Responsabilidades**:
  - Registro de usuarios
  - Login/Logout
  - Validación de tokens JWT
  - Gestión de sesiones
  - Control de acceso por rol (Cliente, Técnico, Admin)
- **Tecnología**: Supabase Authentication (OAuth2 + JWT)
- **Proveedores soportados**: Email/Password, Google, GitHub

#### 3. **Base de Datos** (PostgreSQL + Supabase)
- **Propósito**: Persistencia de datos
- **Almacena**:
  - 📋 Órdenes de trabajo (estados, historial, fotos)
  - 📅 Citas (fecha, hora, status)
  - 👤 Clientes (contacto, historial)
  - 👨‍🔧 Técnicos (especialidades, disponibilidad)
  - 📦 Inventario (productos, piezas, movimientos)
  - 🔒 Auditoría (cambios, quién, cuándo)
  - 🛡️ Garantías
  - 📊 Reportes
- **Tecnología**: PostgreSQL 14+, Supabase (PaaS)
- **Features**: RLS (Row Level Security), Triggers, Full-Text Search

#### 4. **Realtime Engine** (Supabase Realtime)
- **Propósito**: Actualizaciones en tiempo real
- **Responsabilidades**:
  - WebSocket conexiones bidireccionales
  - Emite eventos cuando cambian estados
  - Sincronización en tiempo real
  - Notificaciones automáticas a clientes conectados
- **Tecnología**: Supabase Realtime (PostgreSQL Pub/Sub)
- **Uso**: Técnico ve actualización de OT inmediatamente

#### 5. **File Storage** (Supabase Storage)
- **Propósito**: Almacenamiento de archivos
- **Almacena**:
  - 📷 Fotos de reparación (antes/después)
  - 📄 Documentos (presupuestos, facturas)
  - 🖼️ Evidencia fotográfica
- **Tecnología**: Supabase Storage (S3-compatible)
- **Seguridad**: RLS aplicado a archivos

### Flujo de Datos (Nivel 2)

```
1. Cliente → REST API (Request)
   ↓
2. REST API → Auth Service (Validar Token)
   ↓
3. REST API → Base de Datos (Query/Insert/Update)
   ↓
4. REST API → Realtime Engine (Emitir evento)
   ↓
5. Realtime Engine → Cliente (WebSocket event)
   ↓
6. REST API → File Storage (Guardar foto)
   ↓
7. REST API → External Services (Email/SMS/Push)
```

---

## 🔧 NIVEL 3: COMPONENTES - MÓDULO WORK ORDERS

El **Nivel 3 (Componentes)** muestra la arquitectura interna de un contenedor específico. Se detalla el módulo **Work Orders** por ser el módulo principal/MVP.

### Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REST API - Work Orders Module                     │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │           PRESENTATION LAYER (Controladores)                │   │
│ │                                                               │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  WorkOrder Controller                                  │  │   │
│ │  │  - POST /work-orders (crear)                          │  │   │
│ │  │  - GET /work-orders/:id (obtener)                    │  │   │
│ │  │  - GET /work-orders (listar)                         │  │   │
│ │  │  - PATCH /work-orders/:id/status (cambiar estado)   │  │   │
│ │  │  - POST /work-orders/:id/photo (subir foto)         │  │   │
│ │  │  - Valida entrada (DTO validation)                  │  │   │
│ │  │  - Captura excepciones                              │  │   │
│ │  │  - Formatea respuestas HTTP                         │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ (HTTP Requests)                      │
│                              │                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │        BUSINESS LOGIC LAYER (Servicios)                    │   │
│ │                                                               │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  WorkOrder Service                                     │  │   │
│ │  │  - createWorkOrder(input)                             │  │   │
│ │  │  - getWorkOrder(id)                                  │  │   │
│ │  │  - listWorkOrders(filters)                           │  │   │
│ │  │  - updateStatus(id, newStatus)                       │  │   │
│ │  │  - addPhoto(id, file)                                │  │   │
│ │  │  - Orquesta operaciones                              │  │   │
│ │  │  - Implementa reglas de negocio                      │  │   │
│ │  │  - Maneja excepciones de negocio                     │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ │          │              │              │          │          │   │
│ │          ▼              ▼              ▼          ▼          │   │
│ │  ┌──────────────┬─────────────┬───────────────┬──────────┐  │   │
│ │  │State Machine │  Validator  │Audit Service │ Notifier │  │   │
│ │  │              │             │              │          │  │   │
│ │  │Valida estado │Valida datos │Registra cada │Envía:   │  │   │
│ │  │Transiciones  │de entrada   │cambio        │- Email  │  │   │
│ │  │Reglas:       │Restricciones│Trazabilidad  │- SMS    │  │   │
│ │  │INGRESADO→    │de negocio   │Auditoría     │- Push   │  │   │
│ │  │REPARACION→   │Campos req.  │               │         │  │   │
│ │  │ENTREGADO     │Formato      │               │         │  │   │
│ │  └──────────────┴─────────────┴───────────────┴──────────┘  │   │
│ │          │                              │                    │   │
│ │          └──────────────┬───────────────┘                    │   │
│ │                         ▼                                    │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │   Auth Middleware                                      │  │   │
│ │  │   - Valida JWT tokens                                 │  │   │
│ │  │   - Verifica permisos por rol                         │  │   │
│ │  │   - Inyecta usuario en contexto                       │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ │                         ▼                                    │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │   Error Handler                                        │  │   │
│ │  │   - Centraliza manejo de errores                      │  │   │
│ │  │   - Formatea respuestas de error                      │  │   │
│ │  │   - Registra en logger                                │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ (Operaciones de Datos)               │
│                              │                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │         DATA ACCESS LAYER (Repositorio)                     │   │
│ │                                                               │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  WorkOrder Repository                                 │  │   │
│ │  │  - create(data): WorkOrder                           │  │   │
│ │  │  - findById(id): WorkOrder | null                    │  │   │
│ │  │  - list(filters): WorkOrder[]                        │  │   │
│ │  │  - update(id, data): WorkOrder                       │  │   │
│ │  │  - findByGuideNumber(guide): WorkOrder | null        │  │   │
│ │  │  - addPhoto(id, photo): void                         │  │   │
│ │  │  - Implementa patrón Repository                      │  │   │
│ │  │  - Abstrae lógica de persistencia                    │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ │                         │                                    │   │
│ │                         ▼                                    │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  Entity Mapper (Factory Pattern)                       │  │   │
│ │  │  - Convierte: WorkOrderRow → WorkOrder (object)      │  │   │
│ │  │  - Convierte: WorkOrder → WorkOrderRow (database)    │  │   │
│ │  │  - Implementa fromRow() static factory                │  │   │
│ │  │  - Transforma datos entre capas                       │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ │                         │                                    │   │
│ │                         ▼                                    │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  Logger                                                │  │   │
│ │  │  - Winston / Pino                                     │  │   │
│ │  │  - Registra operaciones CRUD                          │  │   │
│ │  │  - Registra errores                                  │  │   │
│ │  │  - Registra performance metrics                       │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                      │
│                              │ (SQL Queries)                        │
│                              │                                      │
│ ┌──────────────────────────────────────────────────────────────┐   │
│ │          PERSISTENCE LAYER (Base de Datos)                   │   │
│ │                                                               │   │
│ │  ┌────────────────────────────────────────────────────────┐  │   │
│ │  │  PostgreSQL (Supabase)                                │  │   │
│ │  │  Tables:                                              │  │   │
│ │  │  - work_orders (id, customer_id, technician_id, ...) │  │   │
│ │  │  - work_order_photos (id, work_order_id, url, ...)  │  │   │
│ │  │  - work_order_history (id, work_order_id, status, ...) │  │   │
│ │  │  - Constraints, Indexes, Triggers                    │  │   │
│ │  │  - RLS policies por rol                              │  │   │
│ │  └────────────────────────────────────────────────────────┘  │   │
│ └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Componentes del Módulo Work Orders

#### 1. **WorkOrder Controller** (Presentation Layer)
```typescript
// Ubicación: src/modules/work-orders/work-orders.controller.ts

Responsabilidades:
✅ POST /work-orders → create()
✅ GET /work-orders/:id → getById()
✅ GET /work-orders → list()
✅ PATCH /work-orders/:id/status → updateStatus()
✅ POST /work-orders/:id/photo → addPhoto()
✅ GET /work-orders/:id/history → getHistory()

Validaciones:
- DTO validation (class-validator)
- Auth middleware
- Error handling
```

#### 2. **WorkOrder Service** (Business Logic Layer)
```typescript
// Ubicación: src/modules/work-orders/work-orders.service.ts

Responsabilidades:
✅ createWorkOrder(input) - Crear nueva OT
✅ getWorkOrder(id) - Obtener una OT
✅ listWorkOrders(filters) - Listar OTs
✅ updateStatus(id, newStatus) - Cambiar estado
✅ addPhoto(id, photo) - Agregar foto
✅ getHistory(id) - Ver historial

Orquesta:
- State Machine (valida transiciones)
- Validator (valida datos)
- Repository (persiste)
- Audit Service (registra cambios)
- Notifier (envía notificaciones)
```

#### 3. **State Machine** (Business Logic)
```typescript
// Estados válidos de una OT:
INGRESADO        (inicial - cliente llega al taller)
    ↓
EN_PROGRESO      (técnico inicia diagnosis)
    ↓
DIAGNOSTICADO    (problema identificado)
    ↓
PRESUPUESTO      (propuesta de precio)
    ↓
APROBADO         (cliente aprueba)
    ↓
EN_REPARACION    (técnico repara)
    ↓
ENTREGADO        (final - cliente retira)

Reglas:
✅ Solo Admin puede crear (INGRESADO)
✅ Solo Técnico puede cambiar a EN_PROGRESO
✅ No puede ir de DIAGNOSTICADO a EN_PROGRESO (marcha atrás)
✅ Si pasan X días, auto-cancel
```

#### 4. **Validator** (Business Logic)
```typescript
// Validaciones de entrada

create():
✅ customer_id existe
✅ technician_id existe (si se asigna)
✅ description no vacío
✅ initial_diagnostic válido

updateStatus():
✅ OT existe
✅ Usuario tiene permisos (Tech o Admin)
✅ Transición de estado válida
✅ Foto requerida para ciertos estados
```

#### 5. **Audit Service** (Cross-Cutting Concern)
```typescript
// Registra cada cambio

Eventos registrados:
✅ CREATE: Quién creó, cuándo, datos iniciales
✅ UPDATE_STATUS: Quién cambió, de→a, cuándo
✅ ADD_PHOTO: Quién subió, cuándo, URL
✅ DELETE: Quién eliminó, cuándo, soft-delete

Propósito: Trazabilidad completa para auditoría
```

#### 6. **Notifier Service** (Cross-Cutting Concern - Strategy Pattern)
```typescript
// Interfaz INotifier

Implementaciones:
✅ EmailNotifier - SendGrid
✅ SMSNotifier - Twilio
✅ PushNotifier - Firebase

Eventos que notifican:
✅ OT creada → cliente + técnico
✅ Estado cambio a EN_PROGRESO → cliente
✅ Estado cambio a ENTREGADO → cliente
✅ Nueva OT asignada → técnico
```

#### 7. **WorkOrder Repository** (Data Access Layer)
```typescript
// Ubicación: src/modules/work-orders/work-orders.repository.ts

Métodos CRUD:
✅ create(data): Promise<WorkOrderRow>
✅ findById(id): Promise<WorkOrderRow | null>
✅ findByGuideNumber(guide): Promise<WorkOrderRow | null>
✅ list(filters): Promise<WorkOrderRow[]>
✅ update(id, data): Promise<WorkOrderRow>
✅ setStatus(id, status): Promise<WorkOrderRow>
✅ listHistory(id): Promise<WorkOrderHistoryRow[]>
✅ addPhoto(id, photo): Promise<void>
✅ registerExit(id, exitDate): Promise<void>

Patrón: Repository Pattern
- Abstrae lógica de BD
- Implementa CRUD
- Maneja transacciones
```

#### 8. **Entity Mapper** (Data Access Layer - Factory Pattern)
```typescript
// Ubícación: src/modules/work-orders/work-orders.types.ts

Conversión bidireccional:
✅ WorkOrderRow (base de datos) ↔ WorkOrder (objeto dominio)

Factory method:
✅ static fromRow(row: WorkOrderRow): WorkOrder
   Convierte filas de BD a objetos TypeScript
   Inicializa métodos de dominio
   Valida integridad de datos
```

### Flujo de Datos (Nivel 3) - Ejemplo: Crear Orden

```
1. Cliente HTTP Request
   ↓
2. WorkOrder Controller.create(req)
   ├─ Valida DTO
   ├─ Extrae usuario de token
   └─ Llama service.createWorkOrder(input)
   ↓
3. WorkOrder Service.createWorkOrder()
   ├─ Validator.validateCreateInput()
   ├─ Repository.create(data) → id
   ├─ AuditService.record('CREATE', ...)
   ├─ Notifier.notify('ORDER_CREATED', ...)
   └─ Retorna WorkOrder object
   ↓
4. WorkOrder Repository.create()
   ├─ EntityMapper.toRow(workOrder)
   ├─ Ejecuta INSERT en Base de Datos
   ├─ Logger.info('Order created')
   └─ Retorna WorkOrderRow
   ↓
5. Base de Datos (PostgreSQL + Supabase)
   ├─ INSERT en tabla work_orders
   ├─ Trigger: INSERT en work_order_history
   ├─ RLS: Verifica permisos
   └─ Retorna registro creado
   ↓
6. Realtime Engine (WebSocket)
   ├─ Emite evento: 'work_order:created'
   ├─ Clientes conectados reciben notificación
   ↓
7. Notifier Service
   ├─ Envía EMAIL al cliente
   ├─ Envía SMS al técnico
   ├─ Envía PUSH notification
   ↓
8. HTTP Response 201 Created
   ├─ Status: 201
   ├─ Body: { id, customer_id, status: 'INGRESADO', ... }
   └─ Headers: { Location: /work-orders/{id} }
```

---

## 📋 PATRONES DE DISEÑO IMPLEMENTADOS

### Nivel 2 (Contenedores)
- **Separation of Concerns**: Cada contenedor tiene responsabilidad única
- **Layered Architecture**: API, Auth, DB, Storage separados
- **Event-Driven**: Realtime Engine con WebSockets

### Nivel 3 (Componentes)
- **MVC Pattern**: Controller → Service → Repository
- **Repository Pattern**: Abstracción de persistencia
- **Factory Pattern**: EntityMapper.fromRow()
- **Strategy Pattern**: INotifier (Email, SMS, Push)
- **Observer Pattern**: AuditService
- **State Pattern**: State Machine con transiciones validadas
- **Middleware Pattern**: Auth, Error Handler, Logger

---

## 🛡️ SEGURIDAD POR CAPA

### Nivel 2
- ✅ Auth Service: Valida identidad
- ✅ RLS en Base de Datos: Control de acceso
- ✅ HTTPS: Comunicación encriptada

### Nivel 3
- ✅ Auth Middleware: JWT validation en cada request
- ✅ Validator: Valida entrada antes de procesar
- ✅ RLS Policies: Filtra datos por rol en BD
- ✅ Audit Service: Registra todo para investigación

---

## 📊 TECNOLOGÍAS POR COMPONENTE

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| REST API | Node.js + Express | Rápido, escalable, ecosistema rico |
| Auth | Supabase Auth | JWT, OAuth2, builtin |
| BD | PostgreSQL | Relacional, seguridad, ACID |
| Realtime | Supabase Realtime | WebSocket, integrado con BD |
| Storage | Supabase Storage | S3-compatible, RLS |
| Logger | Winston/Pino | Production-ready, structured logging |
| Validation | class-validator | Decorators, DTO validation |
| Error Handling | Custom Middleware | Respuestas estandarizadas |

---

## 📈 ESCALABILIDAD

### Nivel 2 (Contenedores)
- ✅ API: Stateless, puede escalar horizontalmente
- ✅ BD: Conexión pool, replicación disponible
- ✅ Storage: S3-compatible, almacenamiento ilimitado
- ✅ Realtime: Pub/Sub de PostgreSQL, escalable

### Nivel 3 (Componentes)
- ✅ Service: No mantiene estado
- ✅ Repository: Abstracción permite cambiar BD
- ✅ Logger: Puede enviar a servicio centralizado
- ✅ Notifier: Strategy pattern permite agregar más canales

---

## 🧪 TESTABILIDAD

### Nivel 3
- ✅ **Controller**: Mockeamos Service
- ✅ **Service**: Mockeamos Repository + externos (Notifier, Audit)
- ✅ **Repository**: Tests de integración con BD real
- ✅ **Mapper**: Tests unitarios
- ✅ **State Machine**: Tests de transiciones

```
Service Unit Test: 100% cobertura
  ├─ Mock Repository
  ├─ Mock Notifier
  ├─ Mock Audit
  └─ Test lógica de negocio

Repository Integration Test: Con BD real
  ├─ CREATE
  ├─ READ
  ├─ UPDATE
  ├─ DELETE
  └─ Transacciones
```

---

## 📁 ESTRUCTURA DE ARCHIVOS GENERADOS

```
tecnotaller-backend/
├── diagrama_c4_l1_l2.puml                    (PlantUML L1 + L2)
├── diagrama_c4_l3_workorders.puml            (PlantUML L3 - Work Orders)
├── DIAGRAMA_C4_ARQUITECTURA.md               (Este documento)
├── COMO_VER_DIAGRAMA_C4.md                   (Instrucciones visualización)
└── DIAGRAMA_C4_COMPLETADO.md                 (Resumen entrega)
```

---

## 🎯 Cumplimiento de Requisitos

✅ **Nivel 1 (Contexto) - Obligatorio**
- Mostrado en diagrama_c4_l1_l2.puml
- 3 actores (Cliente, Técnico, Admin)
- 3 sistemas externos (Email, SMS, Push)
- Interacciones claras

✅ **Nivel 2 (Contenedores) - Obligatorio**
- Mostrado en diagrama_c4_l1_l2.puml
- 5 contenedores (API, Auth, BD, Realtime, Storage)
- Tecnologías especificadas
- Flujos de datos mapeados

✅ **Nivel 3 (Componentes) - Opcional para MVP**
- Mostrado en diagrama_c4_l3_workorders.puml
- 8 componentes en Work Orders
- Patrones de diseño implementados
- Responsabilidades claras
- Flujos detallados

---

## 📞 Referencias

- **C4 Model**: https://c4model.com/
- **PlantUML C4**: https://plantuml.com/c4-diagram
- **Supabase Docs**: https://supabase.com/docs
- **Architecture Patterns**: https://martinfowler.com/architecture/

---

¡**DIAGRAMA C4 COMPLETADO!** 🎉

*Generado: Agosto 2026*  
*Estado: ✅ Listo para visualizar*

