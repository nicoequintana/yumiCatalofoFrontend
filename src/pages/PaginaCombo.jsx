import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import MetaSeo from "../components/MetaSeo.jsx";
import Migas from "../components/Migas.jsx";
import NoEncontrado from "./NoEncontrado.jsx";
import CargandoPagina from "../components/CargandoPagina.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import SelectorCantidad from "../components/SelectorCantidad.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FichasCombo, { AhorroCombo, ArteCombo, ChipsCombo, PreciosCombo, SelloCombo } from "../components/FichasCombo.jsx";
import useCombo from "../hooks/useCombo.js";
import useCarrito from "../hooks/useCarrito.js";
import { formatPrecio } from "../utils/formato.js";
import { urlAbsoluta } from "../constants/seo.js";

const CLASE_BOTON_AGREGAR =
  "flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 font-label-lg text-label-md font-bold text-on-secondary-container transition-colors enabled:hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

/**
 * `/combos/:idSlug` — la página del combo (spec §7.3, rediseño del 15/09/2026,
 * `combos-rediseno.html`, pestaña "Página"): migas, hero SIN texto, ticket
 * superpuesto (chips, título, frase, fichas, talón con el sello de %, "Por
 * separado" tachado, precio combo, "Ahorrás $", cantidad + "Agregar combo",
 * envío y WhatsApp), "Qué incluye", "La cuenta" (recibo) y la barra fija del
 * celular. SIN franja de confianza (el usuario la sacó).
 *
 * UN solo contenedor (`.pc-contenedor`) para migas, hero, ticket y secciones:
 * antes cada bloque tenía su ancho y el talón se salía del borde del hero.
 *
 * No calcula NADA: precios, `alcanza`, `disponible` y `quedanPocos` llegan
 * resueltos del backend (`GET /combos/:idSlug`).
 *
 * REGLA DE CLOAKING: los textos del ticket, "Qué incluye" y "La cuenta"
 * —título, frase, "{N} productos, un solo precio", "{cantidad} × {nombre}",
 * "Precio de lista {monto}" (+ " c/u"), "La cuenta", "Juntos te salen
 * {ahorro} menos", "Por separado ({N} productos)", "Descuento combo {p}%",
 * "Precio combo"— los repite `cuerpoCombo` (`backend/src/controllers/seo.cuerpo.js`)
 * al pie de la letra. Si cambia uno, cambia el otro.
 *
 * `comboForzado` es la vista previa del editor del panel: pinta ese objeto sin
 * pedir nada al backend (`useCombo(null)`), sin `MetaSeo` (no le pisa las
 * etiquetas al documento del panel) y sin los links "Ver producto" (no hay
 * adónde navegar dentro de un preview).
 *
 * El ticket usa las MISMAS clases y piezas que `TarjetaCombo`
 * (`.tarjeta-combo*` + `FichasCombo.jsx`) y decide horizontal vs. apilado por
 * el ANCHO DE SU CONTENEDOR, no por el viewport — necesario porque esa vista
 * previa lo embebe en un marco angosto con el viewport entero del panel.
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

      <div className="pc-contenedor mx-auto w-full max-w-container-max">
        <Migas
          items={[{ label: "Inicio", to: "/" }, { label: "Combos", to: "/combos" }, { label: combo.nombre }]}
        />

        {combo.heroUrl ? (
          <div className="pc-hero relative max-w-full overflow-hidden">
            <img src={combo.heroUrl} alt={combo.nombre} className="absolute inset-0 h-full w-full object-cover" />
          </div>
        ) : null}

        {/* Sin hero (solo pasa en la vista previa de un borrador: activar exige
            hero) no hay nada sobre qué superponerse. */}
        <div className={combo.heroUrl ? "pc-ticket relative z-10" : "relative z-10"}>
          <div className="tarjeta-combo-wrap min-w-0">
            <section
              aria-label="Comprar combo"
              className="tarjeta-combo tarjeta-combo-pagina relative grid rounded-[22px] bg-surface-container-lowest shadow-sombra-ticket"
            >
              <div className="tarjeta-combo-cuerpo relative isolate grid min-w-0 bg-crema-arte rounded-t-[22px]">
                <ArteCombo />
                {/* Chips, título y frase juntos: en el ticket ancho no pasan del 58%
                    del cuerpo, y el lettering vive a la derecha (`.arte-combo-*`). */}
                <div className="tarjeta-combo-texto relative grid content-start">
                  <ChipsCombo combo={combo} />

                  <div className="grid content-start gap-1.5">
                    <h1 className="tarjeta-combo-titulo m-0 text-balance font-display-lg font-extrabold leading-[1.06] tracking-[-0.035em] text-primary">
                      {combo.nombre}
                    </h1>
                    <p className="tarjeta-combo-frase max-w-[52ch] font-body-md leading-[1.45] text-on-surface-variant">
                      {combo.frase}
                    </p>
                  </div>
                </div>

                <FichasCombo items={combo.items} unidades={combo.unidades} />
              </div>

              <div className="talon-combo relative grid content-start gap-3 rounded-b-[22px] bg-primary bg-[radial-gradient(120%_80%_at_100%_0%,rgb(var(--color-on-primary-container)/0.2),transparent_60%),radial-gradient(80%_60%_at_0%_100%,rgb(var(--color-secondary-container)/0.14),transparent_60%)] text-on-primary">
                <SelloCombo porcentaje={combo.porcentaje} />
                <PreciosCombo combo={combo} />
                <AhorroCombo ahorro={combo.ahorro} />

                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                  <SelectorCantidad value={cantidad} onChange={setCantidad} max={combo.alcanza} sobreOscuro />
                  <button type="button" disabled={!combo.disponible} onClick={agregarCombo} className={CLASE_BOTON_AGREGAR}>
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                      shopping_bag
                    </span>
                    Agregar combo
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-label-md text-[13px] tracking-normal text-on-primary-container">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                      local_shipping
                    </span>
                    Envío a todo el país
                  </span>
                  <BotonWhatsapp
                    variant="inline"
                    contexto={{ tipo: "producto", producto: { nombre: combo.nombre } }}
                    sobreOscuro
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="grid gap-5 pt-14">
          <div className="text-center">
            <span className="font-label-sm text-label-sm uppercase tracking-[0.12em] text-secondary">Qué incluye</span>
            <h2 className="mt-1 text-balance font-headline-md text-[clamp(26px,4.5cqi,34px)] leading-tight text-on-surface">
              {combo.unidades} productos, un solo precio
            </h2>
          </div>

          <div className="pc-incluye grid gap-4">
            {combo.items.map((item) => (
              <article
                key={item.productId}
                className="grid content-start gap-2.5 rounded-[18px] bg-surface-container-lowest p-3 shadow-sombra-1"
              >
                <div className="relative aspect-square rounded-[14px] bg-surface-container-lowest shadow-[inset_0_0_0_1px_rgb(var(--color-surface-container-high))]">
                  {item.foto ? (
                    <img src={item.foto} alt="" className="absolute inset-0 h-full w-full rounded-[14px] object-contain" />
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
                  <span className="font-body-md text-body-md font-medium leading-snug text-on-surface">
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

        <section className="py-14">
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
      </div>

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
