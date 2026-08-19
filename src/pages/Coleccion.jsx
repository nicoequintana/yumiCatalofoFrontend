import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FiltrosCatalogo from "../components/FiltrosCatalogo.jsx";
import BentoDestacados from "../components/BentoDestacados.jsx";
import useDestacados from "../hooks/useDestacados.js";
import { getProducts } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";

const DEBOUNCE_SEARCH_MS = 350;

/**
 * `/coleccion` — catálogo completo con filtros, separado de la home
 * editorial (`/`) per design doc 2026-08-19-separacion-home-coleccion.
 *
 * El bento de destacados se muestra arriba con su propio fetch sin filtros
 * (`useDestacados`): es una vidriera fija de destacados globales y no debe
 * vaciarse ni cambiar cuando el usuario filtra el grid de abajo. Por eso
 * esta página hace dos llamadas a `getProducts` con params distintos.
 *
 * Filtros: `searchParams` es la única fuente de verdad para
 * categoria/precio — leerlos y escribirlos directo evita un loop duplicado
 * de sincronización estado-local/URL. El input de búsqueda libre es la
 * excepción: mantiene estado local para que cada tecla no escriba en la URL
 * (y por lo tanto no dispare un refetch); un `setTimeout` lo commitea a
 * `searchParams` cuando el usuario hace una pausa, que es a lo que el
 * efecto de fetch realmente reacciona.
 */
function Coleccion() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Los filtros se reinician a cero en cada carga/entrada a la pantalla —
  // no deben persistir entre visitas (decisión de producto), sin importar
  // con qué querystring haya llegado la navegación (ej. un link compartido
  // con `?categoria=...`). Se limpia de forma síncrona durante el primer
  // render — el `ref` asegura que esto corra una única vez y no vuelva a
  // pisar los filtros que el usuario aplique después.
  //
  // El `setSearchParams` de ese primer render NO se refleja todavía en el
  // `searchParams` de este mismo render (React encola la navegación), así
  // que los filtros se derivan como vacíos de forma explícita en la pasada
  // inicial. Sin esto, el primer `getProducts` del grid saldría con el
  // filtro heredado de la URL antes de que el reseteo llegue a aplicarse.
  const reseteoInicialHecho = useRef(false);
  const esPrimerRender = !reseteoInicialHecho.current;
  if (esPrimerRender) {
    reseteoInicialHecho.current = true;
    if (searchParams.toString() !== "") {
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }

  const filtrosUrl = esPrimerRender ? new URLSearchParams() : searchParams;
  const categoria = filtrosUrl.get("categoria") ?? "";
  const minPrecio = filtrosUrl.get("minPrecio") ?? "";
  const maxPrecio = filtrosUrl.get("maxPrecio") ?? "";
  const searchUrl = filtrosUrl.get("search") ?? "";

  const { productos: destacados } = useDestacados();
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
      <BentoDestacados productos={destacados} />

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

      {/* `tipo: "home"` — `useWhatsapp` sólo reconoce "producto" y
          "favoritos"; todo lo demás usa el mensaje genérico de consulta,
          que es exactamente lo que corresponde acá. No se inventa un
          `tipo: "coleccion"` que el hook no contempla. */}
      <BotonWhatsapp contexto={{ tipo: "home" }} />
    </>
  );
}

export default Coleccion;
