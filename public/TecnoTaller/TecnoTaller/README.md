# TecnoTaller — identidad visual

TecnoTaller es una app web para centros que venden dispositivos y reparan equipos electrónicos: un **portal del cliente** (catálogo, solicitud de servicios, seguimiento de la orden) y un **panel administrativo** (inventario, repuestos, órdenes, técnicos, garantías y reportes). La marca promete una sola cosa: **saber en qué está tu equipo**. Todo en la identidad sirve a esa idea de trazabilidad.

## Concepto del logo

El isotipo es una **T en itálica partida en dos tonos**: el azul noche (`navy`) es el taller —el técnico, el inventario, el registro— y el azul eléctrico (`blue`) es el cliente. La curva donde se encuentran es el traspaso: el equipo entra por un lado y sale reparado por el otro. La inclinación da sensación de avance, igual que la línea de estados de una orden.

- **Logo completo** (`tecnotaller-logo-original.png`): isotipo arriba + palabra "TecnoTaller" con "Tecno" en navy y "Taller" en blue. Es el archivo maestro.
- **Isotipo** (`tecnotaller-isotipo.svg`): redibujo vectorial del símbolo para web, favicon y documentos. Compararlo con el maestro antes de imprimir.
- **Isotipo a una tinta** (`tecnotaller-isotipo-mono.svg`): usa `currentColor`; para sellos, recibos térmicos, grabados o fondos de color.
- **Ícono de app** (`tecnotaller-icono-app.svg`): T sobre cuadrado navy con radio grande; mitad clara en blanco para que lea en pantallas oscuras.

Reglas:
- Área de protección: la altura del tallo de la T alrededor de todo el logo.
- Tamaño mínimo: isotipo 24px; logo completo 120px de ancho.
- Sobre fondos oscuros usa el ícono de app o el isotipo a una tinta en blanco; no pongas el logo bicolor sobre `navy`.
- No cambies los colores, no inviertas la inclinación, no le añadas sombras ni degradados.

## Color

Dos azules de marca y un sistema de estados. Los azules mandan; el resto de colores **siempre significa algo**.

| Rol | Token | Uso |
| --- | --- | --- |
| Marca taller | `navy` #09213D | barra lateral del panel, encabezados, logo |
| Marca cliente | `blue` #0074F9 | logo, ilustraciones, rellenos grandes |
| Acción | `blue-strong` | enlaces, botón primario, foco |
| Chispa | `spark` #FF8A1F | ofertas del catálogo, punto de notificación — con mucha moderación |
| Fondos | `surface`, `surface-raised`, `surface-sunken` | página, tarjetas, campos |
| Texto | `ink`, `ink-muted` | principal y secundario |

`blue` como texto solo en tamaños de 24px o más; para texto normal usa `blue-strong`. Todos los pares texto/fondo cumplen 4.5:1 en tema claro y oscuro.

## El sistema de estados (la firma de la marca)

Cada orden de servicio recorre siete estados. Cada uno tiene color, ícono y nombre fijos, iguales en el portal, el panel, los correos y los mensajes de WhatsApp:

| Estado | Fondo / texto | Ícono |
| --- | --- | --- |
| Ingresado | `surface-sunken` / `ink-muted` | bandeja |
| En revisión | `blue-soft` / `blue-strong` | lupa |
| Esperando repuesto | `amber-soft` / `amber` | caja |
| En reparación | `teal-soft` / `teal` | llave |
| Reparado | `green-soft` / `green` | check |
| Listo para entrega | `green` sólido / `on-green` | bolsa |
| Entregado | `ink` sólido / `surface` | flecha de salida |

El color nunca va solo: la etiqueta siempre lleva el nombre del estado y su ícono, así se distingue también en blanco y negro o con daltonismo. "Listo para entrega" es el único estado sólido verde porque es el que el cliente está esperando.

## Tipografía

- **Sora** (`display`) para titulares y cifras grandes: geométrica, técnica, acompaña la T del logo.
- **Inter** (`sans`) para toda la interfaz: legible en tablas densas del panel.
- **JetBrains Mono** (`mono`) para datos que se copian o se dictan: número de orden (`OT-2026-00184`), IMEI, número de serie, código de repuesto.

