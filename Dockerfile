# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Instalar dumb-init para manejar signals correctamente
RUN apk add --no-cache dumb-init

# Copiar package.json (para producción)
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código compilado desde builder
COPY --from=builder /app/dist ./dist

# Exponer puerto (default 5000, configurable)
ARG PORT=5000
ENV PORT=$PORT
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/healthcheck', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Usar dumb-init para ejecutar node (mejor manejo de signals)
ENTRYPOINT ["dumb-init", "--"]

# Comando por defecto
CMD ["node", "dist/main.js"]
