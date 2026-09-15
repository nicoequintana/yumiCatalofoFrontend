import { Link } from "react-router-dom";
import useCarrito from "../hooks/useCarrito.js";
import { useToast } from "../context/useToast.js";
import { formatPrecio } from "../utils/formato.js";

const MAX_FICHAS = 4;

/**
 * La card de combo aprobada (spec §7.1). Container query propia
 * (`.tarjeta-combo-wrap`/`.tarjeta-combo` en `index.css`): ticket horizontal
 * en ancho ≥ 720px, apilada por debajo. No calcula nada — todo llega
 * resuelto de `GET /combos` (`mapComboPublico`).
 *
 * "Agregar combo" usa `useCarrito().agregar({comboId}, cantidad)` — LA MISMA
 * mutación que un producto suelto, nunca un hook propio: `useCombosCarrito`
 * (Task 25) es solo refresco en vivo para `Carrito.jsx`/`Checkout.jsx`, no
 * agrega nada al carrito. El shape `{ comboId }` todavía no lo distingue
 * `useCarrito` en sí (eso llega con la Tarea 24); esta card ya llama la API
 * final para no volver a tocar este archivo cuando esa tarea aterrice.
 *
 * `Link` del cuerpo y botón/`Link` del talón son HERMANOS, no anidados —
 * mismo motivo que `BotonFavorito`/`BotonAgregar` en `ProductCard`: un
 * `<button>` (o un segundo `<a>`) dentro de un `<a>` es HTML inválido y le
 * rompe el nombre accesible al enlace exterior.
 */
