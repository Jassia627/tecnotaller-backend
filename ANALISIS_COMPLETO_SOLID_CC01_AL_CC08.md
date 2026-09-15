# ANÁLISIS COMPLETO SOLID - CC-01 al CC-08

## Tabla Maestra de Cambios SOLID

| ID | Ámbito | Principio | Archivo/Clase | Violación | Solución | Severidad |
|-----|--------|-----------|---------------|-----------|----------|-----------|
| **CC-01** | Frontend | SRP | src/pages/Booking.tsx | Esquemas + datos + renderizado en un archivo | Extracción de esquemas a booking.schema.ts y datos a constantes | Media |
| **CC-02** | Frontend | SRP/OCP | src/components/admin/products/ProductForm.tsx | 400+ líneas: validación, peticiones, campos dinámicos | Extracción de esquemas + descomposición en sub-componentes | Alta |
| **CC-03** | Frontend | OCP | src/pages/ProductDetail.tsx | WhatsApp hardcodeado | Inyección vía import.meta.env (.env) | Media |
| **CC-04** | Frontend | DIP | src/api/hooks.ts | React Hooks acoplados a Axios, conocen rutas | Service Layer (ProductService, OrderService, etc.) | Baja |
| **CC-05** | Backend | OCP | src/modules/work-orders/work-orders.service.ts | if (userRole === 'tecnico') hardcodeado | Strategy Pattern + Factory Pattern | Alta |
| **CC-06** | Backend | SRP | src/modules/auth/auth.controller.ts | Validación Zod + orquestación HTTP | Middleware de Validación genérico | Media |
| **CC-07** | Backend | DIP | src/modules/products/products.repository.ts | import { supabase } directo, acoplado | Inyección de cliente BD en constructor | Media |
| **CC-08** | Backend | OCP/Code Smell | src/modules/products/products.repository.ts | Magic strings: '23505', 'PGRST116', 'stock insuficiente' | Constantes centralizadas: POSTGRES_ERROR_CODES, POSTGREST_ERROR_CODES, DB_ERROR_PATTERNS | Alta |

---

## CC-01: SRP en Booking Page (Frontend)

### Violación:
```typescript
// ❌ Una página mezcla validación, datos estáticos y renderizado
export function BookingPage() {
  const bookingSchema = z.object({
    date: z.string(),
    time: z.string(),
    service: z.string(),
  });
  
  const SERVICES = [
    { id: 1, name: 'Cambio de batería' },
    { id: 2, name: 'Reparación de pantalla' },
  ];
  
  return (
    <form>
      <select>
        {SERVICES.map(s => <option key={s.id}>{s.name}</option>)}
      </select>
      <input type="date" />
      <button onClick={() => {
        const input = bookingSchema.parse(formData);
        // Lógica de envío
      }}>Agendar</button>
    </form>
  );
}
```

### Solución:
```typescript
// src/schemas/booking.schema.ts
export const bookingSchema = z.object({
  date: z.string(),
  time: z.string(),
  service: z.string(),
});

// src/constants/services.ts
export const SERVICES = [
  { id: 1, name: 'Cambio de batería' },
  { id: 2, name: 'Reparación de pantalla' },
];

// src/pages/Booking.tsx (Solo renderizado)
export function BookingPage() {
  return <BookingForm />;
}
```

**Beneficio**: Cambios en esquemas no afectan el componente. Testing del schema aislado.

---

## CC-02: God Component en ProductForm (Frontend)

