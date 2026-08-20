import { useEffect, useRef, useState } from "react";
import PhotoGallery from "./PhotoGallery.jsx";
import Badge from "./Badge.jsx";
import BotonCompartir from "./BotonCompartir.jsx";
import BotonFavorito from "./BotonFavorito.jsx";
import BotonWhatsapp from "./BotonWhatsapp.jsx";
import BotonAgregarCarrito from "./BotonAgregarCarrito.jsx";
import ProductCard from "./ProductCard.jsx";
import { formatPrecio } from "../utils/formato.js";

/**
 * Presentational product detail sheet — the single source of truth for how a
 * product looks, shared by the public `/producto/:id` page and the admin
 * editor's live preview.
 *
 * It receives `producto` as a plain object and never fetches: the public page
 * feeds it API data, the admin form feeds it unsaved form state. That's the
 * whole point of the split — the admin preview can't drift from the public
 * page, because it *is* the public page.
 *
 * `modoPreview` turns the interactive parts inert for the admin: the cart /
 * favorite / WhatsApp CTAs render as static look-alikes (an admin editing a
 * product must not add it to their own cart), the mobile sticky CTA is
 * dropped, and related products are hidden (they belong to the real page, not
 * to a preview of the product being edited). It also enables placeholder text
 * for empty fields, so a half-filled product still shows the shape of what's
 * missing instead of collapsing into blank space.
 *
 * `compacto` forces every multi-column section to stack. Tailwind's `lg:`
 * breakpoints measure the *viewport*, not this component's box, so inside the
 * admin's narrow preview pane (and especially its 390px mobile toggle) the
 * two-column hero would keep applying and overflow. Same `compacto` prop
 * convention the other shared components use for tight contexts.
 *
 * `plantillaCompleta` (preview only) keeps every section mounted even when
 * empty, each hole marked with a dashed `BloqueVacio`. Two reasons: the layout
 * stops jumping as fields get filled, and the admin sees the full map of what
 * can be loaded — a section that never renders is a section nobody knows
 * exists. It's deliberately gated on `modoPreview` so a stray prop can never
 * show a customer empty scaffolding.
 *
 * Every list field is read defensively (`?.length`) because in preview mode
 * the product is whatever the admin has typed so far — often missing keys the
 * API would always send.
 */
/**
 * Dashed outline standing in for a field the admin hasn't filled yet. Only
 * ever rendered in `plantillaCompleta` mode — it must read unmistakably as
 * "not published", never as content.
 */
function BloqueVacio({ children, className = "" }) {
  return (
    <div
      data-testid="bloque-vacio"
      className={`flex items-center justify-center rounded-lg border border-dashed border-outline-variant px-4 py-3 text-center ${className}`}
    >
      <span className="font-body-md text-[13px] italic leading-snug text-outline">{children}</span>
    </div>
  );
}