function TarjetaCombo({ combo }) {
  const { agregar } = useCarrito();
  const { mostrarToast } = useToast();

  const visibles = combo.items.slice(0, combo.items.length > MAX_FICHAS ? MAX_FICHAS - 1 : MAX_FICHAS);
  const resto = combo.items.length - visibles.length;

  function handleAgregar() {
    agregar({ comboId: combo.id }, 1);
    mostrarToast(`${combo.nombre} agregado al carrito`, {
      foto: combo.heroUrl ? { url: combo.heroUrl, alt: combo.nombre } : null,
      accion: { texto: "Ver carrito", to: "/carrito" },
    });
  }

  return (
    <div className="tarjeta-combo-wrap h-full min-w-0">
      <article className="tarjeta-combo grid h-full grid-cols-1 grid-rows-[1fr_auto] overflow-hidden rounded-[20px] bg-surface-container-lowest shadow-sombra-2 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:shadow-[0_18px_40px_-10px_rgb(var(--color-primary)/0.4)]">
        <Link to={combo.ruta} className="flex min-w-0 flex-col gap-3.5 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-label-sm text-[11px] font-extrabold uppercase tracking-[0.14em] text-on-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-[13px]">
                redeem
              </span>
              Combo
            </span>
            <span className="font-label-md text-label-sm text-on-surface-variant">{combo.unidades} productos</span>
          </div>

          <h3 className="line-clamp-2 min-h-[2lh] font-display-lg text-[26px] font-extrabold leading-[1.02] tracking-[-0.035em] text-primary">
            {combo.nombre}
          </h3>
          <p className="line-clamp-2 min-h-[2lh] max-w-[46ch] font-body-md text-body-sm text-on-surface-variant">
            {combo.frase}
          </p>

          <div className="flex flex-nowrap items-center gap-1.5" aria-label={`Incluye ${combo.unidades} productos`}>
            {visibles.map((item, indice) => (
              <span key={item.productId} className="contents">
                {indice > 0 ? (
                  <span aria-hidden="true" className="text-outline">
                    +
                  </span>
                ) : null}
                <span
                  data-testid="ficha-item"
                  title={item.nombre}
                  className="relative grid aspect-square w-16 flex-none place-items-center rounded-2xl bg-surface-container"
                >
                  {item.foto ? (
                    <img src={item.foto} alt="" className="absolute inset-0 h-full w-full rounded-2xl object-contain" />
                  ) : (
                    <span aria-hidden="true" className="material-symbols-outlined text-on-surface-variant">
                      inventory_2
                    </span>
                  )}
                  {item.cantidad > 1 ? (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-secondary px-1.5 py-0.5 font-label-sm text-[12px] font-extrabold text-on-secondary shadow-sm">
                      ×{item.cantidad}
                    </span>
                  ) : null}
                </span>
              </span>
            ))}
            {resto > 0 ? (
              <>
                <span aria-hidden="true" className="text-outline">
                  +
                </span>
                <span className="grid aspect-square w-16 flex-none place-items-center rounded-2xl bg-surface-container-high font-display-lg text-[17px] font-extrabold text-primary">
                  +{resto}
                </span>
              </>
            ) : null}
          </div>

          <p className="line-clamp-2 min-h-[2lh] font-body-sm text-body-sm text-on-surface-variant">
            {combo.items.map((item) => `${item.cantidad > 1 ? item.cantidad + "× " : ""}${item.nombre}`).join(" · ")}
          </p>
        </Link>

        <div className="talon-combo relative grid gap-3.5 overflow-hidden bg-primary bg-[radial-gradient(120%_80%_at_100%_0%,rgb(var(--color-on-primary)/0.14),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgb(var(--color-secondary)/0.2),transparent_60%)] p-5 text-on-primary">
          {/* Las "muescas": dos círculos del color de fondo de la PÁGINA (no
              de la card) que se superponen al troquel punteado, simulando que
              lo perforaron — mismo truco que un ticket de verdad. Posición
              fija por `.muesca-b`/el contenedor en `index.css`: apilada van
              en las dos puntas de la línea horizontal de arriba, ticket
              horizontal en las dos puntas de la línea vertical de la
              izquierda. */}
          <span aria-hidden="true" className="muesca-a absolute -left-[11px] -top-[11px] z-10 h-[22px] w-[22px] rounded-full bg-background" />
          <span aria-hidden="true" className="muesca-b absolute z-10 h-[22px] w-[22px] rounded-full bg-background" />
          {!combo.disponible ? (
            <span className="absolute right-4 top-3 rounded-full bg-error-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-error-container">
              Agotado
            </span>
          ) : combo.quedanPocos ? (
            <span className="absolute right-4 top-3 rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-secondary-container">
              Quedan {combo.alcanza}
            </span>
          ) : null}

          <div
            aria-hidden="true"
            className="absolute right-4 top-[-30px] z-20 grid h-[74px] w-[74px] rotate-[-12deg] place-items-center rounded-full bg-secondary-container text-center leading-none text-on-secondary-container shadow-[0_6px_16px_-4px_rgb(var(--color-on-secondary-container)/0.45),inset_0_0_0_3px_rgb(var(--color-on-primary)/0.35)]"
          >
            <span className="grid gap-0.5">
              <span className="font-display-lg text-[22px] font-black leading-none tracking-[-0.04em]">-{combo.porcentaje}%</span>
              <span className="font-display-lg text-[11px] font-extrabold uppercase leading-none tracking-[0.06em]">Combo</span>
            </span>
          </div>

          <div className="grid gap-0.5 tabular-nums">
            <span className="flex items-baseline gap-2 font-label-md text-[13px] text-primary-container">
              Por separado
              <s className="font-display-lg text-[18px] font-semibold text-on-primary/70 decoration-secondary-container">
                {formatPrecio(combo.precioSeparado)}
              </s>
            </span>
            <span className="mt-1.5 font-label-sm text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-container">
              Precio combo
            </span>
            <span className="font-display-xl text-[40px] font-black leading-none tracking-[-0.045em] text-on-primary">
              {formatPrecio(combo.precioCombo)}
            </span>
          </div>

          <span className="w-fit rounded-full border border-secondary-container/45 bg-secondary-container/[0.16] px-2.5 py-1 font-label-md text-[14px] font-bold text-secondary-container">
            Ahorrás {formatPrecio(combo.ahorro)}
          </span>

          <div className="grid gap-2">
            <button
              type="button"
              disabled={!combo.disponible}
              onClick={handleAgregar}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container font-label-lg text-label-md font-bold text-on-secondary-container transition-colors enabled:hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Agregar combo
            </button>
            <Link
              to={combo.ruta}
              className="flex h-12 items-center justify-center gap-2 rounded-xl text-label-md font-bold text-on-primary ring-1 ring-inset ring-on-primary/35 transition-shadow hover:ring-on-primary"
            >
              Ver el combo
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
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
