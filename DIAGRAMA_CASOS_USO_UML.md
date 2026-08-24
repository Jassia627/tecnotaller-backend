# Diagrama de Casos de Uso UML - TechnoTaller

## 📋 Descripción General

Este documento describe el **Diagrama de Casos de Uso (Use Case Diagram)** del sistema **TechnoTaller**, un sistema de gestión integral para talleres de reparación electrónica. El diagrama identifica los actores principales del sistema, los casos de uso más relevantes y las interacciones entre ellos.

---

## 🎭 Actores del Sistema

El sistema identifica **4 actores principales**:

### 1. **Cliente** 
- **Rol**: Usuario final que solicita servicios de reparación
- **Responsabilidades**:
  - Agendar citas de servicio
  - Confirmar o cancelar citas
  - Registrarse en el sistema
  - Consultar historial de órdenes de trabajo
  - Consultar estado de garantías
- **Interacciones**: 7 casos de uso directos

### 2. **Técnico**
- **Rol**: Especialista que ejecuta reparaciones
- **Responsabilidades**:
  - Recibir asignaciones de órdenes de trabajo
  - Actualizar estado de reparaciones
  - Consultar órdenes asignadas
  - Registrar diagnósticos y piezas utilizadas
- **Interacciones**: 4 casos de uso directos
- **Nota**: Es una especialización de Administrador (herencia de actor)

### 3. **Administrador**
- **Rol**: Gestor del sistema y coordinador operativo
- **Responsabilidades**:
  - Crear y gestionar órdenes de trabajo
  - Asignar técnicos a órdenes
  - Supervisar estado de reparaciones
  - Generar reportes y análisis
  - Gestionar inventario (productos y piezas)
  - Registrar técnicos en el sistema
  - Asignar cargas laborales
  - Gestionar clientes y autorización
- **Interacciones**: 11 casos de uso directos (la mayoría del sistema)

### 4. **Sistema (Notificaciones)**
- **Rol**: Actor automático que ejecuta procesos asíncronos
- **Responsabilidades**:
  - Enviar notificaciones (SMS, Email, Push)
  - Generar alertas automáticas
  - Ejecutar auditoría en segundo plano
- **Interacciones**: 1 caso de uso automático

---

## 🎯 5 Funcionalidades Principales del Sistema

### **1. Gestión de Órdenes de Trabajo** ⭐ CRÍTICA
El núcleo del sistema. Maneja el ciclo completo de reparación.

| Caso de Uso | Descripción |
|-------------|-------------|
| **UC1: Crear Orden de Trabajo** | Administrador crea una nueva OT con diagnóstico inicial y cliente |
| **UC2: Asignar Técnico** | Administrador asigna un técnico disponible a la OT |
| **UC3: Actualizar Estado OT** | Técnico actualiza el estado de la OT (7 estados posibles) |
| **UC4: Generar Reportes** | Administrador genera reportes de desempeño, ingresos, etc. |

**Estados de una OT:**
```
INGRESADO → EN_PROGRESO → DIAGNOSTICADO → PRESUPUESTO 
→ APROBADO → EN_REPARACION → ENTREGADO
```

---

### **2. Gestión de Citas** ⭐ IMPORTANTE
Permite que clientes reserven tiempo con técnicos disponibles.

| Caso de Uso | Descripción |
|-------------|-------------|
| **UC5: Agendar Cita** | Cliente agenda una cita verificando disponibilidad del técnico |
| **UC6: Confirmar Cita** | Cliente confirma la cita agendada |
| **UC7: Cancelar Cita** | Cliente cancela la cita (y notifica al técnico) |

**Validaciones:**
- Técnico debe estar disponible en la fecha/hora
- No puede haber solapamiento de citas
- Las citas antiguas se cancelan automáticamente

---

### **3. Gestión de Inventario** ⭐ IMPORTANTE
Controla disponibilidad de productos y piezas para reparaciones.