function FichaProducto({
  producto,
  modoPreview = false,
  compacto = false,
  plantillaCompleta = false,
}) {
  const [cercaDelFinal, setCercaDelFinal] = useState(false);
  const finalContenidoRef = useRef(null);

  // Hides the mobile sticky CTA once the end of the content scrolls into
  // view — no point covering "también te puede interesar" with a floating
  // bar. Never runs in preview mode, where there is no sticky CTA at all.
  useEffect(() => {
    if (modoPreview) return;

    const nodo = finalContenidoRef.current;
    if (!nodo || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setCercaDelFinal(entry.isIntersecting));
    observer.observe(nodo);

    return () => observer.disconnect();
  }, [producto, modoPreview]);

  if (!producto) return null;

  // La plantilla solo existe dentro del preview del admin: en la ficha pública
  // una sección vacía sigue sin renderizarse, pase lo que pase.
  const plantilla = modoPreview && plantillaCompleta;

  const mostrarPorQueLoVasAQuerer =
    plantilla || Boolean(producto.porQueLoVasAQuerer) || producto.beneficios?.length > 0;
  const mostrarProblemaResuelve = plantilla || Boolean(producto.tePasaEsto) || producto.usos?.length > 0;
  const mostrarIdealIncluye = plantilla || producto.idealPara?.length > 0 || producto.incluye?.length > 0;
  const mostrarFichaTecnica =
    plantilla || producto.caracteristicas?.length > 0 || producto.especificaciones?.length > 0;

  const sinMedia = !producto.fotos?.length && !producto.video;

  // Second photo (orden 1) for the "¿Qué problema resuelve?" image column —
  // falls back to the main one rather than leaving the column empty.
  const imagenProblema = producto.fotos?.[1] ?? producto.fotos?.[0] ?? null;

  const stockAgotado = producto.stock === 0;
  const stockBajo = producto.stock > 0 && producto.stock <= 3;

  const nombreMostrado = producto.nombre || (modoPreview ? "Nombre del producto" : "");
  const nombreVacio = modoPreview && !producto.nombre;

  return (
    <>
      <div
        className={`grid grid-cols-1 gap-10 ${
          compacto ? "" : "lg:grid-cols-12 lg:items-start lg:gap-12"
        }`}
      >
        <div className={compacto ? "" : "lg:col-span-7"}>
          {plantilla && sinMedia ? (
            // Mismo tope que la galería en modo compacto: sin él, el cuadrado
            // ocupa todo el panel y esconde el resto de la ficha.
            <BloqueVacio className={`aspect-square w-full ${compacto ? "max-h-[460px]" : ""}`}>
              Sin fotos todavía — se pueden cargar hasta 10 y un video
            </BloqueVacio>
          ) : (
            <PhotoGallery
              fotos={producto.fotos}
              video={producto.video}
              nombre={producto.nombre}
              compacto={compacto}
            />
          )}
        </div>

        <div className={`flex flex-col ${compacto ? "" : "lg:col-span-5"}`}>
          <div className="mb-3 flex items-center gap-2">
            <Badge etiqueta={producto.etiqueta} />
            {plantilla && !producto.etiqueta ? (
              <BloqueVacio className="px-3 py-1">Sin etiqueta</BloqueVacio>
            ) : null}
            {stockAgotado ? (
              <span className="font-label-sm text-label-sm rounded-full bg-surface-container-highest px-3 py-1 uppercase tracking-wide text-on-surface-variant">
                Agotado
              </span>
            ) : stockBajo ? (
              <span className="font-label-sm text-label-sm rounded-full bg-error px-3 py-1 uppercase tracking-wide text-on-error">
                Últimos {producto.stock}
              </span>
            ) : null}
          </div>

          <h1
            className={`font-display-lg text-headline-lg-mobile mb-2 ${
              compacto ? "" : "md:text-display-lg"
            } ${nombreVacio ? "italic text-outline" : "text-on-background"}`}
          >
            {nombreMostrado}
          </h1>

          {producto.fraseComercial ? (
            <p className="font-headline-md text-body-lg mb-4 italic text-terracotta-warm">
              {producto.fraseComercial}
            </p>
          ) : plantilla ? (
            <BloqueVacio className="mb-4">Frase comercial</BloqueVacio>
          ) : null}

          <span className="font-body-lg text-body-lg mb-4 block font-bold text-terracotta-warm">
            {formatPrecio(producto.precio)}
          </span>

          {producto.descripcion || !plantilla ? (
            <p className="font-body-lg text-body-lg mb-6 leading-relaxed text-on-surface-variant">
              {producto.descripcion}
            </p>
          ) : (
            <BloqueVacio className="mb-6">Descripción del producto</BloqueVacio>
          )}

          {/* En preview los CTA son los componentes REALES, neutralizados con
              `inert` — nunca copias a mano. Copiarlos ya falló dos veces: el
              copy divergía ("Consultar" en vez de "WhatsApp") y, peor, la copia
              se dibujaba siempre mientras que `BotonWhatsapp` no se renderiza
              si no hay número configurado. Reusando el componente, la
              condición, el copy y el ícono no pueden desincronizarse. */}
          <div
            className={`mb-6 flex flex-wrap items-center gap-3 ${modoPreview ? "pointer-events-none" : ""}`}
            inert={modoPreview}
          >
            <BotonAgregarCarrito producto={producto} alineacion="start" />
            <BotonFavorito
              productoId={producto.id}
              className="rounded-full border border-moss-green text-moss-green hover:bg-moss-green/10"
              textoGuardar="Guardar"
            />
          </div>

          <div
            className={`flex items-center gap-6 border-t border-outline-variant pt-4 ${
              modoPreview ? "pointer-events-none" : ""
            }`}
            inert={modoPreview}
          >
            <BotonWhatsapp
              variant="inline"
              contexto={{ tipo: "producto", producto }}
              productId={producto.id}
            />
            <BotonCompartir producto={producto} />
          </div>
        </div>
      </div>

      {mostrarPorQueLoVasAQuerer ? (
        <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-headline-md text-headline-md mb-3 text-primary">¿Por qué lo vas a querer?</h2>
            {producto.porQueLoVasAQuerer ? (
              <p className="font-body-md text-body-md text-on-surface-variant">{producto.porQueLoVasAQuerer}</p>
            ) : plantilla ? (
              <BloqueVacio>Texto de apertura de la sección</BloqueVacio>
            ) : null}
          </div>

          {plantilla && !producto.beneficios?.length ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <BloqueVacio className="min-h-[120px]">Beneficio 1</BloqueVacio>
              <BloqueVacio className="min-h-[120px]">Beneficio 2</BloqueVacio>
              <BloqueVacio className="min-h-[120px]">Beneficio 3</BloqueVacio>
            </div>
          ) : null}

          {producto.beneficios?.length > 0 ? (
            <div
              className={`mt-10 grid grid-cols-1 gap-6 ${
                compacto
                  ? ""
                  : producto.beneficios.slice(0, 3).length === 1
                    ? "justify-items-center"
                    : producto.beneficios.slice(0, 3).length === 2
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-3"
              }`}
            >
              {producto.beneficios.slice(0, 3).map((beneficio) => (
                <div
                  key={beneficio.id}
                  className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-2xl bg-cream-base p-6 text-center shadow-ambient"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-primary">
                    <span className="material-symbols-outlined text-[26px]">auto_awesome</span>
                  </span>
                  <p className="font-body-md text-body-md text-on-surface-variant">{beneficio.texto}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {mostrarProblemaResuelve ? (
        <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
          <div
            className={`grid grid-cols-1 gap-10 ${
              compacto ? "" : "lg:grid-cols-12 lg:items-center lg:gap-12"
            }`}
          >
            <div className={compacto ? "" : "order-2 lg:order-1 lg:col-span-5"}>
              <h2 className="font-headline-md text-headline-md mb-3 text-primary">¿Qué problema resuelve?</h2>
              {producto.tePasaEsto ? (
                <p className="font-body-md text-body-md mb-6 text-on-surface-variant">{producto.tePasaEsto}</p>
              ) : plantilla ? (
                <BloqueVacio className="mb-6">Situación que resuelve el producto</BloqueVacio>
              ) : null}

              {producto.usos?.length > 0 ? (
                <ul className="font-body-md text-body-md flex flex-col gap-3 text-on-surface-variant">
                  {producto.usos.map((uso) => (
                    <li key={uso.id} className="flex items-start gap-3">
                      <span className="material-symbols-outlined mt-0.5 text-[18px] text-terracotta-warm">
                        task_alt
                      </span>
                      {uso.texto}
                    </li>
                  ))}
                </ul>
              ) : plantilla ? (
                <BloqueVacio>Formas de usarlo</BloqueVacio>
              ) : null}
            </div>

            {imagenProblema ? (
              <div className={compacto ? "" : "order-1 lg:order-2 lg:col-span-5 lg:col-start-8"}>
                <img
                  src={imagenProblema.url}
                  alt={producto.nombre}
                  className="aspect-square w-full rounded-xl object-cover shadow-ambient"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {mostrarIdealIncluye ? (
        <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
          <div
            className={`grid grid-cols-1 gap-10 ${
              !compacto && (plantilla || (producto.idealPara?.length > 0 && producto.incluye?.length > 0))
                ? "md:grid-cols-2"
                : ""
            }`}
          >
            {producto.idealPara?.length > 0 || plantilla ? (
              <div>
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Ideal para
                </h3>
                {producto.idealPara?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {producto.idealPara.map((item) => (
                      <span
                        key={item.id}
                        className="font-body-md text-body-md rounded-full bg-surface-container px-4 py-2 text-on-surface-variant"
                      >
                        {item.texto}
                      </span>
                    ))}
                  </div>
                ) : (
                  <BloqueVacio>A quién le sirve este producto</BloqueVacio>
                )}
              </div>
            ) : null}

            {producto.incluye?.length > 0 || plantilla ? (
              <div>
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Incluye
                </h3>
                {producto.incluye?.length > 0 ? (
                  <ul className="font-body-md text-body-md flex flex-col gap-3 text-on-surface-variant">
                    {producto.incluye.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] text-moss-green">check</span>
                        {item.texto}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <BloqueVacio>Qué viene en la caja</BloqueVacio>
                )}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {mostrarFichaTecnica ? (
        <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
          <div className="rounded-2xl border border-outline-variant p-6 md:p-10">
            <h2 className="font-headline-md text-headline-md mb-8 text-primary">Ficha técnica</h2>

            {producto.caracteristicas?.length > 0 || plantilla ? (
              <div className={producto.especificaciones?.length > 0 || plantilla ? "mb-8" : ""}>
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Características
                </h3>
                {producto.caracteristicas?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {producto.caracteristicas.map((caracteristica) => (
                      <span
                        key={caracteristica.id}
                        className="font-body-md text-body-md rounded-full bg-surface-container px-4 py-2 text-on-surface-variant"
                      >
                        {caracteristica.texto}
                      </span>
                    ))}
                  </div>
                ) : (
                  <BloqueVacio>Características destacadas</BloqueVacio>
                )}
              </div>
            ) : null}

            {(producto.caracteristicas?.length > 0 && producto.especificaciones?.length > 0) || plantilla ? (
              <div className="mb-8 border-t border-outline-variant" />
            ) : null}

            {producto.especificaciones?.length > 0 || plantilla ? (
              <div>
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Especificaciones técnicas
                </h3>
                {!producto.especificaciones?.length ? (
                  <BloqueVacio>Pares de dato técnico y valor</BloqueVacio>
                ) : null}
                <dl className="flex flex-col">
                  {(producto.especificaciones ?? []).map((spec, index) => (
                    <div
                      key={spec.id}
                      className={`flex justify-between gap-4 py-3 ${
                        index % 2 === 1 ? "bg-surface-container-low" : ""
                      } ${index > 0 ? "border-t border-outline-variant" : ""}`}
                    >
                      <dt className="font-body-md text-body-md px-2 text-on-surface-variant">{spec.nombre}</dt>
                      <dd className="font-body-md text-body-md px-2 text-on-surface">{spec.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {!modoPreview && producto.relacionados?.length > 0 ? (
        <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
          <h2 className="font-headline-md text-headline-md mb-8 text-primary">
            También te puede interesar
          </h2>
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {producto.relacionados.map((relacionado) => (
              <ProductCard key={relacionado.id} producto={relacionado} />
            ))}
          </div>
        </section>
      ) : null}

      {!modoPreview ? <div ref={finalContenidoRef} aria-hidden="true" /> : null}

      {!modoPreview ? (
        <div
          data-testid="cta-sticky-mobile"
          className={`fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] transition-transform duration-200 md:hidden ${
            cercaDelFinal ? "translate-y-full" : "translate-y-0"
          }`}
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <span className="font-body-lg text-body-lg whitespace-nowrap font-bold text-terracotta-warm">
            {formatPrecio(producto.precio)}
          </span>
          <BotonAgregarCarrito producto={producto} compacto />
        </div>
      ) : null}
    </>
  );
}

export default FichaProducto;
