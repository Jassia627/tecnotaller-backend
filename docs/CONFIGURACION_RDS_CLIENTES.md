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
- `src/config/postgres.ts` - Pool de conexiones PostgreSQL con validación SSL
- `src/modules/customers/customers.repository.postgres.ts` - Implementación para RDS
- `src/modules/customers/customers.repository.factory.ts` - Factory para selección del proveedor
- `sql/rds-customers-table.sql` - SQL para crear la tabla en RDS
- `src/modules/customers/customers.repository.test.ts` - Tests de verificación

### Archivos modificados:
- `src/config/env.ts` - Variables de entorno para RDS con validación estricta
- `src/modules/customers/customers.service.ts` - Lógica de delete corregida para RDS
- `src/modules/customers/customers.routes.ts` - Usa la factory
- `src/main.ts` - Validación de conexión al inicio y shutdown ordenado
- `.env.example` - Documentación de variables

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

#### 1. Descargar certificado CA de RDS

En la instancia EC2:

```bash
# Crear directorio para certificados
sudo mkdir -p /etc/ssl/certs

# Descargar el bundle de certificados de Amazon RDS
sudo curl -o /etc/ssl/certs/rds-ca-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Verificar permisos
sudo chmod 644 /etc/ssl/certs/rds-ca-bundle.pem
```

#### 2. Crear la tabla en RDS

Conectarse a la instancia RDS y ejecutar el script:

```bash
psql -h tu-instancia.xxx.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d tecnotaller \
     -f sql/rds-customers-table.sql
```

#### 3. Configurar variables de entorno

```env
# .env (entorno AWS)
DATA_PROVIDER=postgres

RDS_HOST=tu-instancia.xxx.us-east-1.rds.amazonaws.com
RDS_PORT=5432
RDS_DATABASE=tecnotaller
RDS_USER=postgres
RDS_PASSWORD=tu_password_seguro
RDS_SSL=true
RDS_CA_BUNDLE_PATH=/etc/ssl/certs/rds-ca-bundle.pem

# Supabase sigue siendo necesario para Auth y otros módulos
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATA_PROVIDER` | No | `supabase` (default) o `postgres`. Otros valores causan error. |
| `RDS_HOST` | Solo si postgres | Endpoint de la instancia RDS |
| `RDS_PORT` | No | Puerto (default: 5432) |
| `RDS_DATABASE` | Solo si postgres | Nombre de la base de datos |
| `RDS_USER` | Solo si postgres | Usuario de PostgreSQL |
| `RDS_PASSWORD` | Solo si postgres | Contraseña del usuario |
| `RDS_SSL` | No | `true` para habilitar SSL (recomendado) |
| `RDS_CA_BUNDLE_PATH` | Recomendado en prod | Ruta al certificado CA de RDS |

## Operaciones Soportadas

Las 6 operaciones del módulo de clientes funcionan en ambos proveedores:

| Operación | Endpoint | Supabase | RDS | Notas |
|-----------|----------|----------|-----|-------|
| Listar | `GET /api/v1/customers` | ✅ | ✅ | Paginación idéntica |
| Obtener por ID | `GET /api/v1/customers/:id` | ✅ | ✅ | |
| Buscar por teléfono | Interno | ✅ | ✅ | Misma normalización |
| Crear | `POST /api/v1/customers` | ✅ | ✅ | UUID autogenerado |
| Actualizar | `PATCH /api/v1/customers/:id` | ✅ | ✅ | Parcial sin sobrescribir |
| Eliminar | `DELETE /api/v1/customers/:id` | ✅ | ❌ | **Ver limitaciones** |

## Limitaciones Importantes

### 1. Eliminación de clientes con RDS
Cuando `DATA_PROVIDER=postgres`, la operación `DELETE /api/v1/customers/:id` está **deshabilitada** y retorna error 400.

**Razón:** Las órdenes de trabajo (`work_orders`) permanecen en Supabase. No es posible verificar si el cliente tiene órdenes activas porque no podemos consultar entre bases de datos. Por seguridad, se rechaza la eliminación para evitar inconsistencias.

**Mensaje de error:**
```json
{
  "error": "No se puede eliminar clientes cuando DATA_PROVIDER=postgres. Las órdenes de trabajo permanecen en Supabase y no es posible verificar si el cliente tiene órdenes activas."
}
```

### 2. Relación clientes-órdenes
- `work_orders.customer_id` en Supabase referencia `public.customers(id)` en Supabase.
- Un cliente creado en RDS tiene un UUID que **no existe en Supabase**.
- Si se intenta crear una orden en Supabase con el `customer_id` de RDS, la FK fallará.
- **Flujo actual afectado:** No se pueden crear órdenes para clientes de RDS.

