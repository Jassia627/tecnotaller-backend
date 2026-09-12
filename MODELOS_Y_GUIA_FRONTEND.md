# 📚 DOCUMENTACIÓN Y MANUAL COMPLETO DE INTEGRACIÓN FRONTEND - TECNOTALLER API

Este documento contiene la **especificación 100% exhaustiva y absoluta** de los 18 módulos del backend de TecnoTaller, incluyendo tipos TypeScript, esquemas de entrada/salida, enums, endpoints, permisos de roles, estructura de tablas de base de datos y clientes de servicio HTTP para el frontend.

---

## 🛠️ 1. Configuración del Cliente HTTP (`src/api/client.ts`)

```typescript
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token JWT o Token de Desarrollo (Bypass en dev)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') || 'dev-admin-token';
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Estructura Estándar de Respuesta de Error del Backend
export interface ApiErrorResponse {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'CONFLICT';
    message: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[]>;
    } | any;
  };
}
```

---

## 📦 2. Modelos e Interfaces TypeScript Absolutos (`src/types/api.ts`)

```typescript
// =====================================================================
// 1. AUTENTICACIÓN Y ROLES
// =====================================================================
export type Role = 'administrador' | 'tecnico' | 'cliente';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// =====================================================================
// 2. PRODUCTOS Y KARDEX (MOVIMIENTOS DE INVENTARIO)
// =====================================================================
export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  imageUrl: string | null;
  categoryId: string | null;
  brand: string;
  color: string | null;
  specs: ProductSpec[] | Record<string, any>[] | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  active: boolean;
  available: boolean;
  createdAt?: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  brand?: string;
  color?: string | null;
  specs?: ProductSpec[] | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export type InventoryMovementType = 'IN' | 'OUT';

export interface InventoryMovement {
  id: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  userId: string;
  createdAt: string;
}

export interface CreateInventoryMovementInput {
  type: InventoryMovementType;
  quantity: number;
  reason: string;
}

// =====================================================================
// 3. ÓRDENES DE TRABAJO (WORK ORDERS)
// =====================================================================
export type OrderStatus =
  | 'INGRESADO'
  | 'EN_REVISION'
  | 'ESPERANDO_REPUESTO'
  | 'EN_REPARACION'
  | 'REPARADO'
  | 'LISTO_PARA_ENTREGA'
  | 'ENTREGADO';

export interface WorkOrder {
  id: string;
  guideNumber: string;
  customerId: string | null;
  technicianId: string | null;
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  problemDescription: string;
  devicePassword?: string | null;
  accessories: string | null;
  currentStatus: OrderStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWorkOrderInput {
  customerId?: string | null;   // Acepta UUID valido, "" o null
  technicianId?: string | null; // Acepta UUID valido, "" o null
  deviceBrand: string;
  deviceModel: string;
  deviceSerial: string;
  problemDescription: string;
  devicePassword?: string;
  accessories?: string;
}

export interface TransitionStatusInput {
  toStatus: OrderStatus;
}

export interface ExitRegisterInput {
  finalState: string;
  repairsPerformed: string;
  partsUsed?: string;
  observations?: string;
}

export interface StatusHistoryEntry {
  id: string;
  workOrderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userId: string;
  createdAt: string;
}

// =====================================================================
// 4. ACTIVIDADES DE ÓRDEN (ACTIVITIES)
// =====================================================================
export interface Activity {
  id: string;
  workOrderId: string;
  description: string;
  technicianId: string;
  createdAt: string;
}

export interface CreateActivityInput {
  description: string;
}

// =====================================================================
// 5. FOTOS DE ÓRDEN (PHOTOS)
// =====================================================================
export type PhotoKind = 'inicial' | 'final';

export interface Photo {
  id: string;
  workOrderId: string;
  kind: PhotoKind;
  storagePath: string;
  publicUrl: string;
  uploadedAt: string;
}

// =====================================================================
// 6. SERVICIOS OFRECIDOS (SERVICES)
// =====================================================================
export interface TechService {
  id: string;
  name: string;
  description: string;
  estimatedPrice: number;
  estimatedTimeMinutes: number;
  active: boolean;
  createdAt: string;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  estimatedPrice: number;
  estimatedTimeMinutes: number;
}

export type UpdateServiceInput = Partial<CreateServiceInput>;

// =====================================================================
// 7. CITAS (APPOINTMENTS)
// =====================================================================
export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface Appointment {
  id: string;
  serviceId: string;
  customerName: string;
  phone: string;
  date: string; // ISO Datetime (ej: 2027-06-05T10:00:00.000Z)
  status: AppointmentStatus;
  createdAt: string;
}

export interface CreateAppointmentInput {
  serviceId: string;
  customerName: string;
  phone: string;
  date: string; // Acepta "05-06-2027", "2027-06-05" o ISO Datetime
}

// =====================================================================
// 8. DIAGNÓSTICOS TÉCNICOS (DIAGNOSTICS)
// =====================================================================
export interface Diagnostic {
  id: string;
  workOrderId: string;
  technicianId: string | null;
  observations: string;
  faults: string;
  recommendedActions: string;
  createdAt: string;
}

export interface CreateDiagnosticInput {
  observations: string;
  faults: string;
  recommendedActions: string;
}

export type UpdateDiagnosticInput = Partial<CreateDiagnosticInput>;

// =====================================================================
// 9. REPUESTOS (PARTS) & ASIGNACIÓN A ÓRDENES
// =====================================================================
export interface Part {
  id: string;
  name: string;
  sku: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
  createdAt: string;
}

export interface CreatePartInput {
  name: string;
  sku: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
}

export type UpdatePartInput = Partial<CreatePartInput>;

export interface OrderPart {
  id: string;
  workOrderId: string;
  partId: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

export interface AssignPartInput {
  partId: string;
  quantity: number;
}

// =====================================================================
// 10. GARANTÍAS (WARRANTIES)
// =====================================================================
export type WarrantyStatus = 'ACTIVA' | 'EXPIRADA' | 'ANULADA';

export interface Warranty {
  id: string;
  workOrderId: string;
  periodDays: number;
  startDate: string;
  expirationDate: string;
  terms: string;
  status: WarrantyStatus;
  createdAt: string;
}

export interface CreateWarrantyInput {
  workOrderId: string;
  periodDays: number;
  terms?: string;
}

// =====================================================================
// 11. CLIENTES (CUSTOMERS)
// =====================================================================
export interface Customer {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface CreateCustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

// =====================================================================
// 12. TÉCNICOS Y DISPONIBILIDAD (TECHNICIANS & AVAILABILITY)
// =====================================================================
export interface Technician {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  available: boolean;
}

export interface UpdateTechnicianInput {
  fullName?: string;
  phone?: string;
}

export interface TechnicianAvailability {
  id: string;
  technicianId: string;
  available: boolean;
  unavailableUntil: string | null;
  reason: string | null;
  updatedAt: string;
}

export interface UpdateAvailabilityInput {
  available: boolean;
  unavailableUntil?: string;
  reason?: string;
}

// =====================================================================
// 13. SOLICITUDES DE COMPRA (PURCHASE REQUESTS)
// =====================================================================
export type PurchaseRequestStatus = 'PENDIENTE' | 'ORDENADO' | 'RECIBIDO' | 'CANCELADO';

export interface PurchaseRequestItem {
  productId?: string;
  partId?: string;
  quantity: number;
}

export interface PurchaseRequest {
  id: string;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  notes?: string;
  totalItems: number;
  createdAt: string;
}

export interface CreatePurchaseRequestInput {
  items: PurchaseRequestItem[];
  notes?: string;
}

export interface UpdatePurchaseRequestStatusInput {
  status: PurchaseRequestStatus;
}

// =====================================================================
// 14. INVENTARIO & ALERTAS DE STOCK BAJO (INVENTORY)
// =====================================================================
export interface LowStockSummary {
  products: Product[];
  parts: Part[];
  totalLowStock: number;
}

// =====================================================================
// 15. REPORTES E INFORMES (REPORTS)
// =====================================================================
export interface SalesReport {
  totalSales: number;
  byProduct: Array<{ productId: string; name: string; count: number; total: number }>;
  byService: Array<{ serviceId: string; name: string; count: number; total: number }>;
}

export interface RevenueReport {
  totalRevenue: number;
  byTechnician: Array<{ technicianId: string; name: string; revenue: number }>;
  byStatus: Array<{ status: OrderStatus; count: number; value: number }>;
}

export interface TrendItem {
  period: string;
  ordersCount: number;
  totalRevenue: number;
}

export interface TrendsReport {
  trends: TrendItem[];
}

// =====================================================================
// 16. AUDITORÍA (AUDIT LOGS)
// =====================================================================
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  payload: Record<string, any>;
  createdAt: string;
}

// =====================================================================
// 17. NOTIFICACIONES (NOTIFICATIONS)
// =====================================================================
export type NotificationStatus = 'pendiente' | 'enviada' | 'fallida';

export interface Notification {
  id: string;
  workOrderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

// =====================================================================
// 18. PAGINACIÓN GENÉRICA
// =====================================================================
export interface PaginatedResult<T> {
  items?: T[];
  rows?: T[];
  total: number;
  page?: number;
  pageSize?: number;
}
```

