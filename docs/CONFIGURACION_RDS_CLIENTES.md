# Configuración de Amazon RDS para el Módulo de Clientes

Este documento describe cómo configurar el backend de TecnoTaller para usar Amazon RDS for PostgreSQL en el módulo de clientes, manteniendo la compatibilidad con Supabase Cloud en el entorno local.

## Arquitectura Implementada

```
┌─────────────────────────────────────────────────────────────────┐
│                      customers.routes.ts                         │
│                              │                                   │
│                    createCustomerRepository()                    │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              │                               │                   │
│    DATA_PROVIDER=supabase          DATA_PROVIDER=postgres        │
│              │                               │                   │
│    ┌─────────▼─────────┐          ┌─────────▼─────────┐         │
│    │ CustomerRepository│          │PostgresCustomer   │         │
│    │   (Supabase)      │          │   Repository      │         │
│    └─────────┬─────────┘          └─────────┬─────────┘         │
│              │                               │                   │
│    ┌─────────▼─────────┐          ┌─────────▼─────────┐         │
│    │  Supabase Cloud   │          │   Amazon RDS      │         │
│    │   PostgreSQL      │          │   PostgreSQL      │         │
│    └───────────────────┘          └───────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Archivos Creados/Modificados

### Nuevos archivos:
- `src/config/postgres.ts` - Pool de conexiones PostgreSQL
- `src/modules/customers/customers.repository.postgres.ts` - Implementación para RDS
- `src/modules/customers/customers.repository.factory.ts` - Factory para selección del proveedor
- `sql/rds-customers-table.sql` - SQL para crear la tabla en RDS
- `src/modules/customers/customers.repository.test.ts` - Tests de verificación

### Archivos modificados:
- `src/config/env.ts` - Variables de entorno para RDS
- `src/modules/customers/customers.routes.ts` - Usa la factory
- `.env.example` - Documentación de variables
- `package.json` - Dependencia `pg` agregada

## Configuración

### Entorno Local (Supabase Cloud)

No requiere cambios. El valor por defecto de `DATA_PROVIDER` es `supabase`.

```env
# .env (entorno local)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
# DATA_PROVIDER no definido = usa Supabase
```

### Entorno AWS (Amazon RDS)

1. **Crear la tabla en RDS**

   Conectarse a la instancia RDS y ejecutar el script:

   ```bash
   psql -h tu-instancia.xxx.us-east-1.rds.amazonaws.com -U postgres -d tecnotaller -f sql/rds-customers-table.sql
   ```

2. **Configurar variables de entorno**

   ```env
   # .env (entorno AWS)
   DATA_PROVIDER=postgres

   RDS_HOST=tu-instancia.xxx.us-east-1.rds.amazonaws.com
   RDS_PORT=5432
   RDS_DATABASE=tecnotaller
   RDS_USER=postgres
   RDS_PASSWORD=tu_password_seguro
   RDS_SSL=true

   # Supabase sigue siendo necesario para Auth y otros módulos
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
   ```

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATA_PROVIDER` | No | `supabase` (default) o `postgres` |
| `RDS_HOST` | Solo si postgres | Endpoint de la instancia RDS |
| `RDS_PORT` | No | Puerto (default: 5432) |
| `RDS_DATABASE` | Solo si postgres | Nombre de la base de datos |
| `RDS_USER` | Solo si postgres | Usuario de PostgreSQL |
| `RDS_PASSWORD` | Solo si postgres | Contraseña del usuario |
| `RDS_SSL` | No | `true` para habilitar SSL (recomendado) |

## Operaciones Soportadas

Las 6 operaciones del módulo de clientes funcionan en ambos proveedores:

| Operación | Endpoint | Supabase | RDS |
|-----------|----------|----------|-----|
| Listar | `GET /api/v1/customers` | ✅ | ✅ |
| Obtener por ID | `GET /api/v1/customers/:id` | ✅ | ✅ |
| Buscar por teléfono | Interno | ✅ | ✅ |
| Crear | `POST /api/v1/customers` | ✅ | ✅ |
| Actualizar | `PATCH /api/v1/customers/:id` | ✅ | ✅ |
| Eliminar | `DELETE /api/v1/customers/:id` | ✅ | ✅ |

## Limitaciones Importantes

### 1. Órdenes de trabajo
Las órdenes de trabajo (`work_orders`) **permanecen en Supabase Cloud**. Si se crea un cliente en RDS:
- El cliente existirá solo en RDS
- No podrá asociarse a órdenes en Supabase
- `GET /api/v1/customers/:id/work-orders` retornará array vacío

### 2. Sincronización
**No hay sincronización automática** entre Supabase y RDS. Cada entorno tiene su propia tabla `customers` con datos independientes.

### 3. Autenticación
Supabase Auth sigue siendo el único proveedor de autenticación. Los tokens se validan contra Supabase en ambos entornos.

### 4. Otros módulos
Solo el módulo de clientes soporta RDS. Todos los demás módulos (productos, órdenes, citas, etc.) continúan usando exclusivamente Supabase.

## Comandos

### Ejecutar en modo local (Supabase)
```bash
npm run dev
```

### Ejecutar en modo AWS (RDS)
```bash
# Asegurar que las variables RDS estén configuradas
export DATA_PROVIDER=postgres
npm run dev
```

### Ejecutar tests
```bash
npm test -- --run src/modules/customers/customers.repository.test.ts
```

### Verificar tipos
```bash
npm run typecheck
```

## Seguridad

1. **Credenciales**: Nunca commitear credenciales reales. Usar variables de entorno.
2. **SSL**: Habilitar `RDS_SSL=true` en producción.
3. **Consultas parametrizadas**: Todas las consultas usan parámetros para prevenir SQL injection.
4. **Pool de conexiones**: Se reutilizan conexiones para evitar overhead.

## Troubleshooting

### Error: "RDS_HOST no está configurado"
Asegurarse de definir todas las variables `RDS_*` cuando `DATA_PROVIDER=postgres`.

### Error de conexión SSL
Verificar que el Security Group de RDS permita conexiones desde la IP del servidor.

### Error de autenticación
Verificar usuario/contraseña de RDS. El usuario debe tener permisos sobre la tabla `customers`.
