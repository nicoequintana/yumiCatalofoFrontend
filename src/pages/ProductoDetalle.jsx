import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PhotoGallery from "../components/PhotoGallery.jsx";
import Badge from "../components/Badge.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import { getProductById } from "../api/products.js";
import { formatPrecio } from "../utils/formato.js";

/**
 * `/producto/:id` — informational-only detail view, ported from
 * detalle-producto.html.
 *
 * Explicit exclusions per the finalized design decisions: NO color/finish
 * swatches (mockup L181-189 dropped entirely), NO CTA/contact button on the
 * price panel (mockup's price block had none either — nothing to remove
 * there, just nothing to add). Price uses `$` via `formatPrecio()`, NOT the
 * mockup's `€` (locked decision, corrects detalle-producto.html L216).
 */
function ProductoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        <button type="button" className="p-2 text-on-surface" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="font-headline-lg-mobile text-headline-lg-mobile tracking-tighter text-primary">
          AURA
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-16">
        <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
          <div className="col-span-1 md:col-span-7">
            <PhotoGallery fotos={producto.fotos} video={producto.video} nombre={producto.nombre} />
          </div>

          <div className="col-span-1 flex flex-col pt-8 md:col-span-5 md:pt-0 md:pl-8">
            <div className="mb-2">
              <Badge etiqueta={producto.etiqueta} />
            </div>

            <h1 className="font-display-lg text-headline-lg-mobile mb-4 mt-4 text-on-background md:text-display-lg">
              {producto.nombre}
            </h1>

            <p className="font-body-lg text-body-lg mb-8 leading-relaxed text-on-surface-variant">
              {producto.descripcion}
            </p>

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

            <div className="mt-auto flex items-center justify-between rounded-2xl bg-tertiary-container p-6 shadow-lg md:p-8">
              <div>
                <span className="font-label-sm text-label-sm mb-1 block uppercase tracking-widest text-on-tertiary-container">
                  Inversión
                </span>
                <span className="font-headline-lg text-headline-lg text-on-background">
                  {formatPrecio(producto.precio)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default ProductoDetalle;