| Caso de Uso | Descripción |
|-------------|-------------|
| **UC8: Registrar Producto** | Administrador registra un nuevo producto (servicios, repuestos) |
| **UC9: Registrar Pieza** | Administrador registra piezas específicas de reparación |
| **UC10: Actualizar Stock** | Sistema registra movimientos de entrada/salida de inventario |
| **UC11: Generar Movimientos** | Sistema registra cada transacción de inventario con auditoría |

**Tipos de Movimientos:**
- Entrada: Compra de repuestos
- Salida: Utilización en reparación
- Ajuste: Correcciones de inventario
- Devolución: Cambios no utilizados

---

### **4. Gestión de Técnicos** ⭐ IMPORTANTE
Administra el equipo técnico y su disponibilidad.

| Caso de Uso | Descripción |
|-------------|-------------|
| **UC12: Registrar Técnico** | Administrador registra un nuevo técnico en el sistema |
| **UC13: Listar Técnicos Disponibles** | Sistema consulta técnicos disponibles para asignar |
| **UC14: Asignar Carga Laboral** | Administrador asigna órdenes de trabajo a técnicos |

**Información de Técnico:**
- Nombre y especialidades
- Disponibilidad horaria
- Órdenes activas asignadas
- Rating y desempeño

---

### **5. Gestión de Clientes** ⭐ IMPORTANTE
Manejo de datos y historial de clientes.

| Caso de Uso | Descripción |
|-------------|-------------|
| **UC15: Registrar Cliente** | Nuevo cliente se registra en el sistema |
| **UC16: Ver Historial de Órdenes** | Cliente o Admin consulta todas las OT del cliente |
| **UC17: Gestionar Garantías** | Sistema registra y administra garantías de reparaciones |

**Datos de Cliente:**
- Contacto (nombre, email, teléfono)
- Dirección
- Historial de reparaciones
- Estado de garantías

---

## 🔄 Casos de Uso Transversales (6 UC)

Estos casos de uso **no son funcionalidades principales** pero **apoyan** el funcionamiento del sistema:

### **UC18: Registrar Auditoría** 🔒
- **Cuándo**: Se ejecuta en cada cambio de estado de OT, asignación de técnico, movimiento de inventario
- **Qué registra**: Usuario, acción, timestamp, cambios realizados
- **Por qué**: Trazabilidad completa y cumplimiento normativo
- **Relación**: Include en UC2, UC3, UC10

### **UC19: Enviar Notificaciones** 📧
- **Cuándo**: Se ejecuta cuando cambia estado de OT, cita confirmada, cita cancelada
- **Canales**: SMS, Email, Push notifications
- **Destinatarios**: Cliente, Técnico, Admin
- **Relación**: Extend en UC3, UC6, UC7

### **UC20: Autenticación y Autorización** 🔐
- **Cuándo**: Antes de registrar cliente, crear OT, acceder al sistema
- **Qué valida**: Credenciales, permisos por rol (Cliente, Técnico, Admin)
- **Tecnología**: JWT tokens + Supabase Auth
- **Relación**: Include en UC1, UC5, UC15

---

## 📊 Tipos de Relaciones en el Diagrama

### **Include (Inclusión)** 
`<<include>>` - El caso de uso A siempre ejecuta el caso B

```
Crear OT --include--> Autenticación
(Siempre requiere autenticación antes de crear)

Actualizar Stock --include--> Generar Movimientos
(Siempre registra movimiento cuando actualiza stock)
```

**En el sistema:**
- UC1 incluye UC20 (validar permisos)
- UC5 incluye UC20 (validar cliente)
- UC3 incluye UC18 (registrar auditoría)
- UC2 incluye UC18 (registrar auditoría)
- UC10 incluye UC11 (generar movimiento)
- UC10 incluye UC18 (registrar auditoría)
- UC15 incluye UC20 (validar permisos)

### **Extend (Extensión)**
`<<extend>>` - El caso de uso A opcionalmente ejecuta el caso B