### Violación (400+ líneas):
```typescript
// ❌ ProductForm.tsx maneja TODO
export function ProductForm() {
  const [fields, setFields] = useState([]); // Campos dinámicos
  const [formData, setFormData] = useState({}); // Datos
  const [errors, setErrors] = useState({}); // Errores
  
  const { mutate: createProduct } = useMutation({
    mutationFn: async (input) => {
      return axios.post('/api/v1/products', input);
    },
  });
  
  const productSchema = z.object({ // Validación aquí
    name: z.string().min(3),
    price: z.number().positive(),
    // ... 50+ más campos
  });
  
  const categories = [ // Datos estáticos aquí
    { id: 1, name: 'Electrónica' },
    { id: 2, name: 'Accesorios' },
  ];
  
  const handleAddField = () => {
    setFields([...fields, { id: generateId(), type: 'text' }]);
  };
  
  const handleFieldChange = (id, value) => {
    setFormData({ ...formData, [id]: value });
  };
  
  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      try {
        const validated = productSchema.parse(formData);
        createProduct(validated);
      } catch (err) {
        setErrors(err.errors);
      }
    }}>
      {/* 200+ líneas de JSX */}
    </form>
  );
}
```

### Solución:
```typescript
// src/schemas/product.schema.ts
export const productSchema = z.object({
  name: z.string().min(3),
  price: z.number().positive(),
  // ...
});

// src/constants/categories.ts
export const CATEGORIES = [
  { id: 1, name: 'Electrónica' },
  { id: 2, name: 'Accesorios' },
];

// src/components/ProductForm/FieldRenderer.tsx (Componente reutilizable)
export function FieldRenderer({ field, value, onChange }) {
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// src/components/ProductForm/DynamicFields.tsx (Sub-componente)
export function DynamicFields({ fields, formData, onChange }) {
  return (
    <div>
      {fields.map(field => (
        <FieldRenderer
          key={field.id}
          field={field}
          value={formData[field.id]}
          onChange={(value) => onChange(field.id, value)}
        />
      ))}
    </div>
  );
}

// src/components/ProductForm/ProductForm.tsx (160 líneas)
export function ProductForm() {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const { mutate: createProduct } = useCreateProduct();
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createProduct(formData);
    }}>
      <DynamicFields
        fields={fields}
        formData={formData}
        onChange={(id, value) => setFormData({ ...formData, [id]: value })}
      />
      <button type="submit">Guardar</button>
    </form>
  );
}
```

**Beneficio**: Componentes pequeños (< 200 líneas), testables, reutilizables.

---

## CC-03: Magic Strings en ProductDetail (Frontend)

### Violación:
```typescript
// ❌ WhatsApp hardcodeado, imposible cambiar sin editar código
const handleWhatsAppSubmit = () => {
  const phone = '+573051234567'; // 🚨 Hardcodeado
  const message = `Hola, me interesa este producto: ${productName}`;
  window.open(`https://wa.me/${phone}?text=${message}`);
};
```

### Solución:
```typescript
// .env
VITE_WHATSAPP_PHONE=+573051234567
VITE_SUPPORT_EMAIL=support@tecnotaller.com

// src/config/app.config.ts
export const APP_CONFIG = {
  whatsapp: import.meta.env.VITE_WHATSAPP_PHONE,
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL,
} as const;

// src/pages/ProductDetail.tsx
import { APP_CONFIG } from '../config/app.config';

const handleWhatsAppSubmit = () => {
  const message = `Hola, me interesa este producto: ${productName}`;
  window.open(`https://wa.me/${APP_CONFIG.whatsapp}?text=${message}`);
};
```

**Beneficio**: Cambios de configuración sin modificar código. Diferentes valores por entorno (dev, staging, prod).

---

## CC-04: DIP en React Hooks (Frontend)

### Violación:
```typescript
// ❌ Hooks acoplados a Axios, conocen rutas y detalles de red
export function useGetProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/products');
      return data;
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: async (input) => {
      const { data } = await axios.post('/api/v1/products', input);
      return data;
    },
  });
}
```

### Solución:
```typescript
// src/services/ProductService.ts (Service Layer)
export class ProductService {
  static async getProducts() {
    const { data } = await axios.get('/api/v1/products');
    return data;
  }
  
