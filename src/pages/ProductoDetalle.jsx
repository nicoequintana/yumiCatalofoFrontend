import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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

/**
 * `/producto/:id` — informational-only detail view, ported from
 * detalle-producto.html.
 *
 * Explicit exclusions per the finalized design decisions: NO color/finish
 * swatches (mockup L181-189 dropped entirely). Price uses `$` via
 * `formatPrecio()`, NOT the mockup's `€` (locked decision, corrects
 * detalle-producto.html L216).
 *
 * The price panel's CTA slot was deliberately left empty until the cart
 * feature existed (Sprint 5) — now filled by `BotonAgregarCarrito`.
 */
function ProductoDetalle() {
  const { id } = useParams();
  const volver = useVolver();
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getProductById(id).then((data) => {
      if (!activo) return;
      setProducto(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [id]);

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

  return (
    <>
      {/* Mobile header — the one page-specific mobile-nav exception, ported
          from detalle-producto.html L136-145 */}
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
        <div className="flex flex-col gap-gutter">
          <div>
            <PhotoGallery fotos={producto.fotos} nombre={producto.nombre} />
          </div>

          <div className="flex flex-col pt-8">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge etiqueta={producto.etiqueta} />
                {producto.stock > 0 && producto.stock <= 3 ? (
                  <span className="font-label-sm text-label-sm rounded bg-error px-2 py-1 uppercase tracking-wide text-on-primary">
                    Últimos {producto.stock}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <BotonFavorito productoId={producto.id} />
                <BotonCompartir producto={producto} />
              </div>
            </div>

            <h1 className="font-display-lg text-headline-lg-mobile mb-4 mt-4 text-on-background md:text-display-lg">
              {producto.nombre}
            </h1>

            {producto.fraseComercial ? (
              <p className="font-body-lg text-body-lg mb-4 text-on-surface-variant">{producto.fraseComercial}</p>
            ) : null}

            <p className="font-body-lg text-body-lg mb-8 leading-relaxed text-on-surface-variant">
              {producto.descripcion}
            </p>

            {producto.porQueLoVasAQuerer ? (
              <div className="mb-10">
                <h3 className="font-headline-md text-headline-md mb-3 text-primary">¿Por qué lo vas a querer?</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{producto.porQueLoVasAQuerer}</p>
              </div>
            ) : null}

            {producto.tePasaEsto ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-headline-md text-headline-md mb-3 text-primary">¿Te pasa esto?</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{producto.tePasaEsto}</p>
              </div>
            ) : null}

            {producto.caracteristicas?.length > 0 ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Características
                </h3>
                <ul className="font-body-md text-body-md space-y-3 text-on-surface-variant">
                  {producto.caracteristicas.map((caracteristica) => (
                    <li key={caracteristica.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      {caracteristica.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {producto.usos?.length > 0 ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  ¿Cómo podés usarlo?
                </h3>
                <ul className="font-body-md text-body-md space-y-3 text-on-surface-variant">
                  {producto.usos.map((uso) => (
                    <li key={uso.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      {uso.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {producto.idealPara?.length > 0 ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Ideal para...
                </h3>
                <ul className="font-body-md text-body-md space-y-2 text-on-surface-variant">
                  {producto.idealPara.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">arrow_right</span>
                      {item.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {producto.especificaciones?.length > 0 ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  Especificaciones
                </h3>
                <dl className="flex flex-col gap-2">
                  {producto.especificaciones.map((spec) => (
                    <div key={spec.id} className="flex justify-between gap-4 border-b border-outline-variant pb-2">
                      <dt className="font-body-md text-body-md text-on-surface-variant">{spec.nombre}</dt>
                      <dd className="font-body-md text-body-md text-on-surface">{spec.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {producto.incluye?.length > 0 ? (
              <div className="mb-10 border-t border-outline-variant pt-6">
                <h3 className="font-label-md text-label-md mb-4 uppercase tracking-widest text-on-surface">
                  ¿Qué incluye?
                </h3>
                <ul className="font-body-md text-body-md space-y-2 text-on-surface-variant">
                  {producto.incluye.map((item) => (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                      {item.texto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {producto.beneficios?.length > 0 ? (
              <ul className="font-body-md text-body-md mb-6 flex flex-col gap-2 text-on-surface-variant">
                {producto.beneficios.slice(0, 3).map((beneficio) => (
                  <li key={beneficio.id} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                    {beneficio.texto}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-auto flex flex-col gap-6 rounded-2xl bg-tertiary-container p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between md:p-8">
              <div>
                <span className="font-label-sm text-label-sm mb-1 block uppercase tracking-[0.15em] text-on-tertiary-container/70">
                  Precio
                </span>
                <span className="font-headline-lg text-headline-lg text-on-tertiary-container">
                  {formatPrecio(producto.precio)}
                </span>
              </div>
              <div className="flex flex-col items-start border-t border-on-tertiary-container/15 pt-6 sm:items-end sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
                <BotonAgregarCarrito producto={producto} />
              </div>
            </div>
          </div>
        </div>

        {producto.video ? (
          <section className="mt-16 border-t border-outline-variant pt-12 md:mt-24 md:pt-16">
            <h2 className="font-headline-md text-headline-md mb-8 text-primary">Miralo en acción</h2>
            <video
              src={producto.video.url}
              controls
              className="w-full max-w-3xl rounded-xl bg-surface-container-low"
            />
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
      </main>

      <div
        data-testid="cta-sticky-mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <span className="font-headline-md text-headline-md text-primary">{formatPrecio(producto.precio)}</span>
        <BotonAgregarCarrito producto={producto} />
      </div>

      <BotonWhatsapp contexto={{ tipo: "producto", producto }} productId={producto.id} />
    </>
  );
}

export default ProductoDetalle;
