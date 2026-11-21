/* @ds-bundle: {"format":4,"namespace":"TecnoTaller","components":[{"name":"Button"},{"name":"EstadoOrden"},{"name":"TrazaOrden"},{"name":"Drawer"}]} */
(function () {
  var React = window.React, h = React.createElement;
  var ICON = {
    ingresado: ["M4 13h4l1.5 2.5h5L16 13h4", "M5.5 6h13L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z"],
    revision: ["M17 11a6 6 0 1 1-12 0a6 6 0 0 1 12 0", "m20 20-4.5-4.5", "M9 11h4"],
    repuesto: ["M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z", "M3.5 8 12 12l8.5-4M12 12v8"],
    reparacion: ["M4.96 16.84L11.37 10.44A4.7 4.7 0 0 1 17.79 4.23L15.11 6.91A1.4 1.4 0 0 0 17.09 8.89L19.77 6.21A4.7 4.7 0 0 1 13.56 12.63L7.16 19.04A1.55 1.55 0 0 1 4.96 16.84Z"],
    reparado: ["M20 12a8 8 0 1 1-16 0a8 8 0 0 1 16 0", "m8.5 12.2 2.4 2.3 4.6-4.8"],
    listo: ["M5 8h14l-1 11H6z", "M9 8V7a3 3 0 0 1 6 0v1"],
    entregado: ["M4 12h11", "m11 8 4 4-4 4", "M15 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4"]
  };
  var NOMBRE = { ingresado: "Ingresado", revision: "En revisión", repuesto: "Esperando repuesto", reparacion: "En reparación", reparado: "Reparado", listo: "Listo para entrega", entregado: "Entregado" };
  var ORDEN = ["ingresado", "revision", "repuesto", "reparacion", "reparado", "listo", "entregado"];
  function Icono(p) {
    return h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
      (ICON[p.estado] || []).map(function (d, i) { return h("path", { key: i, d: d }); }));
  }
  function Button(p) {
    var variant = p.variant || "secondary", rest = Object.assign({}, p);
    delete rest.variant;
    rest.className = ["tt-btn", "tt-btn-" + variant, p.className].filter(Boolean).join(" ");
    return h("button", rest, p.children);
  }
  function EstadoOrden(p) {
    var e = NOMBRE[p.estado] ? p.estado : "ingresado";
    return h("span", { className: "tt-estado tt-e-" + e }, h(Icono, { estado: e }), NOMBRE[e]);
  }
  function TrazaOrden(p) {
    var actual = ORDEN.indexOf(p.estado), fechas = p.fechas || {};
    return h("ol", { className: "tt-traza", "aria-label": "Seguimiento de la orden" }, ORDEN.map(function (e, i) {
      var cls = i < actual ? "is-hecho" : i === actual ? "is-actual" : "is-pendiente";
      return h("li", { key: e, className: "tt-paso " + cls, "aria-current": i === actual ? "step" : undefined },
        h("span", { className: "tt-punto" }, h(Icono, { estado: e })),
        h("span", { className: "tt-paso-titulo" }, NOMBRE[e]),
        fechas[e] ? h("span", { className: "tt-paso-meta" }, fechas[e]) : null);
    }));
  }
  var X = ["M6 6l12 12", "M18 6 6 18"], BACK = ["M19 12H5", "M11 6l-6 6 6 6"];
  function Glyph(p) { return h("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, p.d.map(function (d, i) { return h("path", { key: i, d: d }); })); }
  function Drawer(p) {
    var ref = React.useRef(null);
    React.useEffect(function () {
      if (p.abierto === false || p.enLinea) return;
      var prev = document.activeElement;
      function key(e) { if (e.key === "Escape" && p.onCerrar) p.onCerrar(); }
      document.addEventListener("keydown", key);
      if (ref.current) ref.current.focus();
      return function () { document.removeEventListener("keydown", key); if (prev && prev.focus) prev.focus(); };
    }, [p.abierto, p.enLinea]);
    if (p.abierto === false) return null;
    var panel = h("div", { className: "tt-drawer tt-drawer-" + (p.tamano || "registro"), role: "dialog", "aria-modal": p.enLinea ? undefined : "true", "aria-label": p.titulo },
      h("div", { className: "tt-drawer-h" },
        h("div", { className: "tt-drawer-hl" },
          p.onVolver ? h("button", { className: "tt-icon-btn", "aria-label": "Volver", onClick: p.onVolver }, h(Glyph, { d: BACK })) : null,
          h("div", null,
            p.clave ? h("div", { className: "tt-drawer-k" }, p.clave) : null,
            h("h2", { className: "tt-drawer-t" }, p.titulo),
            p.subtitulo ? h("div", { className: "tt-drawer-s" }, p.subtitulo) : null)),
        h("button", { className: "tt-icon-btn", "aria-label": "Cerrar", onClick: p.onCerrar, ref: ref }, h(Glyph, { d: X }))),
      h("div", { className: "tt-drawer-b" }, p.children),
      p.pie ? h("div", { className: "tt-drawer-f" }, p.pie) : null);
    if (p.enLinea) return h("div", { className: "tt-drawer-host" }, h("div", { className: "tt-scrim tt-scrim-inline" }), panel);
    return h("div", { className: "tt-scrim", onClick: function (e) { if (e.target === e.currentTarget && p.onCerrar) p.onCerrar(); } }, panel);
  }
  window.TecnoTaller = Object.assign(window.TecnoTaller || {}, { Button: Button, EstadoOrden: EstadoOrden, TrazaOrden: TrazaOrden, Drawer: Drawer, ESTADOS: ORDEN });
})();
