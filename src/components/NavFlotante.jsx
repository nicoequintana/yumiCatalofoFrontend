import { useLocation } from "react-router-dom";

/**
 * La isla flotante del catálogo en celular: desde el reparto del 05/09/2026 es
 * un único botón — la hamburguesa que abre `HojaMenu`.
 *
 * POR QUÉ ABAJO. El header es sticky y alcanzarlo pide estirar el pulgar hasta
 * el borde superior en cada movimiento. La isla vive donde la mano ya está.
 *
 * POR QUÉ UN SOLO CONTROL. Inicio, Buscar y Carrito volvieron al `Navbar`
 * (visible ahora también por debajo de `md`) y Carrito además se sumó a
 * `HojaMenu`: cuatro ranuras hacían de esto una segunda barra completa, y con
 * las acciones ya en el header arriba, la isla solo necesitaba seguir abriendo
 * el menú.
 *
 * A LA DERECHA, NO CENTRADA: es donde cae el pulgar en una mano que sostiene el
 * teléfono, y con un solo control ya no hace falta el ancho de una fila para
 * distribuir varias ranuras.
 *
 * SOLO POR DEBAJO DE `md`. En escritorio la navegación está en el `Navbar`, que
 * ahí tiene el ancho para mostrarla entera.
 *
 * **El guard `esAdmin` no es cosmético**: `/catalogo/admin/login` se renderiza
 * dentro del mismo `Layout` público, y sin él esta isla —y su hoja— se
 * montarían encima de esa pantalla aunque nadie las haya abierto desde ahí.
 */

/** El fondo de la ranura activa. Cápsula, no color. */
const CLASE_RANURA =
  "relative inline-flex h-12 w-[62px] items-center justify-center rounded-full text-background transition-colors";
const CLASE_ACTIVA = "bg-background/20";

export default function NavFlotante({ menuAbierto, onAlternarMenu }) {
  const { pathname } = useLocation();

  if (pathname.startsWith("/catalogo/admin")) return null;

  return (
    <div
      // `data-testid`, no un rol: con un solo botón adentro este `<div>` ya no
      // es una región de navegación con nombre propio (ver el JSDoc de
      // arriba) — `publico-mobile.spec.js` necesita igual un locator estable
      // para medir su posición, y este es el mismo patrón que ya usa
      // `CintaAmbiente.jsx`.
      data-testid="isla-flotante"
      // Las tres capas fixed del pie, de abajo hacia arriba:
      //   1. La isla, normalmente `z-40` — mismo nivel que `HojaMenu`.
      //   2. La isla EN `z-50` mientras la hoja está abierta: `HojaMenu` es
      //      `fixed … bottom-0` con `z-40` y se monta DESPUÉS en el DOM, así
      //      que sin este salto pinta encima y su botón de cerrar (acá abajo)
      //      queda tapado — no clickeable y, para un lector de pantalla, un
      //      control que "existe" pero no se puede activar.
      //   3. El cartel de campaña (`ModalCampania` vía `VeloModal`), `z-[60]`
      //      SIEMPRE: es el único elemento que interrumpe sin que lo pidan, y
      //      tiene que poder taparlo todo, isla abierta o no.
      className={`fixed inset-x-0 bottom-0 flex justify-end px-margin-mobile pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden ${
        menuAbierto ? "z-50" : "z-40"
      }`}
    >
      {/* VIDRIO DE VERDAD, no una píldora casi opaca. El token vive en
          CANALES (`bg-inverse-surface/70`), así que Tailwind puede componerle
          alfa — un hex adentro de la variable descartaría la clase entera sin
          avisar y la isla quedaría transparente.

          El `/70` NO es una preferencia, es el mismo piso de contraste que ya
          usa `vidrio-header` en `Navbar.jsx`: los íconos son `text-background`
          (crema `#fff8f5`) sobre este fondo oscuro (`inverse-surface`,
          `#1d1b1a`), y el blur difumina lo que pasa por detrás pero no lo
          ACLARA — el peor caso sigue siendo una foto clara pareja. Contra
          blanco, `/70` compone a `#615f5f` y deja el crema en 6,04:1. **Ya el
          primer escalón hacia abajo rompe**: `/60` compone a `#777676` y cae a
          4,31:1, por debajo del 4,5:1 que pide WCAG AA — no hace falta llegar
          a `/50` (3,15:1) para perder el piso. Bajar de acá exige recalcular
          con la fórmula real, no ajustar a ojo.

          `border-background/10`: un pixel del mismo crema, casi invisible,
          que insinúa el canto del vidrio — sin él la píldora se lee como una
          mancha de color y no como una superficie.

          `.vidrio-isla` (en `index.css`) es el fallback: donde no hay
          `backdrop-filter` (Firefox con la flag apagada, entornos sin GPU), el
          alfa se aplicaría igual pero el desenfoque no, y quedaría una
          píldora semitransparente con el contenido NÍTIDO por detrás — peor
          que no haber intentado el efecto. Ahí el fondo pasa a opaco. */}
      <div className="vidrio-isla flex items-center rounded-full border border-background/10 bg-inverse-surface/70 p-2 shadow-ambient backdrop-blur-xl">
        <button
          type="button"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          aria-controls="hoja-menu"
          onClick={onAlternarMenu}
          className={`${CLASE_RANURA} ${menuAbierto ? CLASE_ACTIVA : ""}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[25px]">
            {menuAbierto ? "close" : "menu"}
          </span>
        </button>
      </div>
    </div>
  );
}