  static async createProduct(input) {
    const { data } = await axios.post('/api/v1/products', input);
    return data;
  }
  
  static async updateProduct(id, input) {
    const { data } = await axios.put(`/api/v1/products/${id}`, input);
    return data;
  }
}

// src/hooks/useProducts.ts (Desacoplado de Axios)
export function useGetProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: ProductService.getProducts, // ← Service layer
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: ProductService.createProduct, // ← Service layer
  });
}

export function useUpdateProduct(id) {
  return useMutation({
    mutationFn: (input) => ProductService.updateProduct(id, input),
  });
}
```

**Beneficio**: 
- Hooks no conocen Axios ni rutas
- Cambiar Axios a fetch sin modificar hooks
- Service layer reutilizable en CLI, tests, etc.

---

## CC-05: OCP en WorkOrderService (Backend)

**Ver**: `DIAGRAMA_CLASES_REFACTORIZADO.md` - Sección "1. PATRÓN OCP - Strategy Pattern para Autorización"

---

## CC-06: SRP en AuthController (Backend)

**Ver**: `DIAGRAMA_CLASES_REFACTORIZADO.md` - Sección "2. PATRÓN SRP - Middleware de Validación"

---

## CC-07: DIP en ProductRepository (Backend)

### Violación:
```typescript
// ❌ Acoplamiento directo a Supabase
import { supabase as defaultSupabase } from '../../config/supabase';

export class ProductRepository {
  async list(): Promise<ProductRow[]> {
    const { data } = await defaultSupabase.from('products').select('*');
    // Imposible testear sin Supabase real
    // Imposible migrar a otra BD
  }
}
```

### Solución:
```typescript
// ✅ Inyección de cliente BD
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '../../config/supabase';

export interface IProductRepository {
  list(): Promise<ProductRow[]>;
  findById(id: string): Promise<ProductRow | null>;
  create(input): Promise<ProductRow>;
  // ...
}

export class ProductRepository implements IProductRepository {
  constructor(private readonly db: SupabaseClient = defaultSupabase) {}
  
  async list(): Promise<ProductRow[]> {
    const { data } = await this.db.from('products').select('*');
    // Testeable con mock
    // Flexible para cambiar BD
  }
}

// Uso:
const realRepo = new ProductRepository(); // ← Usa defaultSupabase
const mockRepo = new ProductRepository(mockClient); // ← Mock para tests
```

**Beneficio**: 
- Testing con mocks sin BD real
- Migración a PostgreSQL nativo, Prisma, Drizzle sin reescribir servicios
- Retrocompatibilidad: defaultSupabase por defecto

---

## CC-08: Eliminación de Magic Strings (Backend)

### Violación:
```typescript
// ❌ Strings dispersos, frágiles ante cambios BD
if (error.code === '23505') {
  throw new ConflictError('SKU ya existe');
}

if (msg.includes('stock insuficiente')) {
  throw new BadRequestError('Stock insuficiente');
}

if (error.code === 'PGRST116') {
  return null; // Row not found
}

const { data } = await this.db.rpc('register_inventory_movement', {...});
// ¿Qué pasa si la BD renombra la función?
```

### Solución:
```typescript
// src/shared/constants/db-errors.ts
export const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  INVALID_TEXT_REPRESENTATION: '22P02',
  UNDEFINED_FUNCTION: '42883',
} as const;

export const POSTGREST_ERROR_CODES = {
  ROW_NOT_FOUND: 'PGRST116',
  FUNCTION_NOT_FOUND: 'PGRST202',
  TABLE_NOT_FOUND: 'PGRST205',
} as const;

export const DB_ERROR_PATTERNS = {
  INSUFFICIENT_STOCK: [/insuficiente/i, /insufficient/i, /stock/i],
  PRODUCT_NOT_FOUND: [/producto no encontrado/i, /product not found/i],
  SKU_UNIQUE_VIOLATION: [/sku/i],
} as const;

