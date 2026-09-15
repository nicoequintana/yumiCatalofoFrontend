import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import MetaSeo from "../components/MetaSeo.jsx";
import NoEncontrado from "./NoEncontrado.jsx";
import CargandoPagina from "../components/CargandoPagina.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import SelectorCantidad from "../components/SelectorCantidad.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import useCombo from "../hooks/useCombo.js";
import useCarrito from "../hooks/useCarrito.js";
import { formatPrecio } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";

const CLASE_BOTON_AGREGAR =
  "flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 font-label-lg text-label-md font-bold text-on-secondary-container transition-colors enabled:hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60";

/**
 * `/combos/:idSlug` — la página aprobada (spec §7.3, diseño
 * "combos-pagina-admin.html", pestaña "Página del combo"): migas, hero SIN
 * texto, ticket superpuesto (chips, título, frase, fichas, talón con el sello
 * de %, "Por separado" tachado, precio combo, "Ahorrás $", cantidad +
 * "Agregar combo", envío y WhatsApp), "Qué incluye", "La cuenta" (recibo) y
 * la barra fija del celular. SIN franja de confianza (el usuario la sacó).
 *
 * No calcula NADA: precios, `alcanza`, `disponible` y `quedanPocos` llegan
 * resueltos del backend (`GET /combos/:idSlug`).
 *
 * REGLA DE CLOAKING: los textos de "Qué incluye" y "La cuenta" —título,
 * frase, "{N} productos, un solo precio", "{cantidad} × {nombre}", "Precio
 * de lista {monto}" (+ " c/u"), "La cuenta", "Juntos te salen {ahorro}
 * menos", "Por separado ({N} productos)", "Descuento combo {p}%", "Precio
 * combo"— los repite `cuerpoCombo` (`backend/src/controllers/seo.cuerpo.js`,
 * Tarea 30) al pie de la letra. Si cambia uno, cambia el otro.
 *
 * `comboForzado` es la vista previa del editor del panel (Tarea 28): pinta
 * ese objeto sin pedir nada al backend (`useCombo(null)`), sin `MetaSeo`
 * (no le pisa las etiquetas al documento del panel) y sin los links "Ver
 * producto" (no hay adónde navegar dentro de un preview).
 *
 * El ticket (`.pc-*` en `index.css`) decide horizontal vs. apilado por el
 * ANCHO DEL CONTENEDOR, no por el viewport — necesario porque esa misma
 * vista previa lo embebe en un marco angosto con el viewport entero del
 * panel. Ver el comentario de `.pagina-combo` en `index.css`.
 */
