# Diagrama C4 Separado por Niveles - TechnoTaller

## Descripción

El modelo C4 arquitectónico se ha dividido en **3 diagramas independientes**, uno para cada nivel de detalle. Esto permite una visualización más clara y enfocada de cada aspecto de la arquitectura.

---

## 📊 Nivel 1: Contexto del Sistema

**Archivo:** `diagrama_c4_nivel1_contexto.puml`

### Propósito
Mostrar el sistema como una "caja negra" y su interacción con actores externos.

### Contiene
- **3 Actores**: Cliente, Técnico, Administrador
- **1 Sistema Principal**: TechnoTaller Backend
- **3 Sistemas Externos**: Email Service, SMS Service, Push Service
- **6 Interacciones**: Relaciones entre actores y sistema

### Audiencia
- No técnicos
- Stakeholders
- Product Owners

### Visualización
```
         Cliente
           |
        Técnico
           |
       Administrador
           
           ↓
    [TechnoTaller Backend]
           
         ↙  ↓  ↘
      Email SMS Push
```

---

## 🏗️ Nivel 2: Contenedores del Sistema

**Archivo:** `diagrama_c4_nivel2_contenedores.puml`

### Propósito
Descomponer el sistema en componentes principales desplegables y mostrar cómo se comunican.

### Contiene
- **5 Contenedores**:
  1. REST API (Node.js + Express)
  2. Auth Service (Supabase Auth)
  3. Base de Datos (PostgreSQL + Supabase)
  4. Realtime Engine (WebSocket)
  5. File Storage (Supabase Storage)

- **3 Sistemas Externos**: Email, SMS, Push

- **14+ Relaciones**: Comunicación entre componentes

### Audiencia
- Arquitectos
- Team Leads
- Desarrolladores senior

### Tecnologías Mostradas
| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| API | Node.js + Express | Punto de entrada |
| Auth | Supabase Auth | Autenticación |
| BD | PostgreSQL + Supabase | Persistencia |
| Realtime | Supabase Realtime | Actualizaciones en tiempo real |
| Storage | Supabase Storage | Archivos |

---

## 🔧 Nivel 3: Componentes del MVP

**Archivo:** `diagrama_c4_nivel3_componentes.puml`

### Propósito
Detalle interno de un contenedor (REST API) enfocado en el módulo principal (Work Orders).

### Contiene
- **8 Componentes** del módulo Work Orders:
  1. WorkOrder Controller
  2. WorkOrder Service
  3. State Machine
  4. Validator
  5. Repository
  6. Entity Mapper
  7. Audit Service
  8. Notifier Service

- **4 Capas Lógicas**:
  - Presentation (Controller)
  - Business Logic (Service, State Machine, Validator)
  - Data Access (Repository, Mapper)
  - Cross-Cutting (Auth, Audit, Notifier)

- **Componentes de Infraestructura**:
  - PostgreSQL Database
  - Email/SMS Services
  - Logger

### Audiencia
- Desarrolladores implementando Work Orders
- Revisores de código
- Técnicos especializados

### Patrones Mostrados
- **State Pattern**: Máquina de estados en Work Orders
- **Factory Pattern**: Entity Mapper
- **Observer Pattern**: Audit Service
- **Strategy Pattern**: Notifier Service
- **Repository Pattern**: Data Access
- **Middleware Pattern**: Auth Middleware

---

## 🎯 Cómo Descargar los Diagramas

### Opción 1: Editor Online (Recomendado)
```
1. Ve a: https://www.plantuml.com/plantuml/uml/
2. Copia contenido de:
   - diagrama_c4_nivel1_contexto.puml
   - diagrama_c4_nivel2_contenedores.puml
   - diagrama_c4_nivel3_componentes.puml
3. Pégalo en editor online
4. Click PNG para descargar
```

### Opción 2: VS Code + PlantUML
```
1. Instala extension "PlantUML"
2. Abre cada archivo .puml
3. Click derecho → Export as PNG
```

---

## 📊 Comparación de Niveles

| Aspecto | Nivel 1 | Nivel 2 | Nivel 3 |
|--------|--------|--------|--------|
| **Foco** | Contexto global | Arquitectura general | Arquitectura interna |
| **Elementos** | 3 actores + 1 sistema + 3 externos | 5 contenedores + 3 externos | 8 componentes + infra |
| **Relaciones** | 6 | 14+ | 20+ |
| **Audiencia** | No técnicos | Arquitectos | Desarrolladores |
| **Detalle** | Bajo | Medio | Alto |
| **Propósito** | Presentación | Decisiones | Implementación |

---

## 🔄 Flujo de Visualización Recomendado

### Para Presentación al Profesor
1. **Primero**: Nivel 1 (Contexto) - "Esto es TechnoTaller"
2. **Segundo**: Nivel 2 (Contenedores) - "Así está construido"
3. **Tercero**: Nivel 3 (Componentes) - "Estos son los detalles técnicos del MVP"

### Para Presentación a Cliente
1. **Solo**: Nivel 1 (Contexto) - "Esto es lo que hace el sistema"

### Para Presentación a Equipo Técnico
1. **Primero**: Nivel 2 (Contenedores) - "Arquitectura general"
2. **Segundo**: Nivel 3 (Componentes) - "Detalles de implementación"

---

## 📁 Archivos Generados

```
tecnotaller-backend/
├── diagrama_c4_nivel1_contexto.puml        (Contexto)
├── diagrama_c4_nivel2_contenedores.puml    (Contenedores)
├── diagrama_c4_nivel3_componentes.puml     (Componentes)
├── diagrama_c4_nivel1_contexto.png         (Descargado)
├── diagrama_c4_nivel2_contenedores.png     (Descargado)
├── diagrama_c4_nivel3_componentes.png      (Descargado)
└── DIAGRAMA_C4_SEPARADO_POR_NIVELES.md     (Este documento)
```

---

## ✨ Ventajas de Separar por Niveles

1. **Claridad**: Cada diagrama enfocado en un propósito específico
2. **Presentación**: Más fácil de mostrar según la audiencia
3. **Comprensión**: Menor sobrecarga de información
4. **Escalabilidad**: Fácil de expandir cada nivel sin hacer muy complejo
5. **Estándar C4**: Sigue correctamente el modelo C4 de Simon Brown

---

## 📚 Referencias

- **C4 Model**: https://c4model.com/
- **PlantUML C4**: https://plantuml.com/c4-diagram
- **Architecture Decision Records**: https://martinfowler.com/articles/adr/

---

## ✅ Validación

- ✅ Nivel 1: Contexto claro y simple
- ✅ Nivel 2: 5 contenedores principales identificados
- ✅ Nivel 3: 8 componentes del MVP (Work Orders) detallados
- ✅ Relaciones consistentes entre niveles
- ✅ Tecnologías especificadas
- ✅ Patrones de diseño mostrados

---

**Estado**: ✅ Completado y listo para presentar

*Generado: Agosto 2026*