const DB_RPC = {
  REGISTER_INVENTORY_MOVEMENT: 'register_inventory_movement',
  TRANSITION_ORDER_STATUS: 'transition_order_status',
} as const;

const DB_TABLES = {
  PRODUCTS: 'products',
  INVENTORY_MOVEMENTS: 'inventory_movements',
  WORK_ORDERS: 'work_orders',
} as const;

// Uso en ProductRepository:
if (error.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION &&
    DB_ERROR_PATTERNS.SKU_UNIQUE_VIOLATION.some(p => p.test(error.message))) {
  throw new ConflictError('SKU ya existe');
}

if (DB_ERROR_PATTERNS.INSUFFICIENT_STOCK.some(p => p.test(msg))) {
  throw new BadRequestError('Stock insuficiente');
}

if (error.code === POSTGREST_ERROR_CODES.ROW_NOT_FOUND) {
  return null;
}

const { error: rpcError } = await this.db.rpc(DB_RPC.REGISTER_INVENTORY_MOVEMENT, {...});

const { data } = await this.db.from(DB_TABLES.PRODUCTS).select('*');
```

**Beneficio**:
- Cambios centralizados: editar un lugar, impacta todo
- Type-safe: TypeScript previene typos
- Mantenible: documentación inline
- Resiliente: patrones regex para variaciones de mensajes

---

## Resumen: Todos los SOLID (CC-01 al CC-08)

| CC | Principio | Antes | Después | Impacto |
|-----|-----------|-------|---------|---------|
| **CC-01** | SRP | Página mezcla todo | Esquemas/datos separados | Mantenibilidad, testing |
| **CC-02** | SRP | 400+ líneas 1 componente | Descompuesto 3-4 componentes | Escalabilidad, reusabilidad |
| **CC-03** | OCP | Hardcodeado | .env variables | Flexibilidad por entorno |
| **CC-04** | DIP | Hooks → Axios | Hooks → Service Layer | Desacoplamiento, testing |
| **CC-05** | OCP | if-else roles | Strategy + Factory | Nuevos roles sin cambios |
| **CC-06** | SRP | Controller valida+orquesta | Middleware valida | Responsabilidad única |
| **CC-07** | DIP | import supabase directo | Inyectado en constructor | Testing, migración BD |
| **CC-08** | OCP | Magic strings '23505' | Constantes tipadas | Centralization, robustez |

---

## Estructura Recomendada Proyecto Completo

```
tecnotaller/
├── backend/
│   ├── src/
│   │   ├── shared/
│   │   │   ├── authorization/
│   │   │   │   └── filters/ (CC-05)
│   │   │   ├── middleware/
│   │   │   │   └── validate-request.middleware.ts (CC-06)
│   │   │   ├── constants/
│   │   │   │   └── db-errors.ts (CC-08)
│   │   │   └── ...
│   │   ├── modules/
│   │   │   ├── products/
│   │   │   │   ├── products.repository.ts (CC-07, CC-08)
│   │   │   │   ├── products.controller.ts (CC-06)
│   │   │   │   └── ...
│   │   │   ├── work-orders/ (CC-05)
│   │   │   ├── auth/ (CC-06)
│   │   │   └── ...
│   │   └── app.ts
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── schemas/ (CC-01, CC-02)
    │   ├── services/ (CC-04)
    │   ├── config/ (CC-03)
    │   ├── constants/ (CC-01)
    │   ├── hooks/ (CC-04)
    │   ├── components/ (CC-02)
    │   ├── pages/
    │   │   ├── Booking.tsx (CC-01)
    │   │   ├── ProductDetail.tsx (CC-03)
    │   │   └── ...
    │   ├── App.tsx
    │   └── main.tsx
    └── package.json
```

---

**Documento Completo**: Todos los SOLID (CC-01 al CC-08)  
**Fecha**: Septiembre 2026  
**Estado**: ✅ Implementado y Documentado
