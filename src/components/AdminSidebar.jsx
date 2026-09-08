import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearToken } from "../api/authClient.js";
import useBloquearScroll from "../hooks/useBloquearScroll.js";
import useContextoComercial from "../hooks/useContextoComercial.js";
import useDialogo from "../hooks/useDialogo.js";
import LogoYima from "./LogoYima.jsx";
import ToggleTemaAdmin from "./ToggleTemaAdmin.jsx";

// `min-h-11` = 44px, el piso de área táctil que mide `admin-mobile.spec.js`.
// Con `py-3` sobre `text-label-md` (14px, interlínea 1.2) estos controles
// medían 42px: dos píxeles de menos, en las dieciséis pantallas del panel y en
// cada ítem del menú. El padding sigue mandando cuando el contenido crece; el
// `min-h` solo pone el piso.
const linkBase =
  "flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 font-label-md text-label-md uppercase tracking-widest transition-colors";
const linkInactivo = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";
const linkActivo = "bg-primary text-on-primary";

function claseLink({ isActive }, extra = "") {
  return `${linkBase} ${isActive ? linkActivo : linkInactivo} ${extra}`.trim();
}

// Bottom nav (desktop): mismos colores que linkActivo/linkInactivo, pero
// apilado ícono-arriba/texto-abajo en vez de en fila, y sin mayúsculas
// forzadas por tracking-widest (no entra en el ancho chico de cada tab).
const tabBase =
  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 font-label-sm text-label-sm transition-colors";
const tabInactivo = "text-on-surface-variant hover:bg-surface-container hover:text-on-surface";
const tabActivo = "bg-primary text-on-primary";

function claseTab({ isActive }) {
  return `${tabBase} ${isActive ? tabActivo : tabInactivo}`;
}

/**
 * `soloEscritorio` marca los módulos que NO existen para el celular.
 *
 * El calendario comercial es una grilla de siete columnas con barras que
 * atraviesan la semana: a 412 px no hay forma honesta de mostrarlo. Por eso
 * estos ítems se ocultan por debajo de `lg` (1024px), que es EL MISMO umbral
 * con el que `SoloEscritorio.jsx` deja entrar a la pantalla — si el aviso
 * "necesita una pantalla más grande" aparece a un ancho, el enlace que lleva
 * ahí tiene que estar oculto a ese mismo ancho.
 *
 * Antes se filtraban del drawer con `.filter()` en JS, porque el drawer era la
 * navegación solo hasta 1023px y de ahí en adelante mandaba la bottom nav. Con
 * el corte de la bottom nav corrido a 1360px (07/09/2026, ver el comentario
 * histórico del `<nav>` de abajo) ese filtro los volvía inalcanzables entre
 * 1024 y 1359 —iPad apaisado, portátil de 1280—, que es justo donde las
 * pantallas SÍ funcionan. Ahora se renderizan siempre y se ocultan con
 * `hidden lg:flex`. **El 08/09/2026 el corte de la bottom nav volvió a `lg`**
 * (la reorganización de la nav en cinco ítems + dos acordeones dejó de
 * desbordar a 1024px, medido), así que hoy el drawer y la bottom nav alternan
 * en el MISMO punto que este filtro — pero siguen siendo dos preguntas
 * distintas (qué ítems existen para el tamaño de pantalla vs. qué shell de
 * navegación se muestra) que solo comparten número por coincidencia.
 *
 * Se resuelve con un flag en el dato y CSS, NO con `matchMedia`: el frontend no
 * tiene ninguno y el plan del admin responsive lo descarta a propósito. Mismo
 * mecanismo que `soloChico` en `EditorTabs.jsx` y `soloEscritorio` en
 * `constants/hero.js`.
 */
const ITEMS_NAV = [
  { to: "/catalogo/admin/productos", icono: "inventory_2", label: "Productos" },
  { to: "/catalogo/admin/ordenes", icono: "receipt_long", label: "Órdenes" },
  { to: "/catalogo/admin/campanias", icono: "calendar_month", label: "Campañas", soloEscritorio: true },
  { to: "/catalogo/admin/promociones", icono: "sell", label: "Promociones", soloEscritorio: true },
  { to: "/catalogo/admin/logs", icono: "history", label: "Logs" },
];