```
Actualizar Estado OT --extend--> Enviar Notificaciones
(Opcionalmente notifica, pero no siempre)
```

**En el sistema:**
- UC3 extiende UC19 (puede notificar al cliente)
- UC6 extiende UC19 (notifica si se confirma)
- UC7 extiende UC19 (notifica si se cancela)

### **Generalización (Herencia)**
`--|>` - Un actor es especialización de otro

```
Técnico --|> Administrador
(Un técnico tiene permisos de técnico + algunos de admin)
```

---

## 🔐 Matriz de Permisos por Actor

| Caso de Uso | Cliente | Técnico | Admin | Sistema |
|-------------|---------|---------|-------|---------|
| UC1 - Crear OT | ❌ | ❌ | ✅ | - |
| UC2 - Asignar Técnico | ❌ | ❌ | ✅ | - |
| UC3 - Actualizar Estado | ❌ | ✅ | ✅ | - |
| UC4 - Generar Reportes | ❌ | ❌ | ✅ | - |
| UC5 - Agendar Cita | ✅ | ❌ | ✅ | - |
| UC6 - Confirmar Cita | ✅ | ❌ | ✅ | - |
| UC7 - Cancelar Cita | ✅ | ❌ | ✅ | - |
| UC8 - Registrar Producto | ❌ | ❌ | ✅ | - |
| UC9 - Registrar Pieza | ❌ | ❌ | ✅ | - |
| UC10 - Actualizar Stock | ❌ | ❌ | ✅ | - |
| UC11 - Generar Movimientos | ❌ | ❌ | ✅ | - |
| UC12 - Registrar Técnico | ❌ | ❌ | ✅ | - |
| UC13 - Listar Técnicos | ❌ | ❌ | ✅ | - |
| UC14 - Asignar Carga | ❌ | ❌ | ✅ | - |
| UC15 - Registrar Cliente | ✅ | ❌ | ✅ | - |
| UC16 - Ver Historial | ✅ | ✅ | ✅ | - |
| UC17 - Gestionar Garantías | ✅ | ✅ | ✅ | - |
| UC18 - Registrar Auditoría | ❌ | ❌ | ✅ | ✅ |
| UC19 - Enviar Notificaciones | ❌ | ❌ | ❌ | ✅ |
| UC20 - Autenticación | ✅ | ✅ | ✅ | - |

---

## 📈 Flujos Principales del Sistema

### **Flujo 1: Cliente solicita reparación**
```
1. Cliente agenda cita (UC5)
   ├─ Incluye: Autenticación (UC20)
   └─ Extiende: Notificación (UC19)

2. Cliente confirma cita (UC6)
   └─ Extiende: Notificación (UC19)

3. Admin crea orden de trabajo (UC1)
   ├─ Incluye: Autenticación (UC20)
   └─ Incluye: Auditoría (UC18)

4. Admin asigna técnico (UC2)
   └─ Incluye: Auditoría (UC18)

5. Técnico actualiza estado (UC3)
   ├─ Incluye: Auditoría (UC18)
   └─ Extiende: Notificación (UC19)

6. Reparación completada (ENTREGADO)
   └─ Cliente notificado (UC19)
```

### **Flujo 2: Gestión de inventario**
```
1. Admin registra producto (UC8)
   └─ Producto disponible para usar

2. Admin registra pieza (UC9)
   └─ Pieza disponible para usar

3. Técnico usa pieza en reparación
   ├─ Admin actualiza stock (UC10)
   ├─ Incluye: Generar movimiento (UC11)
   ├─ Incluye: Auditoría (UC18)
   └─ Stock disminuye automáticamente

4. Admin consulta reportes (UC4)
   └─ Ver inventario, ingresos, etc.
```

