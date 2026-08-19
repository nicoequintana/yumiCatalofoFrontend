import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FiltrosCatalogo from "../components/FiltrosCatalogo.jsx";
import BentoDestacados from "../components/BentoDestacados.jsx";
import { getProducts } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";
import heroImg from "../assets/hero.jpg";

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
 * for categoria/precio — reading + writing them directly avoids a duplicate
 * local-state/URL sync loop. The free-text search input is the one
 * exception: it keeps its own local state so keystrokes don't write to the
 * URL (and thus don't trigger a refetch) on every character — a `setTimeout`
 * debounce commits it into `searchParams` after the user pauses typing,
 * which is what the fetch effect actually reacts to.
 */
function Catalogo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const categoria = searchParams.get("categoria") ?? "";
  const minPrecio = searchParams.get("minPrecio") ?? "";
  const maxPrecio = searchParams.get("maxPrecio") ?? "";
  const searchUrl = searchParams.get("search") ?? "";

  // Los filtros se reinician a cero en cada carga/entrada a la pantalla —
  // no deben persistir entre visitas (decisión de producto), sin importar
  // con qué querystring haya llegado la navegación (ej. un link compartido
  // con `?categoria=...`). Se limpia de forma síncrona durante el primer
  // render (no en un efecto, para que ningún otro estado/efecto llegue a
  // leer un filtro heredado) — el `ref` asegura que esto corra una única
  // vez y no vuelva a pisar los filtros que el usuario aplique después.
  const reseteoInicialHecho = useRef(false);
  if (!reseteoInicialHecho.current) {
    reseteoInicialHecho.current = true;
    if (searchParams.toString() !== "") {
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }

  const [searchInput, setSearchInput] = useState("");
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // { replace: true }: react-router-dom v7's useSearchParams pushes a new
  // history entry by default. A filter change is a refinement of the same
  // view, not a new page to visit — without replace, every categoria/precio
  // tweak (and each debounced search commit) stacks its own "atrás" entry,
  // so a user who filters and then hits back needs one click per filter
  // change before actually leaving the page.
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

    getProducts({ categoria, search: searchUrl, minPrecio, maxPrecio }).then((data) => {
      if (!activo) return;
      setProductos(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [categoria, searchUrl, minPrecio, maxPrecio]);

  const hayFiltrosActivos = Boolean(categoria || searchUrl || minPrecio || maxPrecio);

  return (
    <>
      {/* Hero Section — layout asimétrico per design doc
          2026-08-19-catalogo-publico-editorial-design.md */}
      <section className="w-full px-margin-mobile pb-16 pt-12 md:px-margin-desktop md:pb-24 md:pt-16">
        <div className="mx-auto grid w-full max-w-container-max grid-cols-1 items-center gap-gutter md:grid-cols-12">
          <div className="z-10 flex flex-col gap-6 md:col-span-5">
            <span className="font-label-md text-label-md w-max rounded-full bg-tertiary-container px-3 py-1 uppercase tracking-wide text-on-tertiary-container">
              La Pregunta del Día
            </span>
            <h1 className="font-display-lg text-display-lg tracking-tight text-on-surface">
              ¿Qué vas a descubrir hoy?
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Entrá por una cosa. Quedate por muchas.
              <br />
              Encontrá eso que buscabas y algo que no sabías que querías.
            </p>
            <button
              type="button"
              onClick={() =>
                document.getElementById("coleccion")?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-4 w-max rounded-lg bg-primary px-6 py-3 font-label-md text-label-md text-on-primary shadow-sm shadow-primary/20 transition-colors hover:bg-primary-container"
            >
              Explorar Colección
            </button>
          </div>

          <div className="relative mt-8 md:col-span-7 md:mt-0">
            <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 transform rounded-xl bg-surface-container-high" />
            <img
              className="h-[500px] w-full rounded-xl object-cover shadow-lg shadow-primary/5"
              src={heroImg}
              alt="Selección destacada del catálogo YIMA"
            />
          </div>
        </div>
      </section>

      <BentoDestacados productos={productos} />

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
      />

      {/* Collection Grid — section header from home.html L132-136, card grid idiom from catalogo.html.
          Fondo en surface-container-low (más oscuro que el hero, en background)
          para que la franja de filtros + esta sección se lean como una capa
          propia, y las ProductCard (en surface-container-lowest) resalten con
          más contraste sobre ella. */}
      <section id="coleccion" className="w-full bg-surface-container-low">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-12">
          <div className="mb-8 flex flex-col items-center">
            <span className="font-label-sm text-label-sm mb-4 uppercase tracking-[0.2em] text-secondary">
              Nuestra Colección
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary md:text-[40px]">
              Productos
            </h2>
          </div>

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
        </div>
      </section>

      {/* Manifiesto de marca — cierre editorial antes del footer.
          Sin botón CTA: no existe una página "Sobre nosotros" en el
          proyecto (ver design doc 2026-08-19), un link ahí sería un enlace
          roto o alcance nuevo fuera de esta spec. */}
      <section className="relative w-full overflow-hidden bg-cream-base px-margin-mobile py-32 md:px-margin-desktop">
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <span className="material-symbols-outlined text-4xl text-moss-green opacity-50">
            auto_awesome
          </span>
          <h2 className="font-headline-lg text-headline-lg italic text-on-surface">
            El Manifiesto YIMA
          </h2>
          <p className="font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            No vendemos productos: elegimos piezas que valen la pena tener cerca.
            Cada cosa que entra al catálogo pasó antes por la misma pregunta que
            te hacemos a vos — ¿esto suma o solo ocupa lugar? Encontrá lo que
            buscabas, y de paso, algo que no sabías que te hacía falta.
          </p>
        </div>
        <div className="absolute -z-0 left-10 top-10 h-64 w-64 rounded-full bg-terracotta-warm/5 blur-3xl" />
        <div className="absolute -z-0 bottom-10 right-10 h-96 w-96 rounded-full bg-golden-sand/10 blur-3xl" />
      </section>

      <BotonWhatsapp contexto={{ tipo: "home" }} />
    </>
  );
}

export default Catalogo;