// Las seis pantallas de analítica, agrupadas bajo el mismo acordeón que
// Configuración. El sexto ítem, `analytics/campanias`, MIDE campañas y
// promociones (clicks, impresiones) — es una pantalla distinta del editor
// `/catalogo/admin/campanias` que ya vive en `ITEMS_NAV`. Como los dos se
// llamarían "Campañas" en el mismo menú, este usa el título que la propia
// pantalla muestra en su `<h1>` ("Métricas comerciales") en vez de inventar
// un rótulo nuevo: desambigua sin duplicar una tercera decisión de nombre.
const ITEMS_ANALYTICS = [
  { to: "/catalogo/admin/analytics/ventas", icono: "payments", label: "Ventas" },
  { to: "/catalogo/admin/analytics/embudo", icono: "filter_alt", label: "Embudo" },
  { to: "/catalogo/admin/analytics/clientes", icono: "group", label: "Clientes" },
  { to: "/catalogo/admin/analytics/operacion", icono: "pending_actions", label: "Operación" },
  { to: "/catalogo/admin/analytics/metricas", icono: "query_stats", label: "Métricas" },
  { to: "/catalogo/admin/analytics/campanias", icono: "campaign", label: "Métricas comerciales" },
];

const ITEMS_CONFIGURACION = [
  { to: "/catalogo/admin/configuracion/categorias", label: "Categorías" },
  { to: "/catalogo/admin/configuracion/etiquetas", label: "Etiquetas" },
  { to: "/catalogo/admin/configuracion/anuncios", label: "Anuncios" },
  { to: "/catalogo/admin/configuracion/usuarios", label: "Usuarios" },
];

/**
 * Navegación del panel admin. Dos presentaciones completamente distintas
 * según el tamaño de pantalla — no es la misma barra reposicionada:
 *
 * - Mobile/tablet/portátil chico (< 1024px, `lg`): drawer lateral fixed,
 *   colapsado por defecto, se abre con el botón de la barra superior de
 *   `AdminLayout.jsx` y flota con overlay. Es un diálogo modal de verdad, no
 *   solo una superficie que corre por CSS: `useDialogo` le da foco inicial,
 *   trampa de foco y cierre por Escape, y `useBloquearScroll` bloquea el
 *   scroll de la página de atrás mientras está abierto.
 * - Desktop (≥ 1024px, `lg`): bottom nav horizontal fijo abajo (`fixed
 *   inset-x-0 bottom-0`), siempre visible, sin colapsar — logo a la
 *   izquierda, tabs ícono+label centradas, "Cerrar sesión" a la derecha.
 *
 * "Configuración" (submenu Categorías/Usuarios) es un dropdown hacia
 * arriba en el bottom nav (el submenu no tiene lugar hacia abajo, la
 * barra ya está pegada al borde inferior de la pantalla).
 */