Las tres son gratuitas en Google Fonts.

## Forma y espacio

Esquinas suaves (`radius-md` 10px en botones y tarjetas), estados en píldora (`radius-pill`). Ritmo de 4px: `space-2`, `space-4`, `space-6`. El panel usa bordes `line` en lugar de sombras; el portal del cliente puede usar `shadow-card` en las tarjetas de orden.

## Iconografía

Íconos de trazo, 24px, trazo 1.75, puntas redondeadas, en `currentColor`. El juego base son los siete íconos de estado (grupo Icons). Para el resto de la interfaz usa un set libre del mismo estilo (por ejemplo Lucide).

## Voz

Clara, cercana y concreta. Hablamos del equipo del cliente, no del sistema.
- Sí: "Tu iPhone 13 está en reparación. Te avisamos cuando esté listo." · "Falta un repuesto: pantalla OLED. Llega el jueves."
- No: "La orden #184 cambió a estado 4." · tecnicismos sin explicar · signos de exclamación en avisos de demora.
- Fechas y horas siempre concretas ("jueves 21, 3:00 p. m."), nunca "pronto".

## Ideas para evolucionar el logo

Opciones a explorar a partir del símbolo actual, sin perder lo que ya funciona (la T itálica bicolor):
1. **T de traza**: tres puntos pequeños en el remate derecho de la barra, como la línea de estados avanzando.
2. **Tallo-destornillador**: afinar la punta inferior del tallo para que sugiera una punta de destornillador.
3. **Corte de circuito**: sustituir la curva de unión por un quiebre a 45° tipo pista de circuito impreso.
4. **Wordmark propio**: dibujar "TecnoTaller" en Sora Bold itálica para que la palabra y el símbolo compartan inclinación; hoy la palabra va recta y el símbolo inclinado.

## Drawers: la regla de interacción

**Todo lo que se abre desde una pantalla se abre en un drawer.** En TecnoTaller no se usan modales centrados, ventanas `alert()` / `confirm()` del navegador ni páginas nuevas para ver un detalle, crear o editar. El drawer se desliza encima de la lista, se resuelve la tarea y la persona vuelve al mismo punto.

Anatomía (componente `Drawer`):
1. **Encabezado fijo**: clave en mono (`OT-2026-00184`, "Cliente · CC …"), título en Sora, estado de la orden si aplica y botón cerrar. Si se abrió desde otro drawer, lleva flecha de volver.
2. **Cuerpo con scroll**: solo el cuerpo se desplaza. Si el registro tiene varias partes, van en pestañas dentro del drawer.
3. **Pie fijo**: una sola acción primaria (`blue-strong`) a la derecha y Cancelar o Cerrar a su izquierda. En celular queda solo la acción primaria a todo el ancho; se cierra con la X.

Tamaños:
| Tipo | Ancho | Para |
| --- | --- | --- |
| Registro | 760px | detalle de orden, ficha de cliente (con pestañas) |
| Formulario | 480px | nueva orden, registrar cliente, agregar ítem, ajustar stock, apartar producto, notificaciones |
| Inferior | pantalla completa de ancho, desde abajo | menús en celular (el "Más" del panel) |

Comportamiento:
- Entra desde la derecha en 240ms (ease-out); en celular ocupa toda la pantalla. Sin animación si el usuario pidió reducir movimiento.
- Fondo `navy` al 45 %. Se cierra con la X, la tecla Esc o tocando fuera; el foco queda atrapado dentro mientras está abierto y vuelve al botón que lo abrió.
- Un drawer a la vez: abrir otro desde adentro lo reemplaza y aparece "volver". Nunca drawers apilados.
- Si hay cambios sin guardar, al cerrar aparece una barra `amber-soft` dentro del mismo drawer: "¿Descartar los cambios?" con Seguir editando / Descartar.
- Al guardar, el drawer se cierra o muestra el resultado, y un aviso breve (toast) confirma la acción.

## Uso en la app

Componentes en `components/bundle.js` como `window.TecnoTaller` (React 18): `Button`, `EstadoOrden` (etiqueta de estado), `TrazaOrden` (línea de tiempo de la orden, para el portal del cliente) y `Drawer` (contenedor de todo detalle, formulario o acción secundaria).