### 3. Sin sincronización automática
Los datos de clientes son **completamente independientes** entre Supabase y RDS. No hay replicación, no hay sincronización. Cada entorno es aislado.

### 4. Listado de órdenes por cliente en RDS
`GET /api/v1/customers/:id/work-orders` con `DATA_PROVIDER=postgres` retorna siempre un array vacío porque las órdenes están en Supabase.

### 5. Autenticación
Supabase Auth **permanece intacto** en ambos entornos. Los tokens se validan contra Supabase. Solo el almacenamiento de clientes cambia.

## Comportamiento al Iniciar

### Con DATA_PROVIDER=postgres
1. El servidor valida que todas las variables `RDS_*` requeridas estén configuradas.
2. Ejecuta `testPostgresConnection()` para verificar conectividad.
3. Si falla, el servidor **NO inicia** y muestra error detallado.
4. Si conecta, el servidor se declara operativo.

### Con DATA_PROVIDER=supabase (o no definido)
1. El servidor inicia normalmente usando Supabase.
2. No se validan ni usan las variables `RDS_*`.

### Apagado ordenado
Al recibir `SIGTERM` o `SIGINT`:
1. Se cierra el servidor HTTP.
2. Se cierra el pool de PostgreSQL (si estaba activo).
3. El proceso termina limpiamente.

## Comandos

### Ejecutar en modo local (Supabase)
```bash
npm run dev
```

### Ejecutar en modo AWS (RDS)
```bash
export DATA_PROVIDER=postgres
export RDS_HOST=tu-instancia.xxx.us-east-1.rds.amazonaws.com
export RDS_DATABASE=tecnotaller
export RDS_USER=postgres
export RDS_PASSWORD=tu_password
export RDS_SSL=true
export RDS_CA_BUNDLE_PATH=/etc/ssl/certs/rds-ca-bundle.pem
npm run dev
```

### Verificar tipos
```bash
npm run typecheck
```

### Ejecutar build
```bash
npm run build
```

### Ejecutar tests
```bash
npm test
```

## Seguridad

1. **Credenciales**: Nunca commitear credenciales reales. Usar variables de entorno.
2. **SSL**: Habilitar `RDS_SSL=true` en producción.
3. **Certificado CA**: Configurar `RDS_CA_BUNDLE_PATH` con el bundle oficial de AWS.
4. **Consultas parametrizadas**: Todas las consultas usan parámetros (`$1`, `$2`, etc.) para prevenir SQL injection.
5. **Pool de conexiones**: Se reutilizan conexiones para evitar overhead.
6. **Validación estricta**: `DATA_PROVIDER` solo acepta `supabase` o `postgres`. Otros valores causan error al iniciar.

## Estados de Órdenes de Trabajo

Los estados terminales oficiales (según `ORDER_STATUSES` en `work-orders.types.ts`) son:

- `ENTREGADO` - Único estado terminal

**Estados que NO existen en el sistema:**
- `COMPLETADO` - No existe
- `CANCELADO` - No existe

El servicio de clientes usa `ENTREGADO` como único criterio para determinar si una orden está finalizada.

## Troubleshooting

### Error: "DATA_PROVIDER inválido"
Solo se aceptan `supabase` o `postgres`. Verificar que no haya espacios ni caracteres extra.

### Error: "Variables de RDS faltantes"
Cuando `DATA_PROVIDER=postgres`, todas estas variables son requeridas:
- `RDS_HOST`
- `RDS_DATABASE`
- `RDS_USER`
- `RDS_PASSWORD`

### Error: "Certificado CA de RDS no encontrado"
Descargar el bundle de https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem y configurar `RDS_CA_BUNDLE_PATH`.

### Error de conexión SSL
Verificar que:
1. El Security Group de RDS permita conexiones desde la IP de EC2
2. El certificado CA esté correctamente descargado
3. `RDS_SSL=true` esté configurado

### No se puede eliminar clientes en RDS
Comportamiento esperado. Ver sección "Limitaciones Importantes".

## Resumen para Deploy en EC2

1. Descargar certificado CA de RDS
2. Ejecutar SQL en RDS para crear tabla `customers`
3. Configurar variables de entorno (incluyendo `RDS_CA_BUNDLE_PATH`)
4. Iniciar el servidor con `npm start`
5. Verificar que el log muestre "Conexión con PostgreSQL RDS verificada"
