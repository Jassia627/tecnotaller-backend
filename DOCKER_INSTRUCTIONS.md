# 🐳 Dockerización del Backend TecnoTaller

## Requisitos Previos

- Docker instalado (v20.10+)
- Docker Compose instalado (v1.29+)
- Archivo `.env` con las variables de entorno necesarias

## Variables de Entorno Requeridas

Crea un archivo `.env` en la raíz del proyecto con:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=*
NODE_ENV=production
PORT=5000
```

## Construcción de la Imagen

### Opción 1: Construcción Manual

```bash
# Construir imagen
docker build -t tecnotaller-backend:latest .

# Construir con puerto personalizado
docker build --build-arg PORT=3000 -t tecnotaller-backend:3000 .
```

### Opción 2: Usando Docker Compose (Recomendado)

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en background
docker-compose up -d --build

# Ver logs
docker-compose logs -f tecnotaller-backend

# Detener
docker-compose down
```

## Ejecución del Contenedor

### Ejecutar desde imagen compilada

```bash
docker run -p 5000:5000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e JWT_SECRET=your-secret \
  -e CORS_ORIGIN=* \
  tecnotaller-backend:latest
```

### Ejecutar con archivo .env

```bash
docker run -p 5000:5000 \
  --env-file .env \
  tecnotaller-backend:latest
```

## Verificar que el Contenedor Está Funcionando

```bash
# Verificar healthcheck
curl http://localhost:5000/healthcheck

# Esperado:
# {"status":"ok","timestamp":"2026-02-14T10:30:00Z"}

# Verificar OpenAPI docs
curl http://localhost:5000/docs
```

## Información de la Imagen

### Tamaño

- **Stage 1 (Builder)**: ~500MB (incluye dev dependencies)
- **Stage 2 (Runtime)**: ~250MB (solo prod dependencies)
- **Compresión final**: ~120MB

### Base Image

- **Node.js**: v18-alpine (lightweight, ~150MB)
- **Alpine Linux**: Reduce tamaño significativamente

### Healthcheck

- Intervalo: 30 segundos
- Timeout: 10 segundos
- Período de inicio: 40 segundos
- Reintentos: 3

## Push a Docker Hub

### 1. Login en Docker Hub

```bash
docker login -u your-username
```

### 2. Tagear la imagen

```bash
# Reemplazar 'jassiaguzman' con tu usuario de Docker Hub
docker tag tecnotaller-backend:latest jassiaguzman/tecnotaller-backend:latest
docker tag tecnotaller-backend:latest jassiaguzman/tecnotaller-backend:1.0.0
```

### 3. Push a Docker Hub

```bash
docker push jassiaguzman/tecnotaller-backend:latest
docker push jassiaguzman/tecnotaller-backend:1.0.0
```

### 4. Verificar en Docker Hub

Visita: https://hub.docker.com/r/jassiaguzman/tecnotaller-backend

## Desarrollo Local

Para desarrollo, no uses Docker. En su lugar:

```bash
npm install
npm run dev
```

## Troubleshooting

### Error: "Port already in use"

```bash
# Cambiar puerto
docker run -p 3000:5000 tecnotaller-backend:latest

# O con docker-compose
# Editar docker-compose.yml y cambiar puertos
```

### Error: "SUPABASE_URL not found"

```bash
# Asegurar que .env existe y tiene todas las variables
cat .env

# O pasar variables directamente
docker run -p 5000:5000 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_ROLE_KEY=your-key \
  -e JWT_SECRET=your-secret \
  tecnotaller-backend:latest
```

### Ver logs del contenedor

```bash
docker logs -f container-id

# O con docker-compose
docker-compose logs -f tecnotaller-backend
```

## Notas de Producción

- Usa **Node 18 LTS** (soporte extendido hasta abril 2025)
- Alpine Linux reduce la superficie de ataque
- Health checks automáticos
- Manejo correcto de signals con dumb-init
- Multi-stage build reduce tamaño de imagen
- No incluye dependencias de desarrollo

## CI/CD Integration

Para GitHub Actions, crear `.github/workflows/docker.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [master]

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: ${{ secrets.DOCKER_USERNAME }}/tecnotaller-backend:latest
```

---

Para más información sobre Docker: https://docs.docker.com/
