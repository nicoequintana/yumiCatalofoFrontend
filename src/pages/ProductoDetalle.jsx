import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PhotoGallery from "../components/PhotoGallery.jsx";
import Badge from "../components/Badge.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import { useVolver } from "../hooks/useVolver.js";
import BotonCompartir from "../components/BotonCompartir.jsx";
import BotonFavorito from "../components/BotonFavorito.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import BotonAgregarCarrito from "../components/BotonAgregarCarrito.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { getProductById } from "../api/products.js";
import { formatPrecio } from "../utils/formato.js";
import { useToast } from "../context/ToastContext.jsx";

/**
 * `/producto/:id` — informational-only detail view.
 *
 * Redesigned per the "Vibrant Editorial Discovery" mockup: asymmetric hero
 * (gallery ~7/12 + info panel ~5/12 on desktop), then four content sections
 * that each only render when the product actually has matching data
 * (`porQueLoVasAQuerer`/beneficios, `tePasaEsto`/usos, idealPara/incluye,
 * caracteristicas/especificaciones). The video (if any) now lives inside
 * the hero gallery's thumbnail row instead of a separate "Miralo en acción"
 * section further down the page — one video player, not two.
 *
 * Explicit exclusions per the finalized design decisions: NO color/finish
 * swatches. Price uses `$` via `formatPrecio()`, NOT `€`.
 */