function PaginaCombo({ comboForzado = null }) {
  const { idSlug } = useParams();
  const resultado = useCombo(comboForzado ? null : idSlug);
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);

  const combo = comboForzado ?? resultado.combo;

  if (!comboForzado) {
    if (resultado.noEncontrado) return <NoEncontrado />;
    if (resultado.cargando) return <CargandoPagina mensaje="Cargando combo…" />;
    if (resultado.error) {
      return <EstadoVacio icono="cloud_off" titulo="No se pudo cargar el combo" mensaje={resultado.error} />;
    }
    if (!combo) return null;
  }

  function agregarCombo() {
    agregar({ comboId: combo.id }, cantidad);
  }

  return (
    <div className="pagina-combo">
      {comboForzado ? null : (
        <MetaSeo
          titulo={`${combo.nombre} — YIMA`}
          descripcion={combo.frase}
          canonical={urlAbsoluta(combo.ruta)}
          imagen={combo.heroUrl ?? undefined}
        />
      )}

      <nav
        aria-label="Miga de pan"
        className="mx-auto flex max-w-container-max flex-wrap items-center gap-1.5 px-margin-mobile pt-3 font-body-sm text-body-sm text-on-surface-variant md:px-margin-desktop"
      >
        <Link to="/" className="text-primary-container">
          Inicio
        </Link>
        <span aria-hidden="true">›</span>
        <Link to="/combos" className="text-primary-container">
          Combos
        </Link>
        <span aria-hidden="true">›</span>
        <span>{combo.nombre}</span>
      </nav>

      {combo.heroUrl ? (
        <div className="pc-hero relative mx-auto mt-3 max-w-container-max overflow-hidden rounded-[22px] md:mx-8">
          <img src={combo.heroUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}

      <section
        aria-label="Comprar combo"
        className="pc-ticket relative z-10 mx-auto -mt-9 grid max-w-container-max overflow-hidden rounded-[22px] bg-surface-container-lowest shadow-ambient md:mx-16"
      >
        <div className="grid content-start gap-3 p-5 md:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 font-label-sm text-[11px] font-extrabold uppercase tracking-[0.14em] text-on-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-[13px]">
                redeem
              </span>
              Combo
            </span>
            <span className="font-label-md text-label-sm text-on-surface-variant">{combo.unidades} productos</span>
            {!combo.disponible ? (
              <span className="rounded-full bg-error-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-error-container">
                Agotado
              </span>
            ) : combo.quedanPocos ? (
              <span className="rounded-full bg-secondary-container px-2.5 py-1 font-label-sm text-[11px] font-bold uppercase text-on-secondary-container">
                Quedan {combo.alcanza}
              </span>
            ) : null}
          </div>

          <h1 className="m-0 font-display-xl text-[clamp(34px,7cqi,52px)] font-black leading-none tracking-[-0.04em] text-primary">
            {combo.nombre}
          </h1>
          <p className="max-w-[48ch] font-body-md text-[clamp(17px,2cqi,19px)] leading-snug text-on-surface-variant">
            {combo.frase}
          </p>

          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label={`Incluye ${combo.unidades} productos`}
          >
            {combo.items.map((item, indice) => (
              <span key={item.productId} className="contents">
                {indice > 0 ? (
                  <span aria-hidden="true" className="text-outline">
                    +
                  </span>
                ) : null}
                <span
                  title={item.nombre}
                  className="relative grid aspect-square w-[58px] flex-none place-items-center rounded-2xl bg-surface-container md:w-[84px]"
                >
                  {item.foto ? (
                    <img
                      src={item.foto}
                      alt=""
                      className="absolute inset-0 h-full w-full rounded-2xl object-contain"
                    />
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
          </div>
        </div>

        <div className="pc-talon relative grid content-start gap-3.5 overflow-hidden bg-primary bg-[radial-gradient(120%_80%_at_100%_0%,rgb(var(--color-on-primary)/0.14),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgb(var(--color-secondary)/0.2),transparent_60%)] p-5 pt-7 text-on-primary md:p-9">
          <span
            aria-hidden="true"
            className="muesca-a absolute -left-[11px] -top-[11px] z-10 h-[22px] w-[22px] rounded-full bg-background"
          />
          <span aria-hidden="true" className="pc-muesca-b absolute z-10 h-[22px] w-[22px] rounded-full bg-background" />

          <div
            aria-label={`${combo.porcentaje}% de descuento`}
            className="absolute right-4 top-[-32px] z-[3] grid h-[76px] w-[76px] rotate-[-12deg] place-items-center rounded-full bg-secondary-container text-center leading-none text-on-secondary-container shadow-[0_6px_16px_-4px_rgb(var(--color-on-secondary-container)/0.45),inset_0_0_0_3px_rgb(var(--color-on-primary)/0.35)]"
          >
            <span className="grid gap-0.5">
              <span className="font-display-lg text-[25px] font-black leading-[0.9] tracking-[-0.04em]">
                -{combo.porcentaje}%
              </span>
              <span className="font-display-lg text-[11px] font-extrabold uppercase leading-none tracking-[0.12em]">
                Combo
              </span>
            </span>
          </div>

          <div className="mt-6 grid gap-0.5 tabular-nums">
            <span className="flex items-baseline gap-2 font-label-md text-[13px] text-primary-container">
              Por separado
              <s className="font-display-lg text-[18px] font-semibold text-on-primary/70 decoration-secondary-container">
                {formatPrecio(combo.precioSeparado)}
              </s>
            </span>
            <span className="mt-1.5 font-label-sm text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-container">
              Precio combo
            </span>
            <span className="font-display-xl text-[clamp(44px,9cqi,56px)] font-black leading-none tracking-[-0.045em] text-on-primary">
              {formatPrecio(combo.precioCombo)}
            </span>
          </div>

          <span className="w-fit rounded-full border border-secondary-container/45 bg-secondary-container/[0.16] px-2.5 py-1 font-label-md text-[14px] font-bold text-secondary-container">
            Ahorrás {formatPrecio(combo.ahorro)}
          </span>

          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
            <SelectorCantidad value={cantidad} onChange={setCantidad} max={combo.alcanza} />
            <button
              type="button"
              disabled={!combo.disponible}
              onClick={agregarCombo}
              className={CLASE_BOTON_AGREGAR}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Agregar combo
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-label-md text-[13px] text-primary-container">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                local_shipping
              </span>
              Envío a todo el país
            </span>
            <BotonWhatsapp
              variant="inline"
              contexto={{ tipo: "producto", producto: { nombre: combo.nombre } }}
              className="text-primary-container hover:text-on-primary"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile py-10 md:px-margin-desktop md:py-16">
        <span className="font-label-sm text-label-sm uppercase tracking-[0.12em] text-secondary">
          Qué incluye
        </span>
        <h2 className="mt-1 font-headline-md text-[clamp(26px,4.5cqi,34px)] leading-tight text-on-surface">
          {combo.unidades} productos, un solo precio
        </h2>

        <div className="pc-incluye mt-5 grid gap-4">
          {combo.items.map((item) => (
            <article
              key={item.productId}
              className="grid gap-3 rounded-2xl bg-surface-container-lowest p-3 shadow-ambient"
            >
              <div className="relative aspect-square rounded-xl bg-surface-container">
                {item.foto ? (
                  <img
                    src={item.foto}
                    alt=""
                    className="absolute inset-0 h-full w-full rounded-xl object-contain"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-on-surface-variant">
                    <span aria-hidden="true" className="material-symbols-outlined text-[32px]">
                      inventory_2
                    </span>
                  </span>
                )}
              </div>
              <div className="grid gap-1">
                {item.categoria ? (
                  <span className="font-label-sm text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
                    {item.categoria}
                  </span>
                ) : null}
                <span className="font-body-md text-body-md text-on-surface">
                  {item.cantidad > 1 ? `${item.cantidad} × ${item.nombre}` : item.nombre}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Precio de lista <strong className="text-on-surface">{formatPrecio(item.precioLista)}</strong>
                  {item.cantidad > 1 ? " c/u" : ""}
                </span>
                {comboForzado ? null : (
                  <Link
                    to={item.ruta}
                    className="mt-1 inline-flex items-center gap-0.5 font-label-md text-label-sm text-primary-container"
                  >
                    Ver producto
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                      chevron_right
                    </span>
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-margin-mobile pb-16 md:px-margin-desktop">
        <div className="pc-cuenta grid gap-8">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-[0.12em] text-secondary">
              La cuenta
            </span>
            <h2 className="mt-1 font-headline-md text-[clamp(26px,4.5cqi,34px)] leading-tight text-on-surface">
              Juntos te salen {formatPrecio(combo.ahorro)} menos
            </h2>
            <p className="mt-2 max-w-[48ch] font-body-md text-body-md text-on-surface-variant">
              Llevándolos en combo pagás menos que comprando cada producto a su precio de lista.
            </p>
          </div>

          <div className="rounded-[20px] bg-surface-container-lowest p-5 shadow-ambient md:p-7">
            <div className="flex justify-between border-b border-dashed border-outline-variant py-2.5 font-body-md text-body-sm text-on-surface-variant">
              <span>Por separado ({combo.unidades} productos)</span>
              <strong className="text-on-surface">{formatPrecio(combo.precioSeparado)}</strong>
            </div>
            <div className="flex justify-between border-b border-dashed border-outline-variant py-2.5 font-body-md text-body-sm text-secondary">
              <span>Descuento combo {combo.porcentaje}%</span>
              <strong>− {formatPrecio(combo.ahorro)}</strong>
            </div>
            <div className="flex items-center justify-between pt-3.5">
              <span className="font-label-md text-label-md text-primary">Precio combo</span>
              <strong className="font-display-lg text-[34px] font-black tracking-[-0.04em] text-primary">
                {formatPrecio(combo.precioCombo)}
              </strong>
            </div>
            <button
              type="button"
              disabled={!combo.disponible}
              onClick={agregarCombo}
              className={`${CLASE_BOTON_AGREGAR} mt-3 w-full`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                shopping_cart
              </span>
              Agregar combo
            </button>
          </div>
        </div>
      </section>

      {/* Barra fija del celular (spec §7.3, bloque 6): tachado + precio +
          "Agregar combo". Siempre montada; `.pc-barra-fija` en `index.css` la
          esconde recién cuando el CONTENEDOR llega a escritorio. */}
      <div className="pc-barra-fija sticky bottom-0 z-20 flex items-center gap-3 border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-2.5 shadow-ambient">
        <div className="grid leading-tight tabular-nums">
          <s className="font-body-sm text-[12px] text-outline">{formatPrecio(combo.precioSeparado)}</s>
          <strong className="font-display-lg text-[24px] font-black tracking-[-0.04em] text-primary">
            {formatPrecio(combo.precioCombo)}
          </strong>
        </div>
        <button
          type="button"
          disabled={!combo.disponible}
          onClick={agregarCombo}
          className={`${CLASE_BOTON_AGREGAR} ml-auto`}
        >
          Agregar combo
        </button>
      </div>
    </div>
  );
}

export default PaginaCombo;