function AdminSidebar({ colapsada, onCerrar }) {
  // El Doodle del PANEL, que puede ser el de otra campaña que el del catálogo o
  // ninguno: cada campaña decide por separado dónde aparece. Sin campaña activa
  // es null y los dos logos pintan la marca de siempre.
  const { doodleAdmin } = useContextoComercial();
  const doodleUrl = doodleAdmin?.url ?? null;

  const location = useLocation();
  const navigate = useNavigate();
  const enConfiguracion = location.pathname.startsWith("/catalogo/admin/configuracion");
  const enAnalytics = location.pathname.startsWith("/catalogo/admin/analytics");
  const [configuracionAbierta, setConfiguracionAbierta] = useState(enConfiguracion);
  const [menuConfigDesktopAbierto, setMenuConfigDesktopAbierto] = useState(false);
  const [analyticsAbierta, setAnalyticsAbierta] = useState(enAnalytics);
  const [menuAnalyticsDesktopAbierto, setMenuAnalyticsDesktopAbierto] = useState(false);

  const abierto = !colapsada;
  const drawerRef = useDialogo({ abierto, onCerrar });
  useBloquearScroll(abierto);

  useEffect(() => {
    if (enConfiguracion) {
      setConfiguracionAbierta(true);
    } else {
      setMenuConfigDesktopAbierto(false);
    }
  }, [enConfiguracion]);

  useEffect(() => {
    if (enAnalytics) {
      setAnalyticsAbierta(true);
    } else {
      setMenuAnalyticsDesktopAbierto(false);
    }
  }, [enAnalytics]);

  function handleCerrarSesion() {
    clearToken();
    navigate("/catalogo/admin/login");
  }

  return (
    <>
      {/* Mobile/tablet: overlay del drawer colapsable */}
      {!colapsada && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}
      {/*
        El drawer no se desmonta al cerrarse: se corre fuera de pantalla con
        `-translate-x-full` para que la transición se pueda animar. Pero
        "fuera de la pantalla" no es "fuera de la página": sin `inert`, sus diez
        enlaces siguen en el orden de tabulado y quien navega por teclado tabula
        por un menú que no puede ver. `inert` los saca del foco y del árbol de
        accesibilidad sin tocar la animación.

        `role="dialog"` + `aria-modal="true"` + `aria-label="Menú"` son la otra
        mitad de que sea un diálogo modal de verdad y no una superficie que
        solo se ve como tal: `tabIndex={-1}` es lo que le permite a `useDialogo`
        darle foco al contenedor si algún día quedara sin ningún control
        enfocable adentro.
      */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        tabIndex={-1}
        inert={colapsada}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-outline-variant bg-surface-container-lowest px-4 py-6 shadow-ambient transition-transform lg:hidden ${
          colapsada ? "-translate-x-full" : "translate-x-0"
        }`}
      >
        <div>
          {/* El logo aporta la marca y "ADMIN" la califica: juntos dan el mismo
              nombre accesible que tenía el texto, sin repetir "YIMA" dos veces. */}
          <span className="mb-8 flex items-baseline gap-2 px-2">
            <LogoYima className="h-7 self-center" doodleUrl={doodleUrl} />
            <span className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
              Admin
            </span>
          </span>
          <nav className="flex flex-col gap-1">
            {ITEMS_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                // `hidden lg:flex` para los solo-escritorio: `hidden` es la
                // última utilidad de `display` que emite Tailwind, así que le
                // gana al `flex` de `linkBase` sin importar el orden del
                // atributo, y `lg:flex` va en su media query, después de todas
                // las utilidades sin prefijo. Oculto además los saca del orden
                // de tabulado, que es lo que hay que lograr: un enlace visible
                // solo para el lector de pantalla llevaría a la pantalla que
                // `SoloEscritorio` bloquea a ese mismo ancho.
                className={(estado) => claseLink(estado, item.soloEscritorio ? "hidden lg:flex" : "")}
                onClick={onCerrar}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icono}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setAnalyticsAbierta((abierta) => !abierta)}
              className={`${linkBase} ${enAnalytics ? linkActivo : linkInactivo} justify-between`}
              aria-expanded={analyticsAbierta}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                Analítica
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {analyticsAbierta ? "expand_less" : "expand_more"}
              </span>
            </button>
            {analyticsAbierta && (
              <div className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-4">
                {ITEMS_ANALYTICS.map((item) => (
                  <NavLink key={item.to} to={item.to} className={claseLink} onClick={onCerrar}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setConfiguracionAbierta((abierta) => !abierta)}
              // Antes hardcodeaba `linkInactivo`: el botón nunca se pintaba
              // activo aunque estuvieras parado en una hija. Se corrige acá
              // junto con el alta de Analytics para que los dos acordeones
              // sigan la misma regla (la que ya usaba la bottom nav).
              className={`${linkBase} ${enConfiguracion ? linkActivo : linkInactivo} justify-between`}
              aria-expanded={configuracionAbierta}
            >
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Configuración
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {configuracionAbierta ? "expand_less" : "expand_more"}
              </span>
            </button>
            {configuracionAbierta && (
              <div className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-4">
                {ITEMS_CONFIGURACION.map((item) => (
                  <NavLink key={item.to} to={item.to} className={claseLink} onClick={onCerrar}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t border-outline-variant pt-4">
          <ToggleTemaAdmin />
          <button
            type="button"
            onClick={handleCerrarSesion}
            className={`${linkBase} ${linkInactivo}`}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Desktop: bottom nav horizontal fija, siempre visible.

          ⚠️ HISTORIA DEL CORTE (07/09/2026 → 08/09/2026), para que nadie vuelva
          a bajarlo sin saber qué se rompió la primera vez:

          Con DIEZ ítems en la barra (los cinco de hoy más Analytics y
          Configuración desplegados en línea, más los dos solo-escritorio), el
          corte se subió de `lg` (1024px) a `min-[1360px]` por una medición, no
          por estética. La barra no llevaba `flex-wrap` ni scroll, su ancho
          INTRÍNSECO era de 1326px, y lo que no entraba se pintaba fuera del
          viewport SIN generar scroll de documento (`overflow-x` computaba
          `visible`, `scrollWidth === innerWidth`). No había forma de llegar
          con el mouse: "Cerrar sesión" empezaba en x=1134 y quedaba invisible
          por debajo de ese ancho, el toggle de tema por debajo de 1082 y
          "Configuración" por debajo de 943. A 1024 `elementFromPoint`
          directamente no devolvía ni el toggle ni el logout — y a ese ancho el
          drawer, que sí tiene su propio logout, ya estaba apagado. El agujero
          se abría EXACTAMENTE en el breakpoint `lg`, e incluía 1280, el
          viewport del propio E2E de escritorio del proyecto.

          `overflow-x-auto` no era arreglo (una barra fija que scrollea de
          costado no se descubre) ni colapsar a solo-ícono (diez íconos sin
          rótulo en el ancho de portátil más común cambia un bloqueo por una
          navegación que hay que adivinar). La salida entonces fue correr el
          corte a 1360 y dejar que el drawer, con sus rótulos completos,
          atendiera 1024–1359.

          **La reorganización del 08/09/2026 (diez ítems → cinco más dos
          acordeones desplegables) sacó la causa, no solo el síntoma**: menos
          ítems en la fila significa menos ancho intrínseco. Se volvió a medir
          en navegador antes de tocar el número — mismo método que la vez
          anterior, `scrollWidth`/`elementFromPoint` reales, no "se ve
          apretado" — a 1024, 1100 y 1280px: la barra entra
          (`scrollWidth <= innerWidth` en los tres) y "Cerrar sesión" recibe el
          click en su centro en los tres. El detalle de la medición vive en
          `docs/reglas/admin-panel.md` y en el guard de
          `e2e/admin-desktop-layout.spec.js`. Con eso el corte volvió a `lg`
          (1024px), el mismo que ya usaba `SoloEscritorio.jsx` y el filtro
          `soloEscritorio` de acá arriba — y por eso ahora coincide con ese
          otro uso de `lg` sin ser la misma pregunta (ver el comentario de
          `ITEMS_NAV`).

          Sus ítems llaman a `onCerrar` aunque el drawer sea `lg:hidden`, y no
          es redundante: abrir el drawer por debajo de `lg` y ensanchar la
          ventana esconde el `<aside>` por CSS sin que React se entere, así que
          `useBloquearScroll` deja el body bloqueado y `useDialogo` sigue
          atrapando el foco en enlaces invisibles. Detectar el cruce pediría
          `matchMedia` —el primer breakpoint en JS del proyecto, que el plan
          del admin responsive descarta a propósito—, así que la salida es
          esta: la bottom nav ya está en pantalla y cualquier toque suyo libera
          el drawer fantasma, incluida la pestaña ACTUAL, que no navega y por
          eso no dispara el cierre por cambio de ruta de `AdminLayout`. Residuo
          asumido y documentado en CLAUDE.md: hasta ese toque (o Escape, o
          navegar) el scroll sigue bloqueado. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 hidden items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-6 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:flex">
        <LogoYima className="h-6 shrink-0" doodleUrl={doodleUrl} />

        <div className="flex items-center gap-2">
          {ITEMS_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={claseTab} onClick={onCerrar}>
              <span className="material-symbols-outlined text-[20px]">{item.icono}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onCerrar();
                setMenuAnalyticsDesktopAbierto((abierto) => !abierto);
              }}
              className={`${tabBase} ${enAnalytics ? tabActivo : tabInactivo}`}
              aria-expanded={menuAnalyticsDesktopAbierto}
            >
              <span className="material-symbols-outlined text-[20px]">analytics</span>
              <span className="flex items-center gap-1">
                Analítica
                <span className="material-symbols-outlined text-[16px]">
                  {menuAnalyticsDesktopAbierto ? "expand_more" : "expand_less"}
                </span>
              </span>
            </button>
            {menuAnalyticsDesktopAbierto && (
              <div className="absolute bottom-full left-1/2 mb-2 flex w-52 -translate-x-1/2 flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-ambient">
                {ITEMS_ANALYTICS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={claseLink}
                    onClick={() => setMenuAnalyticsDesktopAbierto(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                onCerrar();
                setMenuConfigDesktopAbierto((abierto) => !abierto);
              }}
              className={`${tabBase} ${enConfiguracion ? tabActivo : tabInactivo}`}
              aria-expanded={menuConfigDesktopAbierto}
            >
              <span className="material-symbols-outlined text-[20px]">settings</span>
              <span className="flex items-center gap-1">
                Configuración
                <span className="material-symbols-outlined text-[16px]">
                  {menuConfigDesktopAbierto ? "expand_more" : "expand_less"}
                </span>
              </span>
            </button>
            {menuConfigDesktopAbierto && (
              <div className="absolute bottom-full left-1/2 mb-2 flex w-44 -translate-x-1/2 flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-ambient">
                {ITEMS_CONFIGURACION.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={claseLink}
                    onClick={() => setMenuConfigDesktopAbierto(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ToggleTemaAdmin compacto />
          <button
            type="button"
            onClick={handleCerrarSesion}
            className={`${linkBase} ${linkInactivo}`}
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  );
}

export default AdminSidebar;