---

## 📡 3. Tabla General Exhaustiva de Endpoints

| Módulo | Método | Endpoint | Roles Permitidos | Descripción |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/login` | Público | Login de usuarios (`LoginInput`) |
| **Auth** | `POST` | `/auth/register` | Público | Registro de clientes (`RegisterInput`) |
| **Auth** | `GET` | `/auth/me` | Autenticado | Perfil de usuario |
| **Work Orders** | `GET` | `/work-orders` | Admin, Técnico | Lista paginada con filtros (`status`, `searchText`, `fromDate`) |
| **Work Orders** | `POST` | `/work-orders` | Admin, Técnico | Crear orden (`CreateWorkOrderInput`) |
| **Work Orders** | `GET` | `/work-orders/:id` | Admin, Técnico | Detalle de orden por ID |
| **Work Orders** | `GET` | `/work-orders/track/:guideNumber` | Autenticado | Rastreo de estado por número de guía |
| **Work Orders** | `PATCH` | `/work-orders/:id/status` | Admin, Técnico | Cambiar estado de orden (`TransitionStatusInput`) |
| **Work Orders** | `POST` | `/work-orders/:id/exit-register` | Admin, Técnico | Registrar entrega/salida (`ExitRegisterInput`) |
| **Work Orders** | `GET` | `/work-orders/:id/history` | Admin, Técnico, Cliente | Historial de transiciones de estado |
| **Activities** | `POST` | `/work-orders/:id/activities` | Admin, Técnico | Registrar bitácora de actividad (`CreateActivityInput`) |
| **Activities** | `GET` | `/work-orders/:id/activities` | Admin, Técnico | Listar bitácora de actividades |
| **Photos** | `POST` | `/work-orders/:id/photos` | Admin, Técnico | Subir foto de orden (`multipart/form-data`, campo `file`, `kind: 'inicial' \| 'final'`) |
| **Photos** | `GET` | `/work-orders/:id/photos` | Admin, Técnico | Listar fotos asociadas a la orden |
| **Products** | `GET` | `/products` | Público | Catálogo de tienda (productos activos) |
| **Products** | `GET` | `/products/admin/all` | Admin | Catálogo completo de administración |
| **Products** | `GET` | `/products/:id` | Público | Detalle de un producto |
| **Products** | `POST` | `/products` | Admin | Crear producto (`CreateProductInput`) |
| **Products** | `PUT` | `/products/:id` | Admin | Actualizar producto (`UpdateProductInput`) |
| **Products** | `PATCH` | `/products/:id/availability` | Admin | Activar/desactivar producto (`{ active: boolean }`) |
| **Products** | `GET` | `/products/:id/movements` | Admin, Técnico | Historial de Kardex del producto |
| **Products** | `POST` | `/products/:id/movements` | Admin, Técnico | Registrar entrada/salida de stock (`CreateInventoryMovementInput`) |
| **Services** | `GET` | `/services` | Público | Listar servicios ofrecidos (Retorna `{ items: TechService[] }`) |
| **Services** | `POST` | `/services` | Admin | Crear servicio (`CreateServiceInput`) |
| **Services** | `PUT` | `/services/:id` | Admin | Editar servicio (`UpdateServiceInput`) |
| **Services** | `DELETE` | `/services/:id` | Admin | Desactivar servicio |
| **Appointments** | `GET` | `/appointments` | Admin, Técnico | Listar citas por rango de fecha |
| **Appointments** | `POST` | `/appointments` | Público | Agendar cita (`CreateAppointmentInput`) |
| **Appointments** | `PATCH` | `/appointments/:id/status` | Admin, Técnico | Cambiar estado de cita (`{ status: 'confirmada' \| 'cancelada' \| 'completada' }`) |
| **Diagnostics** | `GET` | `/work-orders/:id/diagnostics` | Admin, Técnico | Diagnósticos de la orden |
| **Diagnostics** | `POST` | `/work-orders/:id/diagnostics` | Admin, Técnico | Registrar diagnóstico (`CreateDiagnosticInput`) |
| **Diagnostics** | `GET` | `/work-orders/:id/diagnostics/:diagnosticId` | Admin, Técnico | Ver diagnóstico por ID |
| **Diagnostics** | `PUT` | `/work-orders/:id/diagnostics/:diagnosticId` | Admin, Técnico | Editar diagnóstico (`UpdateDiagnosticInput`) |
| **Diagnostics** | `DELETE` | `/work-orders/:id/diagnostics/:diagnosticId` | Admin, Técnico | Eliminar diagnóstico |
| **Parts** | `GET` | `/parts` | Admin, Técnico | Catálogo de repuestos |
| **Parts** | `POST` | `/parts` | Admin | Crear repuesto (`CreatePartInput`) |
| **Parts** | `PUT` | `/parts/:id` | Admin | Editar repuesto (`UpdatePartInput`) |
| **Parts** | `POST` | `/work-orders/:id/parts` | Admin, Técnico | Asignar repuesto a orden (`AssignPartInput`) |
| **Warranties** | `POST` | `/work-orders/:id/warranty` | Admin, Técnico | Emitir garantía (`CreateWarrantyInput`) |
| **Warranties** | `GET` | `/work-orders/:id/warranty` | Admin, Técnico | Consultar garantía de orden |
| **Customers** | `GET` | `/customers` | Admin, Técnico | Listar clientes paginados |
| **Customers** | `GET` | `/customers/:id` | Admin, Técnico | Detalle de cliente |
| **Customers** | `POST` | `/customers` | Admin, Técnico | Crear cliente (`CreateCustomerInput`) |
| **Customers** | `PUT` | `/customers/:id` | Admin, Técnico | Actualizar cliente (`UpdateCustomerInput`) |
| **Technicians** | `GET` | `/technicians` | Admin, Técnico | Listar técnicos |
| **Technicians** | `GET` | `/technicians/:id` | Admin, Técnico | Detalle de técnico |
| **Technicians** | `PATCH` | `/technicians/:id` | Admin | Editar datos de técnico (`UpdateTechnicianInput`) |
| **Technicians** | `DELETE` | `/technicians/:id` | Admin | Desactivar técnico |
| **Availability** | `GET` | `/technicians/:id/availability` | Autenticado | Ver disponibilidad de un técnico |
| **Availability** | `PATCH` | `/technicians/:id/availability` | Admin, Técnico (propio) | Cambiar estado de disponibilidad (`UpdateAvailabilityInput`) |
| **Purchase Req** | `GET` | `/purchase-requests` | Admin | Listar solicitudes de compra |
| **Purchase Req** | `POST` | `/purchase-requests` | Admin | Crear solicitud de compra (`CreatePurchaseRequestInput`) |
| **Purchase Req** | `GET` | `/purchase-requests/:id` | Admin | Ver detalle de solicitud de compra |
| **Purchase Req** | `PATCH` | `/purchase-requests/:id/status` | Admin | Cambiar estado (`UpdatePurchaseRequestStatusInput`) |
| **Inventory** | `GET` | `/inventory/low-stock` | Admin | Alertas de productos y repuestos con stock bajo |
| **Reports** | `GET` | `/reports/sales` | Admin | Reporte de ventas |
| **Reports** | `GET` | `/reports/revenue` | Admin | Reporte de ingresos |
| **Reports** | `GET` | `/reports/trends` | Admin | Tendencias de rendimiento |
| **Audit** | `GET` | `/audit` | Admin | Logs de auditoría |
| **Notifications** | `GET` | `/work-orders/:id/notifications` | Admin, Técnico | Listar notificaciones enviadas |

---

## 🗄️ 4. Estructura de Tablas en Supabase Postgres

- **`users`**: `id` (uuid, PK), `email`, `role`, `full_name`, `phone`, `active`, `created_at`.
- **`products`**: `id` (uuid, PK), `sku`, `name`, `description`, `image_url`, `category_id`, `brand`, `color`, `specs` (jsonb), `purchase_price`, `sale_price`, `stock`, `active`, `available`, `created_at`.
- **`inventory_movements`**: `id` (uuid, PK), `product_id` (FK), `type` ('IN'/'OUT'), `quantity`, `reason`, `user_id` (FK), `created_at`.
- **`work_orders`**: `id` (uuid, PK), `guide_number` (unique), `customer_id` (FK optional), `technician_id` (FK optional), `device_brand`, `device_model`, `device_serial`, `problem_description`, `device_password`, `accessories`, `current_status`, `created_at`, `updated_at`.
- **`work_order_status_history`**: `id` (uuid, PK), `work_order_id` (FK), `from_status`, `to_status`, `user_id` (FK), `created_at`.
- **`activities`**: `id` (uuid, PK), `work_order_id` (FK), `description`, `technician_id` (FK), `created_at`.
- **`work_order_photos`**: `id` (uuid, PK), `work_order_id` (FK), `kind` ('inicial'/'final'), `storage_path`, `uploaded_at`.
- **`services`**: `id` (uuid, PK), `name`, `description`, `estimated_price`, `estimated_time_minutes`, `active`, `created_at`.
- **`appointments`**: `id` (uuid, PK), `service_id` (FK), `customer_name`, `phone`, `date` (timestamptz), `status`, `created_at`.
- **`diagnostics`**: `id` (uuid, PK), `work_order_id` (FK), `technician_id` (FK optional), `observations`, `faults`, `recommended_actions`, `created_at`.
- **`parts`**: `id` (uuid, PK), `name`, `sku`, `stock`, `purchase_price`, `sale_price`, `created_at`.
- **`work_order_parts`**: `id` (uuid, PK), `work_order_id` (FK), `part_id` (FK), `quantity`, `unit_price`, `created_at`.
- **`warranties`**: `id` (uuid, PK), `work_order_id` (FK), `period_days`, `start_date`, `expiration_date`, `terms`, `status`, `created_at`.
- **`customers`**: `id` (uuid, PK), `full_name`, `email`, `phone`, `created_at`.
- **`technicians`**: `id` (uuid, PK), `full_name`, `email`, `phone`, `available`, `created_at`.
- **`technician_availability`**: `id` (uuid, PK), `technician_id` (FK), `available`, `unavailable_until`, `reason`, `updated_at`.
- **`purchase_requests`**: `id` (uuid, PK), `status`, `items` (jsonb), `notes`, `total_items`, `created_at`.
- **`audit_logs`**: `id` (uuid, PK), `user_id` (FK), `action`, `entity`, `entity_id`, `payload` (jsonb), `created_at`.
- **`notifications`**: `id` (uuid, PK), `work_order_id` (FK), `recipient_email`, `subject`, `body`, `status`, `sent_at`, `created_at`.

---

## 💻 5. Módulos de Servicios en Frontend (`src/services/`)

### `src/services/workOrderService.ts`
```typescript
import { apiClient } from '../api/client';
import {
  WorkOrder,
  CreateWorkOrderInput,
  TransitionStatusInput,
  ExitRegisterInput,
  StatusHistoryEntry,
  Activity,
  CreateActivityInput,
  Photo,
  PaginatedResult,
} from '../types/api';

