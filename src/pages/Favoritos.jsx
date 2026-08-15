import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import useFavoritos from "../hooks/useFavoritos.js";
import { getProducts } from "../api/products.js";

/**
 * `/favoritos` — every product currently saved as a favorite (design item:
 * Feature 4 of the 6-feature batch). Reuses Catalogo.jsx's fetch/grid
 * pattern, just pre-filtered against the ids in localStorage.
 *
 * If a favorited id no longer matches any real product (e.g. the admin
 * deleted it), it's silently dropped from the displayed list AND cleaned
 * out of localStorage — no "unavailable" placeholder, per the finalized
 * design decision.
 */
function Favoritos() {
  const { favoritos, toggleFavorito } = useFavoritos();
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    getProducts().then((data) => {
      if (!activo) return;

      const idsExistentes = new Set(data.map((p) => p.id));

      // Clean up stale ids (favorited products that no longer exist) —
      // silent, no user-facing message, per the finalized design decision.
      const idsInvalidos = favoritos.filter((id) => !idsExistentes.has(id));
      idsInvalidos.forEach((id) => toggleFavorito(id));

      setProductos(data.filter((p) => favoritos.includes(p.id)));
      setCargando(false);
    });

    return () => {
      activo = false;
    };
    // Runs once on mount only — reads `favoritos` via closure at that
    // moment. Must NOT re-run on every `favoritos` change (which happens on
    // every toggle, including this same effect's own cleanup calls above),
    // or it would create a re-fetch loop.
  }, []);

  return (
    <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
      <div className="mb-16 flex flex-col items-center">
        <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
          Tu selección
        </span>
        <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">Favoritos</h2>
      </div>

      {cargando ? (
        <EstadoVacio icono="hourglass_empty" mensaje="Cargando favoritos…" />
      ) : productos.length === 0 ? (
        <EstadoVacio
          icono="favorite_border"
          titulo="Todavía no guardaste favoritos"
          mensaje="Tocá el corazón en cualquier producto para guardarlo acá."
        />
      ) : (
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
          {productos.map((producto) => (
            <div key={producto.id} className="col-span-1 md:col-span-6 lg:col-span-4">
              <ProductCard producto={producto} variant="vertical" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default Favoritos;
