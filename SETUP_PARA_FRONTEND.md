# SETUP COMPLETO BACKEND - FASE 25

## INSTRUCCIONES PASO A PASO PARA EL EQUIPO DE FRONTEND

### PASO 1: Actualizar código fuente

```bash
cd tecnotaller-backend
git fetch origin
git pull origin master
```

Verifica que obtuviste los últimos cambios:
```bash
git log --oneline -3
```

### PASO 2: Limpiar builds anteriores

```bash
rm -rf dist node_modules
npm install
```

### PASO 3: Verificar compilación

```bash
npm run typecheck
npm run build
```

**Esperado**: Exit Code 0, sin errores

### PASO 4: Ejecutar migraciones en Supabase (UNA SOLA VEZ)

Ir a: Supabase Dashboard → Tu proyecto → SQL Editor

Copiar y pegar EXACTAMENTE este SQL (todas las líneas):

```sql
-- MIGRACIÓN 0015
ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS total_items integer NOT NULL DEFAULT 0;

ALTER TABLE public.purchase_request_items
ADD COLUMN IF NOT EXISTS unit_price numeric(12, 2) NOT NULL DEFAULT 0;

UPDATE public.purchase_requests pr
SET total_items = (
  SELECT COUNT(*) FROM public.purchase_request_items
  WHERE purchase_request_id = pr.id
);

-- MIGRACIÓN 0016
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_active_idx ON public.suppliers (active, created_at);
CREATE INDEX IF NOT EXISTS suppliers_email_idx ON public.suppliers (email);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON public.suppliers (name);

-- MIGRACIÓN 0017
ALTER TABLE public.purchase_requests
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS subtotal numeric(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total numeric(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS purchase_requests_supplier_idx ON public.purchase_requests (supplier_id);

ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.inventory_movements_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES public.parts (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_movements_parts_part_idx 
  ON public.inventory_movements_parts (part_id, created_at);

CREATE INDEX IF NOT EXISTS inventory_movements_parts_type_idx 
  ON public.inventory_movements_parts (type, created_at);
```

Haz click en "Run without RLS" para cada bloque.

### PASO 5: Limpiar y reconstruir Docker

```bash
docker compose down
docker compose up --build
```

**Esperado después de ~30-60 segundos:**
```
tecnotaller-backend  Up ... (healthy)
```

### PASO 6: Verificar healthcheck

```bash
curl http://localhost:3000/healthcheck
```

**Esperado:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-12T..."
}
```

Si devuelve algo diferente = PARAR Y REVISAR.

### PASO 7: Verificar OpenAPI

```bash
curl http://localhost:3000/openapi.json | grep -i "purchase"
```

**Esperado**: Debe mostrar rutas de purchase-requests

### PASO 8: Obtener token admin

Necesitas credenciales admin válidas. Supongamos:
- Email: `admin@tecnotaller.com`
- Password: obtener de tu .env o admin del proyecto

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tecnotaller.com",
    "password": "TU_PASSWORD"
  }'
```

**Respuesta:**
```json
{
  "token": "eyJhbGc..."
}
```

Copiar este token para usarlo en los siguientes requests.

### PASO 9: Listar proveedores

```bash
curl http://localhost:3000/api/v1/suppliers \
  -H "Authorization: Bearer eyJhbGc..."
```

**Esperado**: `{ "items": [...], "total": N }`

Si devuelve 401 = el token no es válido, verificar credenciales.

### PASO 10: Listar compras

```bash
curl http://localhost:3000/api/v1/purchase-requests \
  -H "Authorization: Bearer eyJhbGc..."
```

**Esperado**: `{ "items": [], "total": 0 }`

### PASO 11: Crear producto de prueba

En Supabase SQL Editor:

```sql
INSERT INTO products (sku, name, stock) 
VALUES ('TEST-001', 'Producto de Prueba', 100)
RETURNING id;
```

Guardar el `id` que devuelve.

### PASO 12: Crear compra de prueba

Stock antes: **100**

```bash
curl -X POST http://localhost:3000/api/v1/purchase-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "items": [
      {
        "productId": "UUID_DEL_PRODUCTO",
        "partId": null,
        "quantity": 25,
        "unitPrice": 50.00
      }
    ]
  }'
```

**Respuesta**: Obtener `id` de compra

Stock después de crear: **debe seguir siendo 100**

### PASO 13: Cambiar a ORDENADO

```bash
curl -X PATCH http://localhost:3000/api/v1/purchase-requests/ID_COMPRA/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{ "status": "ORDENADO" }'
```

**Respuesta**: `{ "status": "ORDENADO", ... }`

Stock: **debe seguir siendo 100**

### PASO 14: RECIBIR COMPRA

```bash
curl -X POST http://localhost:3000/api/v1/purchase-requests/ID_COMPRA/receive \
  -H "Authorization: Bearer eyJhbGc..."
```

**Respuesta**: `{ "status": "RECIBIDO", ... }`

Stock: **DEBE SER 125 (100 + 25)**

### PASO 15: Verificar stock en BD

