import { useEffect, useState } from "react";
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

  // La URL puede llegar con filtros heredados (ej. link compartido con
  // `?categoria=...`), pero los filtros NO deben persistir entre visitas
  // (decisión de producto). Se captura una única vez si la navegación traía
  // params y se los ignora hasta que el reseteo efectivamente se aplique,
  // para que el primer fetch del grid ya salga sin filtros.
  //
  // No alcanza con un `useRef` + flag de "primer render": bajo StrictMode el
  // cuerpo del componente se ejecuta dos veces en el mount y el ref sobrevive
  // entre pasadas, así que la segunda (la que commitea) vería el flag ya
  // consumido y leería el filtro heredado igual. El `useState` con
  // inicializador lazy no tiene ese problema: React descarta el resultado de
  // la segunda invocación en vez de realimentar un flag mutable, y el flag
  // baja recién en el efecto, cuando el reseteo realmente se disparó.
  const [teniaFiltrosHeredados, setTeniaFiltrosHeredados] = useState(
    () => searchParams.toString() !== "",
  );

  // El reseteo va en un efecto, no en el cuerpo del render: React advierte
  // explícitamente contra navegar durante el render.
  //
  // El flag se baja apenas se dispara el reseteo. Es clave que NO quede
  // latcheado: si siguiera en `true`, cualquier filtro que el usuario
  // aplicara después (que vuelve a poner params en la URL) se leería otra vez
  // como "heredado" y se blanquearía, dejando la pantalla sin poder filtrar
  // para quien entró por un link compartido.
  useEffect(() => {
    if (teniaFiltrosHeredados) {
      setSearchParams(new URLSearchParams(), { replace: true });
      setTeniaFiltrosHeredados(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras el reseteo no haya llegado a la URL, los filtros se derivan
  // como vacíos. Una vez limpia, `searchParams` vuelve a ser la única fuente
  // de verdad y los filtros que aplique el usuario funcionan normalmente.
  const filtrosUrl = teniaFiltrosHeredados ? new URLSearchParams() : searchParams;
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
  //
  // No se commitea una búsqueda vacía que además ya está ausente de la URL:
  // no habría nada que cambiar, y ese commit "de más" del mount era
  // activamente dañino cuando la navegación traía filtros heredados — su
  // update funcional partía de un `prev` que todavía tenía el
  // `?categoria=...` y lo volvía a escribir, resucitando el filtro que el
  // reseteo acababa de limpiar. La condición mira los valores (no un
  // contador de renders) justamente para ser inmune al doble mount de
  // StrictMode.
  useEffect(() => {
    if (searchInput === "" && searchUrl === "") return;

    const timeoutId = setTimeout(() => {
      actualizarFiltro("search", searchInput);
    }, DEBOUNCE_SEARCH_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, searchUrl]);

  useEffect(() => {
    let activo = true;
    getCategorias()
      .then((data) => {
        if (activo) setCategorias(data);
      })
      .catch(() => {
        // Falla blanda: el dropdown queda sin categorías, pero el resto de
        // los filtros y el grid siguen funcionando.
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getProducts({ categoria, search: searchUrl, minPrecio, maxPrecio })
      .then((data) => {
        if (activo) setProductos(data);
      })
      .catch(() => {
        // El grid degrada a lista vacía ante un fallo de red/backend en vez
        // de quedar colgado en "Cargando productos…" para siempre.
        if (activo) setProductos([]);
      })
      .finally(() => {
        if (activo) setCargando(false);
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
