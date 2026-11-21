# Drawer

Contenedor lateral obligatorio para todo detalle, formulario o acción secundaria; en TecnoTaller nunca se usan modales centrados ni páginas nuevas para ver, crear o editar (ver README, "Drawers").

- `tamano="registro"` (760px) para trabajar un registro: detalle de orden, ficha de cliente. Organiza sus partes con pestañas dentro del cuerpo.
- `tamano="formulario"` (480px) para crear o editar: nueva orden, registrar cliente, agregar ítem, ajustar stock.
- `clave` va en mono (`OT-2026-00184`) y puede llevar un `EstadoOrden`; `titulo` en Sora.
- `pie`: Cancelar o Cerrar primero y una sola acción `Button variant="primary"` al final. En celular solo se muestra la primaria, a todo el ancho.
- `onVolver` cuando se abrió desde otro drawer: el nuevo reemplaza al anterior, nunca se apilan.

El consumidor controla `abierto`, pasa `onCerrar` (lo llaman la X, Esc y el clic fuera) y, si el formulario tiene cambios sin guardar, muestra dentro del cuerpo o sobre el pie una barra `amber-soft` para confirmar antes de cerrar.
