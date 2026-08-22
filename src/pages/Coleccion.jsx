import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FiltrosCatalogo from "../components/FiltrosCatalogo.jsx";
import Paginador from "../components/Paginador.jsx";
import CarruselDestacados from "../components/CarruselDestacados.jsx";
import useDestacados from "../hooks/useDestacados.js";
import { getProducts } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";

const DEBOUNCE_SEARCH_MS = 350;

/**
 * Claves de la URL que son FILTROS. `page` queda deliberadamente afuera: los
 * filtros no persisten entre visitas (se blanquean al entrar, ver abajo), pero
 * la página sí tiene que sobrevivir — un link a la página 3 debe abrir la
 * página 3, y volver desde una ficha debe devolver a donde se estaba.
 */
const CLAVES_FILTRO = ["categoria", "search", "minPrecio", "maxPrecio"];

/**
 * `/coleccion` — catálogo completo con filtros, separado de la home
 * editorial (`/`) per design doc 2026-08-19-separacion-home-coleccion.
 *
 * El carrusel de destacados se muestra arriba con su propio fetch sin filtros
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
  const [teniaFiltrosHeredados, setTeniaFiltrosHeredados] = useState(() =>
    CLAVES_FILTRO.some((clave) => searchParams.has(clave)),
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
      // Se borran SOLO los filtros, no la querystring entera: `page` tiene que
      // sobrevivir para que un link a la página 3 siga abriendo la página 3.
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const clave of CLAVES_FILTRO) next.delete(clave);
          return next;
        },
        { replace: true },
      );
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

  // `page` se lee de `searchParams` (no de `filtrosUrl`): no es un filtro y no
  // se blanquea al entrar. Un valor basura cae a 1 en vez de romper la vista.
  const paginaUrl = Number(searchParams.get("page"));
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;

  const { productos: destacados } = useDestacados();
  const [searchInput, setSearchInput] = useState("");

  // Último valor que el input de búsqueda emitió o adoptó — mismo patrón que
  // `CampoPrecio` en `FiltrosCatalogo.jsx`. Comparar contra él distingue "el
  // usuario está tipeando" de "la URL cambió por navegación" (Atrás, un link
  // a la ruta pelada). Sin esa distinción, quitar `?search=` navegando no
  // desmonta el componente: el input conservaba el término y el debounce lo
  // volvía a escribir en la URL 350 ms después, resucitando el filtro.
  const ultimoCommit = useRef(searchUrl);

  // La URL cambió por afuera del input: el input la adopta.
  useEffect(() => {
    if (searchUrl === ultimoCommit.current) return;
    ultimoCommit.current = searchUrl;
    setSearchInput(searchUrl);
  }, [searchUrl]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(null);
  const [totalPaginas, setTotalPaginas] = useState(1);

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
        // Cambiar un filtro vuelve a la página 1: la página 4 del resultado
        // anterior no tiene por qué existir en el resultado nuevo, y quedarse
        // ahí mostraría una grilla vacía como si el filtro no encontrara nada.
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  // La navegación entre páginas SÍ empuja una entrada de historial (a
  // diferencia de los filtros, que van con `replace`): pasar de página es ir a
  // otro lugar del catálogo, y "atrás" tiene que devolver a la página anterior.
  function irAPagina(numero, { reemplazar = false } = {}) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (numero <= 1) {
          next.delete("page");
        } else {
          next.set("page", String(numero));
        }
        return next;
      },
      { replace: reemplazar },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Debounce: commit the free-text search into the URL (and therefore into
  // the fetch effect's deps) only after the user stops typing.
  //
  // La guarda contra `ultimoCommit` evita el commit "de más" del mount (que
  // era activamente dañino cuando la navegación traía filtros heredados: su
  // update funcional partía de un `prev` que todavía tenía el
  // `?categoria=...` y lo volvía a escribir, resucitando el filtro que el
  // reseteo acababa de limpiar) y el rebote de un valor recién adoptado
  // desde la URL. La condición mira valores (no un contador de renders)
  // justamente para ser inmune al doble mount de StrictMode.
  useEffect(() => {
    if (searchInput === ultimoCommit.current) return;

    const timeoutId = setTimeout(() => {
      ultimoCommit.current = searchInput;
      actualizarFiltro("search", searchInput);
    }, DEBOUNCE_SEARCH_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

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

    getProducts({ categoria, search: searchUrl, minPrecio, maxPrecio, page: pagina })
      .then(({ data, total, pageSize }) => {
        if (!activo) return;
        setProductos(data);
        setTotalPaginas(Math.max(1, Math.ceil(total / pageSize)));
        // Un fetch exitoso limpia cualquier error anterior: el backend volvió.
        setErrorCarga(null);
      })
      .catch(() => {
        // Con el backend caído el grid NO degrada a lista vacía: eso se leía
        // como "todavía no hay productos", que es mentira — los productos
        // están, lo que falló es la conexión. Se marca el error para mostrar
        // el mismo patrón que Carrito/Favoritos/ProductoDetalle.
        if (!activo) return;
        setProductos([]);
        setTotalPaginas(1);
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [categoria, searchUrl, minPrecio, maxPrecio, pagina]);

  // Un link viejo o un catálogo que se achicó pueden dejar la URL apuntando a
  // una página que ya no existe. En vez de mostrar "Sin resultados" —que
  // mentiría: los productos están, la página no— se corrige a la última real.
  useEffect(() => {
    if (cargando) return;
    // `reemplazar`: la página inválida no debe quedar en el historial, o
    // "atrás" volvería a ella y la corrección se repetiría para siempre.
    if (pagina > totalPaginas) irAPagina(totalPaginas, { reemplazar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, pagina, totalPaginas]);

  const hayFiltrosActivos = Boolean(categoria || searchUrl || minPrecio || maxPrecio);

  return (
    <>
      {/* Salida de la página, antes de cualquier contenido: `/coleccion` es un
          destino propio al que se puede llegar por link compartido, y sin esto
          el usuario queda sin forma de volver dentro de la app. A diferencia
          de ProductoDetalle (que oculta su BotonVolver en mobile porque tiene
          un header sticky con flecha propia), acá se muestra en todos los
          breakpoints: esta página no tiene ese header, así que ocultarlo en
          mobile dejaría sin salida justo donde el gesto de "atrás" del sistema
          es menos evidente dentro de una SPA. */}
      <div className="mx-auto w-full max-w-container-max px-margin-mobile pt-6 md:px-margin-desktop md:pt-8">
        <BotonVolver />
      </div>

      <CarruselDestacados productos={destacados} />

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
      <section className="w-full bg-surface-container-low">
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
          ) : errorCarga ? (
            <EstadoVacio
              icono="cloud_off"
              titulo="No pudimos cargar los productos"
              mensaje={errorCarga}
            />
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
            // Grid uniforme: 1 columna en móvil, 2 en tablet, 4 en desktop.
            // Antes cada 4ª card se renderizaba ancha y horizontal (mezcla de
            // spans heredada del mockup), lo que rompía el ritmo de la grilla
            // en vez de darle asimetría editorial.
            //
            // `grid-cols-N` directo en lugar del sistema de 12 + `col-span-*`:
            // con columnas uniformes los spans no aportan nada y obligaban a
            // un `<div>` envoltorio por card.
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          )}

          {!cargando ? (
            <Paginador
              pagina={pagina}
              totalPaginas={totalPaginas}
              onCambiar={irAPagina}
              etiqueta="Paginación de la colección"
            />
          ) : null}
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