```sql
SELECT stock FROM products WHERE id = 'UUID_DEL_PRODUCTO' LIMIT 1;
```

**Esperado**: 125

### PASO 16: Verificar movimiento IN

```sql
SELECT * FROM inventory_movements 
WHERE product_id = 'UUID_DEL_PRODUCTO' AND type = 'IN'
ORDER BY created_at DESC LIMIT 1;
```

**Esperado**: Fila con `type='IN'`, `quantity=25`

### PASO 17: Intentar recibir nuevamente (IDEMPOTENCIA)

```bash
curl -X POST http://localhost:3000/api/v1/purchase-requests/ID_COMPRA/receive \
  -H "Authorization: Bearer eyJhbGc..."
```

**Respuesta esperada**: 
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Compra ya fue recibida. No se puede recibir dos veces."
  }
}
```

### PASO 18: Verificar stock NO se duplicó

```sql
SELECT stock FROM products WHERE id = 'UUID_DEL_PRODUCTO' LIMIT 1;
```

**Esperado**: 125 (sigue igual, no es 150)

### PASO 19: Verificar movimiento NO se duplicó

```sql
SELECT COUNT(*) FROM inventory_movements 
WHERE product_id = 'UUID_DEL_PRODUCTO' AND type = 'IN';
```

**Esperado**: 1 (solo uno)

### PASO 20: Crear compra MIXTA (producto + repuesto)

Primero, crear o obtener un repuesto existente:

```sql
-- Si no existe, crear uno
INSERT INTO parts (name, sku, stock) 
VALUES ('Repuesto de Prueba', 'PART-001', 50)
RETURNING id;
```

Crear compra con producto Y repuesto:

```bash
curl -X POST http://localhost:3000/api/v1/purchase-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{
    "items": [
      {
        "productId": "UUID_PRODUCTO",
        "partId": null,
        "quantity": 10,
        "unitPrice": 50
      },
      {
        "productId": null,
        "partId": "UUID_REPUESTO",
        "quantity": 5,
        "unitPrice": 100
      }
    ]
  }'
```

**Esperado**: Compra con 2 items (uno producto, uno repuesto)

### PASO 21: Recibir compra mixta

```bash
curl -X PATCH http://localhost:3000/api/v1/purchase-requests/ID_COMPRA_MIXTA/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGc..." \
  -d '{ "status": "ORDENADO" }'

curl -X POST http://localhost:3000/api/v1/purchase-requests/ID_COMPRA_MIXTA/receive \
  -H "Authorization: Bearer eyJhbGc..."
```

**Verificar:**

```sql
-- Stock de producto
SELECT stock FROM products WHERE id = 'UUID_PRODUCTO' LIMIT 1;
-- Debe aumentar en 10

-- Stock de repuesto
SELECT stock FROM parts WHERE id = 'UUID_REPUESTO' LIMIT 1;
-- Debe aumentar en 5

-- Movimientos
SELECT COUNT(*) FROM inventory_movements WHERE type = 'IN';
SELECT COUNT(*) FROM inventory_movements_parts WHERE type = 'IN';
```

---

## CHECKLIST FINAL

- [ ] `git pull` completado
- [ ] `npm run typecheck` sin errores
- [ ] `npm run build` exitoso
- [ ] Migraciones ejecutadas en Supabase
- [ ] `docker compose up --build` exitoso
- [ ] Container en estado "healthy"
- [ ] `/healthcheck` responde 200
- [ ] `/openapi.json` contiene rutas de compras
- [ ] Login admin funciona
- [ ] GET /suppliers responde 200
- [ ] GET /purchase-requests responde 200
- [ ] POST /purchase-requests funciona
- [ ] Stock NO cambia al crear compra
- [ ] Stock NO cambia al pasar a ORDENADO
- [ ] Stock AUMENTA al recibir compra
- [ ] Movimiento IN se registra
- [ ] Recibir nuevamente retorna error 400
- [ ] Stock permanece igual en segundo receive
- [ ] Movimiento IN NO se duplica
- [ ] Compra mixta (producto + repuesto) funciona
- [ ] Repuesto recibe stock correctamente
- [ ] OpenAPI muestra todas las rutas

---

## SI ALGO FALLA

1. Verificar que Docker esté running: `docker --version`
2. Verificar logs: `docker compose logs --tail=100`
3. Verificar token es válido: intentar otro endpoint
4. Verificar credenciales admin: revisar en Supabase Auth
5. Verificar migraciones: Supabase → Table Editor → buscar `suppliers`
6. Verificar puerto: 3000 debe estar disponible
7. Verificar CORS: las credenciales deben coincidir

---

**SIGUIENTE PASO:**

Una vez confirmado que todo funciona (todos los checks verdes), el equipo frontend puede comenzar a implementar la Fase 25.

**NO NECESITA:**
- Modificar backend
- Cambiar rutas
- Cambiar autenticación
- Agregar proveedores manualmente

**PUEDE:**
- Llamar endpoints
- Mostrar datos en UI
- Implementar formularios
- Conectar frontend

Éxito 🚀