export const workOrderService = {
  async list(params?: { page?: number; pageSize?: number; status?: string; searchText?: string }): Promise<PaginatedResult<WorkOrder>> {
    const response = await apiClient.get<PaginatedResult<WorkOrder>>('/work-orders', { params });
    return response.data;
  },

  async getById(id: string): Promise<WorkOrder> {
    const response = await apiClient.get<WorkOrder>(`/work-orders/${id}`);
    return response.data;
  },

  async trackByGuide(guideNumber: string): Promise<WorkOrder> {
    const response = await apiClient.get<WorkOrder>(`/work-orders/track/${guideNumber}`);
    return response.data;
  },

  async create(data: CreateWorkOrderInput): Promise<WorkOrder> {
    const response = await apiClient.post<WorkOrder>('/work-orders', data);
    return response.data;
  },

  async updateStatus(id: string, data: TransitionStatusInput): Promise<WorkOrder> {
    const response = await apiClient.patch<WorkOrder>(`/work-orders/${id}/status`, data);
    return response.data;
  },

  async registerExit(id: string, data: ExitRegisterInput): Promise<WorkOrder> {
    const response = await apiClient.post<WorkOrder>(`/work-orders/${id}/exit-register`, data);
    return response.data;
  },

  async getHistory(id: string): Promise<StatusHistoryEntry[]> {
    const response = await apiClient.get<StatusHistoryEntry[]>(`/work-orders/${id}/history`);
    return response.data;
  },

  async addActivity(id: string, data: CreateActivityInput): Promise<Activity> {
    const response = await apiClient.post<Activity>(`/work-orders/${id}/activities`, data);
    return response.data;
  },

  async listActivities(id: string): Promise<Activity[]> {
    const response = await apiClient.get<Activity[]>(`/work-orders/${id}/activities`);
    return response.data;
  },

  async uploadPhoto(id: string, file: File, kind: 'inicial' | 'final'): Promise<Photo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    const response = await apiClient.post<Photo>(`/work-orders/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async listPhotos(id: string): Promise<Photo[]> {
    const response = await apiClient.get<Photo[]>(`/work-orders/${id}/photos`);
    return response.data;
  },
};
```

### `src/services/productService.ts`
```typescript
import { apiClient } from '../api/client';
import { Product, CreateProductInput, UpdateProductInput, InventoryMovement, CreateInventoryMovementInput, PaginatedResult } from '../types/api';

export const productService = {
  async getPublicProducts(): Promise<Product[]> {
    const response = await apiClient.get<Product[]>('/products');
    return response.data;
  },

  async getAdminProducts(params?: { page?: number; pageSize?: number; search?: string }): Promise<PaginatedResult<Product>> {
    const response = await apiClient.get<PaginatedResult<Product>>('/products/admin/all', { params });
    return response.data;
  },

  async getById(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  async create(data: CreateProductInput): Promise<Product> {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },

  async update(id: string, data: UpdateProductInput): Promise<Product> {
    const response = await apiClient.put<Product>(`/products/${id}`, data);
    return response.data;
  },

  async toggleAvailability(id: string, active: boolean): Promise<Product> {
    const response = await apiClient.patch<Product>(`/products/${id}/availability`, { active });
    return response.data;
  },

  async getMovements(id: string): Promise<InventoryMovement[]> {
    const response = await apiClient.get<InventoryMovement[]>(`/products/${id}/movements`);
    return response.data;
  },

  async createMovement(id: string, data: CreateInventoryMovementInput): Promise<InventoryMovement> {
    const response = await apiClient.post<InventoryMovement>(`/products/${id}/movements`, data);
    return response.data;
  },
};
```

### `src/services/appointmentService.ts`
```typescript
import { apiClient } from '../api/client';
import { Appointment, CreateAppointmentInput, AppointmentStatus } from '../types/api';

export const appointmentService = {
  async list(params?: { from?: string; to?: string; status?: AppointmentStatus }): Promise<Appointment[]> {
    const response = await apiClient.get<Appointment[]>('/appointments', { params });
    return response.data;
  },

  async create(data: CreateAppointmentInput): Promise<Appointment> {
    const response = await apiClient.post<Appointment>('/appointments', data);
    return response.data;
  },

  async updateStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
    const response = await apiClient.patch<Appointment>(`/appointments/${id}/status`, { status });
    return response.data;
  },
};
```

---

## 🔒 6. Manejo de Errores y Validaciones en Frontend

Al enviar peticiones HTTP al backend, si ocurre un error `400 VALIDATION_ERROR`, los detalles vienen estructurados así:

```typescript
try {
  await workOrderService.create(formData);
} catch (error: any) {
  if (error.response?.data?.error?.code === 'VALIDATION_ERROR') {
    const fieldErrors = error.response.data.error.details?.fieldErrors;
    console.error('Errores en los campos:', fieldErrors);
    // Mapear a los inputs de tu formulario
  } else {
    alert(error.response?.data?.error?.message || 'Error en el servidor');
  }
}
```