function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const volver = useVolver();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cercaDelFinal, setCercaDelFinal] = useState(false);
  const finalContenidoRef = useRef(null);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getProductById(id).then((data) => {
      if (!activo) return;

      // Producto inexistente, eliminado, oculto o sin stock (el backend ya
      // excluye estos casos del catálogo público) — en vez de mostrar una
      // página "no encontrado" en un link roto, mandamos al usuario de
      // vuelta al catálogo con un aviso, así puede seguir navegando.
      if (!data) {
        navigate("/", { replace: true });
        mostrarToast("Este producto ya no está disponible.", { tipo: "error" });
        return;
      }

      setProducto(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Oculta el CTA sticky mobile una vez que el final de la página (justo
  // antes del botón de WhatsApp) entra en pantalla — no tiene sentido tapar
  // "también te puede interesar" con una barra flotante cuando el usuario
  // ya llegó al final del contenido.
  useEffect(() => {
    const nodo = finalContenidoRef.current;
    if (!nodo || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => setCercaDelFinal(entry.isIntersecting));
    observer.observe(nodo);

    return () => observer.disconnect();
  }, [producto]);

  if (cargando) {
    return <EstadoVacio icono="hourglass_empty" mensaje="Cargando producto…" />;
  }

  if (!producto) {
    return (
      <EstadoVacio
        icono="search_off"
        titulo="Producto no encontrado"
        mensaje="El producto que buscás no existe o fue eliminado."
      />
    );
  }

  const mostrarPorQueLoVasAQuerer = Boolean(producto.porQueLoVasAQuerer) || producto.beneficios?.length > 0;
  const mostrarProblemaResuelve = Boolean(producto.tePasaEsto) || producto.usos?.length > 0;
  const mostrarIdealIncluye = producto.idealPara?.length > 0 || producto.incluye?.length > 0;
  const mostrarFichaTecnica = producto.caracteristicas?.length > 0 || producto.especificaciones?.length > 0;

  // Segunda foto del producto (orden 1) para la columna de imagen de "¿Qué
  // problema resuelve?" — si no hay más de 1 foto, se reusa la principal en
  // vez de dejar la columna vacía (caso raro: producto con 1 sola foto pero
  // con `tePasaEsto`/usos cargados).
  const imagenProblema = producto.fotos?.[1] ?? producto.fotos?.[0] ?? null;

  const stockAgotado = producto.stock === 0;
  const stockBajo = producto.stock > 0 && producto.stock <= 3;

  return (
    <>
      {/* Mobile header — the one page-specific mobile-nav exception. */}
      <header className="sticky top-0 z-40 flex w-full items-center justify-between bg-background px-margin-mobile py-4 md:hidden">
        <button type="button" className="p-2 text-on-surface" onClick={volver}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="font-headline-lg-mobile text-headline-lg-mobile tracking-tighter text-primary">
          {producto.nombre}
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 pb-24 md:px-margin-desktop md:py-16 md:pb-16">
        <div className="mb-6 hidden md:block">
          <BotonVolver />
        </div>

        {/* A. Hero — galería (7/12) + panel de info (5/12) en desktop */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
          <div className="lg:col-span-7">
            <PhotoGallery fotos={producto.fotos} video={producto.video} nombre={producto.nombre} />
          </div>

          <div className="flex flex-col lg:col-span-5">
            <div className="mb-3 flex items-center gap-2">
              <Badge etiqueta={producto.etiqueta} />
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

            <h1 className="font-display-lg text-headline-lg-mobile mb-2 text-on-background md:text-display-lg">
              {producto.nombre}
            </h1>

            {producto.fraseComercial ? (
              <p className="font-headline-md text-body-lg mb-4 italic text-terracotta-warm">
                {producto.fraseComercial}
              </p>
            ) : null}

            <span className="font-body-lg text-body-lg mb-4 block font-bold text-terracotta-warm">
              {formatPrecio(producto.precio)}
            </span>

            <p className="font-body-lg text-body-lg mb-6 leading-relaxed text-on-surface-variant">
              {producto.descripcion}
            </p>

            <div className="mb-6 flex flex-wrap items-center gap-3">
              <BotonAgregarCarrito producto={producto} alineacion="start" />
              <BotonFavorito
                productoId={producto.id}
                className="rounded-full border border-moss-green text-moss-green hover:bg-moss-green/10"
                textoGuardar="Guardar"
              />
            </div>

            <div className="flex items-center gap-6 border-t border-outline-variant pt-4">
              <BotonWhatsapp
                variant="inline"
                contexto={{ tipo: "producto", producto }}
                productId={producto.id}
              />
              <BotonCompartir producto={producto} />
            </div>
          </div>
        </div>

        {/* B. ¿Por qué lo vas a querer? */}
        {mostrarPorQueLoVasAQuerer ? (
          <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-headline-md text-headline-md mb-3 text-primary">¿Por qué lo vas a querer?</h2>
              {producto.porQueLoVasAQuerer ? (
                <p className="font-body-md text-body-md text-on-surface-variant">{producto.porQueLoVasAQuerer}</p>
              ) : null}
            </div>

            {producto.beneficios?.length > 0 ? (
              <div
                className={`mt-10 grid grid-cols-1 gap-6 ${
                  producto.beneficios.slice(0, 3).length === 1
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

        {/* C. ¿Qué problema resuelve? */}
        {mostrarProblemaResuelve ? (
          <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <h2 className="font-headline-md text-headline-md mb-3 text-primary">¿Qué problema resuelve?</h2>
                {producto.tePasaEsto ? (
                  <p className="font-body-md text-body-md mb-6 text-on-surface-variant">{producto.tePasaEsto}</p>
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
                ) : null}
              </div>

              {imagenProblema ? (
                <div className="order-1 lg:order-2 lg:col-span-5 lg:col-start-8">
                  <img
                    src={imagenProblema.url}
                    alt={producto.nombre}
                    className="aspect-square w-full rounded-xl object-cover shadow-ambient"
                  />
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* D. Ideal para / Incluye */}
        {mostrarIdealIncluye ? (
          <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
            <div
              className={`grid grid-cols-1 gap-10 ${
                producto.idealPara?.length > 0 && producto.incluye?.length > 0 ? "md:grid-cols-2" : ""
              }`}
            >
              {producto.idealPara?.length > 0 ? (
                <div>
                  <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                    Ideal para
                  </h3>
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
                </div>
              ) : null}

              {producto.incluye?.length > 0 ? (
                <div>
                  <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                    Incluye
                  </h3>
                  <ul className="font-body-md text-body-md flex flex-col gap-3 text-on-surface-variant">
                    {producto.incluye.map((item) => (
                      <li key={item.id} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[18px] text-moss-green">check</span>
                        {item.texto}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* E. Ficha técnica (características + especificaciones) */}
        {mostrarFichaTecnica ? (
          <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
            <div className="rounded-2xl border border-outline-variant p-6 md:p-10">
              <h2 className="font-headline-md text-headline-md mb-8 text-primary">Ficha técnica</h2>

              {producto.caracteristicas?.length > 0 ? (
                <div className={producto.especificaciones?.length > 0 ? "mb-8" : ""}>
                  <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                    Características
                  </h3>
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
                </div>
              ) : null}

              {producto.caracteristicas?.length > 0 && producto.especificaciones?.length > 0 ? (
                <div className="mb-8 border-t border-outline-variant" />
              ) : null}

              {producto.especificaciones?.length > 0 ? (
                <div>
                  <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                    Especificaciones técnicas
                  </h3>
                  <dl className="flex flex-col">
                    {producto.especificaciones.map((spec, index) => (
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

        {producto.relacionados?.length > 0 ? (
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

        <div ref={finalContenidoRef} aria-hidden="true" />
      </main>

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
    </>
  );
}

export default ProductoDetalle;
