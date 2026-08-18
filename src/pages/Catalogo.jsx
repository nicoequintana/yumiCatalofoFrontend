import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FiltrosCatalogo from "../components/FiltrosCatalogo.jsx";
import { getProducts } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";

const DEBOUNCE_SEARCH_MS = 350;

/**
 * `/` — landing + full catalog in one scroll, per design D1.
 *
 * Hero copy is ported verbatim from home.html L122-129 (Spanish, brand
 * copy). The bento/featured layout from home.html is intentionally NOT
 * built — per D1 the asymmetric bento only fits a fixed 3-item layout and
 * breaks for an arbitrary product count, so ALL products render in ONE
 * grid using catalogo.html's padded-card idiom (`ProductCard`, no bento).
 * Grid spans stay here (the parent page), not inside `ProductCard` (D2).
 *
 * Filters (Sprint 3, Task 2): `searchParams` is the single source of truth
 * for categoria/disponibilidad/precio — reading + writing them directly
 * avoids a duplicate local-state/URL sync loop. The free-text search input
 * is the one exception: it keeps its own local state so keystrokes don't
 * write to the URL (and thus don't trigger a refetch) on every character —
 * a `setTimeout` debounce commits it into `searchParams` after the user
 * pauses typing, which is what the fetch effect actually reacts to.
 *
 * `disponibilidad` specifically (product-decision correction, post-Sprint 3):
 * still read from `searchParams` and still passed down to
 * `FiltrosCatalogo`/wired through `actualizarFiltro` — the URL/state
 * plumbing is untouched — but deliberately NOT forwarded into the
 * `getProducts()` query below. `FiltrosCatalogo` no longer renders the
 * control that would ever set it, so `disponibilidad` is always `""` in
 * practice; the query param is dropped here too as a second, independent
 * layer of the same no-op (matching `Badge.jsx`'s documented pattern) so a
 * hand-crafted `?disponibilidad=...` URL can't smuggle a live filter back
 * in through the querystring. No real stock-management workflow exists yet
 * — reinstate this line, and `FiltrosCatalogo`'s field, together when it does.
 */
function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoria = searchParams.get("categoria") ?? "";
  const disponibilidad = searchParams.get("disponibilidad") ?? "";
  const minPrecio = searchParams.get("minPrecio") ?? "";
  const maxPrecio = searchParams.get("maxPrecio") ?? "";
  const searchUrl = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(searchUrl);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // { replace: true }: react-router-dom v7's useSearchParams pushes a new
  // history entry by default. A filter change is a refinement of the same
  // view, not a new page to visit — without replace, every categoria/precio/
  // disponibilidad tweak (and each debounced search commit) stacks its own
  // "atrás" entry, so a user who filters and then hits back needs one click
  // per filter change before actually leaving the page.
  function actualizarFiltro(clave, valor) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) {
          next.set(clave, valor);
        } else {
          next.delete(clave);
        }
        return next;
      },
      { replace: true },
    );
  }

  // Debounce: commit the free-text search into the URL (and therefore into
  // the fetch effect's deps) only after the user stops typing.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      actualizarFiltro("search", searchInput);
    }, DEBOUNCE_SEARCH_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    let activo = true;
    getCategorias().then((data) => {
      if (activo) setCategorias(data);
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    // `disponibilidad` intentionally NOT forwarded — see doc comment above.
    getProducts({ categoria, search: searchUrl, minPrecio, maxPrecio, disponibilidad: "" }).then((data) => {
      if (!activo) return;
      setProductos(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [categoria, searchUrl, minPrecio, maxPrecio, disponibilidad]);

  const hayFiltrosActivos = Boolean(categoria || searchUrl || minPrecio || maxPrecio || disponibilidad);

  return (
    <>
      {/* Hero Section — ported from home.html L121-130 */}
      <section className="relative flex w-full flex-col items-center justify-center px-margin-mobile py-24 text-center md:px-margin-desktop md:py-32">
        <h1 className="font-display-lg text-display-lg mx-auto mb-6 max-w-4xl tracking-tight text-primary md:text-[64px]">
          ¿Qué vas a descubrir hoy?
        </h1>
        <p className="font-body-lg text-body-lg mx-auto mb-12 max-w-2xl text-on-surface-variant">
          Entrá por una cosa. Quedate por muchas. 
          <br></br>
          Encontrá eso que buscabas y algo que no sabías que querías.
        </p>
      </section>

      {/* Collection Grid — section header from home.html L132-136, card grid idiom from catalogo.html */}
      <section className="mx-auto w-full max-w-container-max px-margin-mobile py-16 md:px-margin-desktop md:py-24">
        <div className="mb-16 flex flex-col items-center">
          <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
            Nuestra Colección
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
            Productos
          </h2>
        </div>

        <FiltrosCatalogo
          categorias={categorias}
          categoria={categoria}
          onChangeCategoria={(valor) => actualizarFiltro("categoria", valor)}
          search={searchInput}
          onChangeSearch={setSearchInput}
          minPrecio={minPrecio}
          onChangeMinPrecio={(valor) => actualizarFiltro("minPrecio", valor)}
          maxPrecio={maxPrecio}
          onChangeMaxPrecio={(valor) => actualizarFiltro("maxPrecio", valor)}
          disponibilidad={disponibilidad}
          onChangeDisponibilidad={(valor) => actualizarFiltro("disponibilidad", valor)}
        />

        {cargando ? (
          <EstadoVacio icono="hourglass_empty" mensaje="Cargando productos…" />
        ) : productos.length === 0 ? (
          <EstadoVacio
            icono={hayFiltrosActivos ? "search_off" : "inventory_2"}
            titulo={hayFiltrosActivos ? "Sin resultados" : "Todavía no hay productos"}
            mensaje={
              hayFiltrosActivos
                ? "Ningún producto coincide con los filtros aplicados."
                : "Pronto vamos a sumar piezas a la colección."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
            {productos.map((producto, index) => {
              // Every 4th card renders wide (horizontal variant), matching
              // catalogo.html's mix of `lg:col-span-4` stacked cards and
              // `lg:col-span-6` wide cards (L179-209) — asymmetry comes from
              // this span mix, not from a separate bento section (D1).
              const esAncha = index % 4 === 3;
              return (
                <div
                  key={producto.id}
                  className={esAncha ? "col-span-1 md:col-span-12 lg:col-span-6" : "col-span-1 md:col-span-6 lg:col-span-4"}
                >
                  <ProductCard producto={producto} variant={esAncha ? "horizontal" : "vertical"} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <BotonWhatsapp contexto={{ tipo: "home" }} />
    </>
  );
}

export default Catalogo;
