import { Link } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";
import { useToast } from "../context/useToast.js";
import FichasCombo, { AhorroCombo, ArteCombo, ChipsCombo, PreciosCombo, SelloCombo } from "./FichasCombo.jsx";

/**
 * La card de combo (rediseño del 15/09/2026, `combos-rediseno.html`, pestaña
 * "Card"). Container query propia (`.tarjeta-combo-wrap`/`.tarjeta-combo` en
 * `index.css`): ticket horizontal en ancho ≥ 720px, apilada por debajo, fichas
 * más chicas y una menos por debajo de 380px. No calcula nada — todo llega
 * resuelto de `GET /combos` (`mapComboPublico`).
 *
 * Decisiones del rediseño: SIN hover (ni lift ni cambio de sombra; la sombra
 * fija `shadow-sombra-ticket` la despega del fondo), troquel SIN muescas (solo
 * la línea punteada), sello en rojo propio (`bg-sello`) y SIN la lista de
 * nombres de productos: el chip "N productos" alcanza y el detalle vive en la
 * página del combo. REGLA DE CLOAKING: `listaTarjetasCombo` (`seo.cuerpo.js`)
 * repite estos textos; si cambia uno, cambia el otro.
 *
 * Sin `overflow-hidden` en el `<article>`: el sello apilado sube sobre el
 * troquel. Las esquinas las redondean el cuerpo y el talón por separado.
 *
 * "Agregar combo" usa `useCarrito().agregar({comboId}, cantidad)` — LA MISMA
 * mutación que un producto suelto. `Link` del cuerpo y botón/`Link` del talón
 * son HERMANOS, no anidados: un `<button>` dentro de un `<a>` es HTML inválido.
 */
function TarjetaCombo({ combo }) {
  const { agregar } = useCarrito();
  const { mostrarToast } = useToast();

  function handleAgregar() {
    agregar({ comboId: combo.id }, 1);
    mostrarToast(`${combo.nombre} agregado al carrito`, {
      foto: combo.heroUrl ? { url: combo.heroUrl, alt: combo.nombre } : null,
      accion: { texto: "Ver carrito", to: "/carrito" },
    });
  }

  return (
    <div className="tarjeta-combo-wrap h-full min-w-0">
      <article className="tarjeta-combo relative grid h-full rounded-[22px] bg-surface-container-lowest shadow-sombra-ticket">
        <Link
          to={combo.ruta}
          className="tarjeta-combo-cuerpo relative isolate grid min-w-0 bg-crema-arte rounded-t-[22px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary-container"
        >
          <ArteCombo />
          {/* Chips, título y frase juntos: en el ticket ancho no pasan del 58%
              del cuerpo, y el lettering vive a la derecha (`.arte-combo-*`). */}
          <div className="tarjeta-combo-texto relative grid content-start">
            <ChipsCombo combo={combo} />

            <div className="grid content-start gap-1.5">
              <h3 className="tarjeta-combo-titulo line-clamp-2 text-balance font-display-lg font-extrabold leading-[1.06] tracking-[-0.035em] text-primary">
                {combo.nombre}
              </h3>
              <p className="tarjeta-combo-frase line-clamp-2 max-w-[52ch] font-body-md leading-[1.45] text-on-surface-variant">
                {combo.frase}
              </p>
            </div>
          </div>

          <FichasCombo items={combo.items} unidades={combo.unidades} />
        </Link>

        <div className="talon-combo relative grid content-start gap-3 rounded-b-[22px] bg-primary bg-[radial-gradient(120%_80%_at_100%_0%,rgb(var(--color-on-primary-container)/0.2),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgb(var(--color-secondary-container)/0.14),transparent_60%)] text-on-primary">
          <SelloCombo porcentaje={combo.porcentaje} />
          <PreciosCombo combo={combo} />
          <AhorroCombo ahorro={combo.ahorro} />

          <div className="grid gap-2">
            <button
              type="button"
              disabled={!combo.disponible}
              onClick={handleAgregar}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 font-label-lg text-[15px] font-bold tracking-normal text-on-secondary-container transition-colors enabled:hover:bg-secondary-container/90 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                shopping_bag
              </span>
              Agregar combo
            </button>
            <Link
              to={combo.ruta}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-label-lg text-[15px] font-bold tracking-normal text-on-primary shadow-[inset_0_0_0_1.5px_rgb(var(--color-on-primary)/0.35)] transition-shadow hover:shadow-[inset_0_0_0_1.5px_rgb(var(--color-on-primary))] motion-reduce:transition-none"
            >
              Ver el combo
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

export default TarjetaCombo;