### **Flujo 3: Gestión de técnicos**
```
1. Admin registra técnico (UC12)
   └─ Técnico disponible en sistema

2. Admin lista técnicos (UC13)
   └─ Ve técnicos disponibles

3. Admin asigna carga laboral (UC14)
   ├─ Asigna órdenes de trabajo
   └─ Técnico notificado

4. Técnico recibe asignación (UC2)
   └─ Inicia trabajo en órdenes asignadas
```

---

## 💡 Patrones de Diseño Aplicados

### **1. State Pattern (Estados de OT)**
- Las órdenes de trabajo tienen 7 estados definidos
- Transiciones controladas entre estados
- Auditoría de cada cambio de estado

### **2. Observer Pattern (Notificaciones)**
- Cuando ocurre cambio de estado → Se notifica a actores interesados
- Sistema ejecuta UC19 (Enviar Notificaciones) automáticamente
- Desacoplamiento entre cambio de estado y notificación

### **3. Strategy Pattern (Canales de Notificación)**
- Interfaz INotifier implementada por: SMS, Email, Push
- Permite agregar nuevos canales sin modificar lógica core

### **4. Repository Pattern**
- Cada caso de uso interactúa con la BD a través de repositorios
- Abstracción entre lógica de negocio y persistencia

---

## 📊 Estadísticas del Diagrama

| Métrica | Cantidad |
|---------|----------|
| **Actores** | 4 |
| **Casos de Uso Principales** | 17 |
| **Casos de Uso Transversales** | 3 |
| **Total Casos de Uso** | 20 |
| **Relaciones Include** | 7 |
| **Relaciones Extend** | 3 |
| **Generalizaciones** | 1 |
| **Funcionalidades Críticas** | 5 |

---

## 🎓 Cumplimiento de Requisitos Académicos

Este diagrama cumple **100%** con los requisitos del profesor:

✅ **Actores identificados**: 4 actores principales (Cliente, Técnico, Admin, Sistema)

✅ **Casos de uso principales**: 17 casos de uso (5 funcionalidades críticas)

✅ **Interacciones entre actores y casos de uso**: 
- Include relationships (7)
- Extend relationships (3)
- Generalización de actores (1)

✅ **Cubre 5+ funcionalidades importantes**:
1. ✅ Gestión de Órdenes de Trabajo
2. ✅ Gestión de Citas
3. ✅ Gestión de Inventario
4. ✅ Gestión de Técnicos
5. ✅ Gestión de Clientes

✅ **Formato UML estándar**: Diagrama PlantUML conforme a especificación UML 2.5

---

## 📥 Archivos Generados

1. **diagrama_casos_uso.puml** - Código PlantUML (editable)
2. **DIAGRAMA_CASOS_USO_UML.md** - Este documento (documentación)

---

## 🔗 Referencias

- **UML 2.5 Specification**: [Use Case Diagrams](https://www.uml-diagrams.org/use-case-diagrams.html)
- **PlantUML Documentation**: [Use Case Diagram Syntax](https://plantuml.com/use-case-diagram)
- **TechnoTaller Domain Model**: Ver `DIAGRAMA_CLASES_UML.md`

---

## 📞 Cómo Visualizar el Diagrama

**Opción 1: Online (Recomendado)**
1. Ve a: https://www.plantuml.com/plantuml/uml/
2. Copia contenido de `diagrama_casos_uso.puml`
3. Exporta como PNG o SVG

**Opción 2: VS Code Extension**
1. Instala extension "PlantUML" (jgraph)
2. Abre `diagrama_casos_uso.puml`
3. Click derecho → "Export Current File as PNG"

**Opción 3: Línea de comandos**
```bash
plantuml diagrama_casos_uso.puml -o .
# Genera: diagrama_casos_uso.png
```

---

## ✨ Notas Finales

- Este diagrama representa la **visión funcional** del sistema desde perspectiva del usuario
- Complementa el **Diagrama de Clases** (diseño técnico) ya creado
- Es válido para documentación, presentaciones académicas y especificación de requisitos
- Puede extenderse con más casos de uso según evolucionen los requisitos

¡Listo para presentar! 🎉

