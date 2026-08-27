# 🚀 Guía de Ejecución de Tests - TechnoTaller Backend

## Inicio Rápido

### 1. Verificar que todo está instalado
```bash
npm --version
node --version
```

### 2. Ejecutar todos los tests
```bash
npm test
```

### 3. Ejecutar en modo watch (recomendado para desarrollo)
```bash
npm run test:watch
```

---

## 📋 Comandos Disponibles

### Ejecutar Tests

```bash
# Todos los tests una vez
npm test

# Tests en modo watch (recomendado)
npm run test:watch

# Tests con nombre específico
npm test -- appointments
npm test -- services
npm test -- auth

# Tests de un archivo específico
npm test -- services.service.test

# Tests que contengan "create"
npm test -- -t "create"

# Tests de unit o integration
npm test -- services.service    # Solo unit tests del servicio
npm test -- services.repository # Solo integration tests del repositorio
```

### Ver Cobertura

```bash
# Cobertura de todos los tests
npm test -- --coverage

# Cobertura solo de servicios
npm test -- --coverage services

# Generar reporte HTML
npm test -- --coverage --reporter=html
```

### Otros Comandos

```bash
# Modo verbose (más información)
npm test -- --reporter=verbose

# Parar en primer error
npm test -- --bail

# Ejecutar N tests en paralelo
npm test -- --threads=4

# Listar todos los tests sin ejecutar
npm test -- --listTests
```

---

## 🔍 Interpretando los Resultados

### Test Exitoso
```
✓ should create a service (15ms)
```

### Test Fallido
```
✗ should create a service
  AssertionError: expected 'John' to be 'Jane'
  at Object.<anonymous> (src/modules/services/services.service.test.ts:45:15)
```

### Resumen
```
✓ 375 passed (42s)
```

---

## ⚙️ Configuración de Tests

### Archivo de Configuración: `vitest.config.ts`

Si necesitas modificar la configuración, usa:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    threads: true,
  },
});
```

---

## 🔗 Relación con el .env

### Variables Necesarias para Integration Tests

El archivo `.env` debe contener:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### Verificar Configuración

```bash
# Verificar que el .env existe
cat .env

# Verificar que Supabase está accesible
npm test -- services.repository  # Ejecuta solo integration tests
```

---

## 📊 Ejecución de Tests por Módulo

### Ejecutar un módulo completo

```bash
# Services (16 unit + 15 integration = 31 tests)
npm test -- services

# Appointments (13 unit + 20 integration = 33 tests)
npm test -- appointments

# Customers (15 unit + 16 integration = 31 tests)
npm test -- customers

# Products (15 unit + 18 integration = 33 tests)
npm test -- products

# Work-Orders (16 unit + 18 integration = 34 tests)
npm test -- work-orders
```

### Ejecutar solo unit tests

```bash
npm test -- services.service
npm test -- appointments.service
npm test -- customers.service
```

### Ejecutar solo integration tests

```bash
npm test -- services.repository
npm test -- appointments.repository
npm test -- customers.repository
```

---

## 🐛 Debugging Tests

### Modo Debug

```bash
# Activar debug
DEBUG=* npm test

# Debug de un test específico
DEBUG=* npm test -- "should create"
```

### Con Node Inspector

```bash
# Ejecutar con inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs run

# Luego abre: chrome://inspect
```

---

## 🔄 Integración con CI/CD

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  image: node:18
  script:
    - npm ci
    - npm test
```

---

## ⚡ Optimización de Velocidad

### Tests Rápidos (Unit Tests)

```bash
# Solo unit tests (~8 segundos)
npm test -- --grep "service.test"
```

### Tests Completos (Incluye Integration)

```bash
# Todos incluyendo BD (~40 segundos)
npm test
```

### Ejecutar en Paralelo

```bash
# Más threads para más velocidad
npm test -- --threads=8
```

---

## 🛑 Solución de Problemas

### Problema: "Cannot find module 'vitest'"

**Solución:**
```bash
npm install
npm test
```

### Problema: "SUPABASE_SERVICE_ROLE_KEY not found"

**Solución:**
```bash
# Verificar .env existe
ls -la .env

# Verificar credenciales
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Problema: "Timeout exceeded"

**Solución:**
```bash
# Aumentar timeout para integration tests
npm test -- --testTimeout=30000
```

### Problema: "Port already in use"

**Solución:**
```bash
# Matar procesos en puerto 5432 (Supabase)
lsof -ti:5432 | xargs kill -9
```

### Problema: Tests lentos

**Solución:**
```bash
# Ejecutar en paralelo
npm test -- --threads=4

# Solo unit tests
npm test -- --grep ".service.test"
```

---

## 📈 Monitoreo de Cobertura

### Generar Reporte

```bash
npm test -- --coverage
```

### Ver Reporte HTML

```bash
# Generar y abrir en navegador
npm test -- --coverage
open coverage/index.html
```

### Aumentar Cobertura

```bash
# Identificar líneas no cubiertas
npm test -- --coverage --reporter=lcov
```

---

## 🎯 Mejores Prácticas

### 1. Ejecutar Tests Antes de Commit

```bash
# Agregar pre-commit hook
echo "npm test" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Ejecutar Tests en CI/CD

Configura automáticamente en GitHub Actions o GitLab CI

### 3. Nombrar Tests Claramente

```typescript
// ✅ Bien
it('should create a service with valid input', async () => {})

// ❌ Mal
it('test 1', async () => {})
```

### 4. Usar Describe para Agrupar

```typescript
describe('ServiceService', () => {
  describe('create', () => {
    it('should create...', () => {})
  })
})
```

### 5. Limpiar Datos de Prueba

```typescript
afterEach(() => {
  vi.clearAllMocks()
})
```

---

## 📞 Comandos Útiles Rápidos

```bash
# Ejecutar todo
npm test

# Modo watch
npm run test:watch

# Coverage
npm test -- --coverage

# Un módulo
npm test -- services

# Un archivo
npm test -- services.service.test

# Con búsqueda
npm test -- -t "should create"

# Verbose
npm test -- --reporter=verbose

# HTML report
npm test -- --coverage --reporter=html
```

---

## 🎓 Estructura de un Test

```typescript
// 1. Imports
import { describe, it, expect, beforeEach } from 'vitest'

// 2. Describir suite
describe('ServiceService', () => {
  
  // 3. Variables compartidas
  let service: ServiceService
  let mockRepository: any
  
  // 4. Setup antes de cada test
  beforeEach(() => {
    mockRepository = {
      list: vi.fn(),
    }
    service = new ServiceService(mockRepository)
  })
  
  // 5. Test individual
  it('should list services', async () => {
    // Arrange
    mockRepository.list.mockResolvedValue([...])
    
    // Act
    const result = await service.list()
    
    // Assert
    expect(result).toHaveLength(1)
    expect(mockRepository.list).toHaveBeenCalled()
  })
})
```

---

## ✅ Checklist Antes de Deployment

- [ ] `npm test` pasa sin errores
- [ ] Cobertura > 80%
- [ ] Sin warnings en consola
- [ ] Integration tests pasan con BD real
- [ ] .env configurado correctamente
- [ ] No hay tests skip (`.skip`)
- [ ] No hay tests only (`.only`)
- [ ] Documentación actualizada

---

## 📖 Referencias

- [Vitest Docs](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Jest Matchers](https://vitest.dev/api/expect)

---

¡Listo para testear! 🚀
