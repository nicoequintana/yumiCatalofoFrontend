import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import EstadoVacio from "../components/EstadoVacio.jsx";
import BotonVolver from "../components/BotonVolver.jsx";
import BotonWhatsapp from "../components/BotonWhatsapp.jsx";
import FiltrosCatalogo from "../components/FiltrosCatalogo.jsx";
import MetaSeo from "../components/MetaSeo.jsx";
import { getProducts } from "../api/products.js";
import { getCategorias } from "../api/categorias.js";
import { urlAbsoluta } from "../constants/seo.js";
import { rutaCategoria, slugify } from "../utils/slug.js";

const DEBOUNCE_SEARCH_MS = 350;

/**
 * Claves de la URL que son FILTROS. `page` queda deliberadamente afuera: los
 * filtros no persisten entre visitas (se blanquean al entrar, ver abajo), pero
 * la página sí tiene que sobrevivir — un link a la página 3 debe abrir la
 * página 3, y volver desde una ficha debe devolver a donde se estaba.
 */
/**
 * Los filtros que viven DENTRO del panel de `FiltrosCatalogo` — los que su
 * botón "Limpiar" borra y los que cuenta su badge. La búsqueda libre queda
 * afuera a propósito: tiene su propio input siempre visible en la barra.
 */
const CLAVES_FILTRO_PANEL = ["categoria", "minPrecio", "maxPrecio"];

const CLAVES_FILTRO = [...CLAVES_FILTRO_PANEL, "search"];

/**
 * Cuántos productos trae cada tanda de "Mostrar más". Sincronización manual
 * con `PAGE_SIZE_CATALOGO = 12` del backend (los repos se publican por
 * separado): si divergen no hay error, solo tandas de otro tamaño.
 */
const PRODUCTOS_POR_TANDA = 12;

/**
 * Tope de la RESTAURACIÓN (volver de una ficha con `?paginas=N` pide todo lo
 * acumulado en un solo request). Es el `MAX_PAGE_SIZE` del backend — pedir
 * más sería un 400. Más allá del tope se restauran 100 y el botón sigue
 * sumando tandas de a 12; solo la restauración se topea.
 */
const MAX_RESTAURACION = 100;

/**
 * La combinación exacta de filtros + tandas que produce un fetch. Es función
 * PURA a nivel de módulo (no un closure del componente) para poder usarse
 * dentro del efecto de fetch sin entrar en sus dependencias.
 */
function claveDeFetch(categoria, search, minPrecio, maxPrecio, tandas) {
  return `${categoria}|${search}|${minPrecio}|${maxPrecio}|${tandas}`;
}

/**
 * `/coleccion` — catálogo completo con filtros, separado de la home
 * editorial (`/`) per design doc 2026-08-19-separacion-home-coleccion.
 *
 * El carrusel de destacados ("Hallazgos del día") vive solo en la home
 * (`Catalogo.jsx`) — acá no se renderiza, para no repetir la misma vidriera
 * en dos pantallas.
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
  const { slugCategoria } = useParams();
  const navigate = useNavigate();
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

  // `paginas` —las tandas acumuladas de "Mostrar más"— se lee de
  // `searchParams` (no de `filtrosUrl`): no es un filtro y no se blanquea al
  // entrar, porque volver de una ficha tiene que restaurar lo que ya estaba
  // cargado. Un valor basura cae a 1 en vez de romper la vista.
  const paginasUrl = Number(searchParams.get("paginas"));
  const paginas = Number.isInteger(paginasUrl) && paginasUrl > 0 ? paginasUrl : 1;

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
  const [totalProductos, setTotalProductos] = useState(0);
  // El append de "Mostrar más" tiene su propio spinner y su propio error: el
  // `cargando` global reemplaza la grilla entera, y acá lo ya visto tiene que
  // quedarse en pantalla mientras baja la tanda siguiente.
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState(null);
  // La última combinación filtros+tandas que YA está en pantalla. El efecto
  // de fetch la compara para distinguir "la URL cambió porque el append la
  // escribió" (nada que pedir) de "cambió por navegación o filtro" (fetch
  // desde cero) — mismo patrón que `ultimoCommit` con la búsqueda.
  const claveCargada = useRef(null);

  // La categoría de la RUTA (`/coleccion/categoria/:slugCategoria`) es la
  // IDENTIDAD de la página, no un filtro heredado: por eso no entra en
  // `CLAVES_FILTRO` ni se blanquea al montar, a diferencia de `?categoria=`.
  // El slug se resuelve contra `categorias` (ya cargado o todavía no); un
  // slug que no matchea ninguna categoría real deja `categoriaDeRuta` en
  // `undefined` en vez de inventar un id — mismo resultado que "categorías
  // aún no cargaron", indistinguible a propósito: en los dos casos hay que
  // mostrarse como el catálogo sin filtrar hasta saber más.
  const categoriaDeRuta = slugCategoria
    ? categorias.find((c) => slugify(c.nombre) === slugCategoria)
    : null;

  // Una vez que `categorias` YA cargó, un slug que sigue sin matchear ninguna
  // es definitivamente inválido (no "todavía no sabemos"). Es la única señal
  // que distingue las dos situaciones, porque `categoriaDeRuta` es `undefined`
  // en ambas.
  const categoriaInvalida = Boolean(slugCategoria) && categorias.length > 0 && !categoriaDeRuta;

  // Filtro que efectivamente viaja a `getProducts`: la categoría de la ruta
  // manda sobre `?categoria=` cuando existe y es válida. Un slug inexistente
  // NO cae al valor de la querystring — un slug roto no debe "heredar" un
  // filtro que la URL no pidió — y en cambio deja pasar el catálogo entero,
  // que es lo que la página termina mostrando en ese caso.
  //
  // El fallback usa `categoria` (ya derivado de `filtrosUrl`, arriba), NO
  // `searchParams.get("categoria")` directo: `categoria` es el que respeta el
  // blanqueo de filtros heredados. Leer `searchParams` acá se salteaba el
  // blanqueo y un link viejo con `?categoria=2` volvía a filtrar solo en la
  // ruta plana `/coleccion` — justo el bug que el blanqueo existe para evitar.
  const categoriaActiva = categoriaDeRuta ? String(categoriaDeRuta.id) : slugCategoria ? "" : categoria;

  // Señal de "ya sé qué mostrar" para el efecto de fetch: en `/coleccion`
  // plano (sin `slugCategoria`) siempre es `true` y por lo tanto estable
  // entre renders — no dispara refetches de más. En una categoría de ruta
  // arranca en `false` mientras `categorias` está vacío y pasa a `true`
  // exactamente una vez, cuando `categorias` carga (con o sin match): esa
  // única transición es la que reactiva el efecto para pedir con el filtro ya
  // resuelto (o sin filtro, si el slug no matchea ninguna categoría).
  const categoriasListas = !slugCategoria || categorias.length > 0;

  const titulo = categoriaDeRuta ? `${categoriaDeRuta.nombre} — YIMA` : "Todos los productos — YIMA";
  const encabezado = categoriaDeRuta ? categoriaDeRuta.nombre : "Todos los productos";
  // Canonical propio SOLO para una categoría de ruta válida — construido con
  // `rutaCategoria`, la MISMA función que arma el `<loc>` del sitemap (nunca
  // a mano: son dos template literals mantenidos por separado esperando
  // divergir). Un slug inválido no tiene entrada en el sitemap y muestra el
  // mismo contenido que `/coleccion` sin filtrar, así que canoniza ahí en vez
  // de a una URL que no nombra ninguna categoría real.
  //
  // El `?? "/coleccion"` es defensivo, no alcanzable hoy: si `categoriaDeRuta`
  // existe es porque su `slugify(nombre)` matcheó el `slugCategoria` no vacío
  // de la URL, así que `rutaCategoria` sobre esa misma categoría no puede
  // devolver `null`.
  const rutaCanonica = categoriaDeRuta ? (rutaCategoria(categoriaDeRuta) ?? "/coleccion") : "/coleccion";

  // El selector de categoría de `FiltrosCatalogo` (la barra de filtros de
  // `/coleccion`, no el dropdown del Navbar — ese sigue fuera de alcance).
  // Cambiar la categoría NAVEGA, no escribe un filtro: la categoría es la
  // identidad de la página, y escribir `?categoria=id` acá reintroduciría el
  // conflicto query-vs-ruta que esta misma tarea vino a eliminar
  // (`categoriaActiva` ya ignora la query cuando hay `slugCategoria`, así que
  // el control seguiría muerto, solo que ensuciando la URL). El destino se
  // arma con `rutaCategoria`, nunca a mano — mismo criterio que `rutaCanonica`.
  //
  // Sin `categoriaId` ("Todas las categorías"): navega a `/coleccion` limpio.
  //
  // Si la categoría elegida no tiene slug posible (nombre solo símbolos, o
  // vacío — un caso de calidad de datos, no de ruteo: ninguna categoría real
  // del catálogo cae acá hoy), no hay `/coleccion/categoria/…` al que ir. La
  // alternativa evidente —navegar a `/coleccion?categoria=id`— se descartó
  // aposta: esa navegación cruza al Route de `/coleccion` con querystring
  // presente en el MISMO mount que dispara el blanqueo de filtros heredados
  // (`teniaFiltrosHeredados`), que borra `?categoria=` antes de que llegue a
  // usarse — el filtro se pierde en silencio, más confuso que no aplicarlo.
  // Se navega a `/coleccion` sin filtro: la página resultante es honesta
  // sobre lo que puede mostrar.
  function irACategoria(categoriaId) {
    if (!categoriaId) {
      navigate("/coleccion");
      return;
    }
    const elegida = categorias.find((c) => String(c.id) === categoriaId);
    navigate((elegida && rutaCategoria(elegida)) || "/coleccion");
  }

  /**
   * Última querystring escrita en este tick, o `null` si no se escribió
   * ninguna todavía.
   *
   * Existe porque `setSearchParams` de react-router **NO encola
   * actualizaciones funcionales** como el `setState` de React: dos llamadas
   * del mismo tick reciben las dos el MISMO `prev` (el del render vigente) y
   * gana la última, así que la primera se pierde entera. Es alcanzable de
   * verdad: los dos campos de precio tienen debounces independientes de
   * 350 ms, y si se completan casi a la vez los dos temporizadores caen en el
   * mismo lote de React — verificado en el navegador, `minPrecio` desaparecía
   * sin ningún error y el catálogo quedaba filtrado por la mitad de lo que la
   * persona había pedido.
   *
   * Guardando acá lo último escrito, la segunda escritura del tick COMPONE
   * sobre esa versión en lugar de pisarla.
   */
  const paramsPendientes = useRef(null);

  // Cuando la escritura ya llegó al router, la base vuelve a ser la URL real.
  // Sin este reseteo, una acción posterior compondría sobre un snapshot viejo.
  useEffect(() => {
    paramsPendientes.current = null;
  }, [searchParams]);

  // { replace: true }: react-router-dom v7's useSearchParams pushes a new
  // history entry by default. A filter change is a refinement of the same
  // view, not a new page to visit — without replace, every categoria/precio
  // tweak (and each debounced search commit) stacks its own "atrás" entry,
  // so a user who filters and then hits back needs one click per filter
  // change before actually leaving the page.
  function escribirParams(mutar) {
    const base = paramsPendientes.current ?? searchParams;
    const next = new URLSearchParams(base);
    mutar(next);
    paramsPendientes.current = next;
    setSearchParams(next, { replace: true });
  }
  function actualizarFiltro(clave, valor) {
    escribirParams((next) => {
      if (valor) {
        next.set(clave, valor);
      } else {
        next.delete(clave);
      }
      // Cambiar un filtro vuelve a la primera tanda: las tandas acumuladas
      // del resultado anterior no tienen por qué existir en el nuevo.
      next.delete("paginas");
    });
  }

  /**
   * "Limpiar" del panel de filtros: UNA sola escritura al router para los
   * tres filtros a la vez.
   *
   * NO se implementa llamando a `irACategoria("")` + dos `actualizarFiltro`,
   * que es lo natural y estaba roto: `setSearchParams` de react-router NO
   * encola actualizaciones funcionales como el `setState` de React. Las tres
   * llamadas del mismo tick parten del MISMO snapshot de `searchParams` y
   * gana la última, así que de tres claves borradas se aplicaba una sola — y
   * el `navigate` de la categoría quedaba pisado encima. Verificado en el
   * navegador: la URL quedaba idéntica después de tocar "Limpiar".
   */
  function limpiarFiltrosDePanel() {
    // En una ruta de categoría ese filtro no vive en la querystring sino en
    // la URL, así que la única forma de sacarlo es salir de la ruta. Esa
    // navegación remonta `Coleccion` y el blanqueo de filtros heredados se
    // lleva puesta también la búsqueda libre: es la misma limitación ya
    // documentada para el selector de categoría, no una nueva.
    if (slugCategoria) {
      navigate("/coleccion", { replace: true });
      return;
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const clave of CLAVES_FILTRO_PANEL) next.delete(clave);
        // Mismo motivo que en `actualizarFiltro`: las tandas del resultado
        // anterior no tienen por qué existir en el resultado sin filtrar.
        next.delete("paginas");
        return next;
      },
      { replace: true },
    );
  }

  // Las tandas van con `replace` (vía `escribirParams`, que ya lo impone):
  // cargar más no es navegar a otro lado, es ver más de la misma vista — y en
  // la URL para que volver de una ficha restaure lo cargado.
  function escribirTandas(n) {
    escribirParams((next) => {
      if (n <= 1) {
        next.delete("paginas");
      } else {
        next.set("paginas", String(n));
      }
    });
  }

  async function mostrarMas() {
    const siguiente = paginas + 1;
    setCargandoMas(true);
    setErrorMas(null);
    try {
      const { data, total } = await getProducts({
        categoria: categoriaActiva,
        search: searchUrl,
        minPrecio,
        maxPrecio,
        page: siguiente,
        pageSize: PRODUCTOS_POR_TANDA,
      });
      // El catálogo pudo moverse entre tandas (un alta corre las páginas):
      // un id que ya está en pantalla no se suma dos veces — dos keys
      // iguales romperían la reconciliación de la grilla.
      setProductos((prev) => {
        const vistos = new Set(prev.map((p) => p.id));
        return [...prev, ...data.filter((p) => !vistos.has(p.id))];
      });
      setTotalProductos(total);
      claveCargada.current = claveDeFetch(categoriaActiva, searchUrl, minPrecio, maxPrecio, siguiente);
      escribirTandas(siguiente);
    } catch {
      // El error del append NO vacía la grilla: lo ya visto se queda, el
      // aviso va pegado al botón y el botón queda para reintentar.
      setErrorMas("No se pudieron cargar más productos. Probá de nuevo.");
    } finally {
      setCargandoMas(false);
    }
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
    // Con categoría de ruta, `categorias` todavía no cargó: el slug no se
    // pudo resolver todavía a un id (o a "inválido"). Salir ahora —en vez de
    // pedir sin filtro— es lo que evita el flash del catálogo completo antes
    // de que aparezca la vista filtrada por categoría.
    if (!categoriasListas) return;

    // Esta combinación exacta ya está en pantalla: el cambio de URL vino del
    // append de "Mostrar más", que ya sumó la tanda y escribió `?paginas=`.
    // Volver a pedir acá reemplazaría la grilla con un flash de spinner.
    const clave = claveDeFetch(categoriaActiva, searchUrl, minPrecio, maxPrecio, paginas);
    if (clave === claveCargada.current) return;

    let activo = true;
    setCargando(true);

    getProducts({
      categoria: categoriaActiva,
      search: searchUrl,
      minPrecio,
      maxPrecio,
      page: 1,
      // La restauración trae TODO lo acumulado en un solo request (volver de
      // una ficha con `?paginas=3` son 36 productos), topeado en el máximo
      // del backend.
      pageSize: Math.min(PRODUCTOS_POR_TANDA * paginas, MAX_RESTAURACION),
    })
      .then(({ data, total }) => {
        if (!activo) return;
        claveCargada.current = clave;
        setProductos(data);
        setTotalProductos(total);
        // Un fetch exitoso limpia cualquier error anterior: el backend volvió.
        setErrorCarga(null);
        setErrorMas(null);
      })
      .catch(() => {
        // Con el backend caído el grid NO degrada a lista vacía: eso se leía
        // como "todavía no hay productos", que es mentira — los productos
        // están, lo que falló es la conexión. Se marca el error para mostrar
        // el mismo patrón que Carrito/Favoritos/ProductoDetalle.
        if (!activo) return;
        setProductos([]);
        setTotalProductos(0);
        setErrorCarga("Revisá tu conexión e intentá de nuevo.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [categoriaActiva, searchUrl, minPrecio, maxPrecio, paginas, categoriasListas]);

  // Un link viejo o un catálogo que se achicó pueden dejar la URL pidiendo
  // más tandas de las que existen. Se corrige a las reales (con `replace`,
  // vía `escribirParams`): sin eso, "atrás" volvería a la URL inválida y la
  // corrección se repetiría para siempre.
  useEffect(() => {
    if (cargando) return;
    const tandasReales = Math.max(1, Math.ceil(totalProductos / PRODUCTOS_POR_TANDA));
    if (paginas > tandasReales) escribirTandas(tandasReales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, paginas, totalProductos]);

  // `categoriaActiva`, no `categoria`: en `/coleccion/categoria/:slug` el
  // filtro vive en la ruta, y `categoria` (derivado de la querystring) queda
  // vacío ahí — con `categoria` a secas, una categoría de ruta sin productos
  // mostraba "Todavía no hay productos" (le dice al visitante que el
  // catálogo ENTERO está vacío) en vez de "Sin resultados" (lo que
  // corresponde a un filtro que no encontró nada). Mismo criterio que
  // documenta CLAUDE.md para el buscador del admin.
  const hayFiltrosActivos = Boolean(categoriaActiva || searchUrl || minPrecio || maxPrecio);

  return (
    <>
      <MetaSeo
        titulo={titulo}
        descripcion={
          categoriaDeRuta
            ? `Productos de ${categoriaDeRuta.nombre} en YIMA: útiles, innovadores y con diseño.`
            : "Explorá el catálogo completo de YIMA: filtrá por categoría y precio para encontrar lo que buscás."
        }
        // El canonical de una categoría de ruta VÁLIDA apunta a su propia URL
        // (mismo string que emite el sitemap para esa categoría). `/coleccion`
        // sin filtro, las combinaciones por querystring, las páginas 2+ y un
        // slug de categoría inválido canonizan a /coleccion limpio: son la
        // misma mercadería reordenada, o —en el caso del slug inválido— el
        // mismo contenido sin filtrar servido bajo una URL que no nombra
        // ninguna categoría real.
        canonical={urlAbsoluta(rutaCanonica)}
        noindex={paginas > 1 || categoriaInvalida}
      />

      {/* Salida de la página, antes de cualquier contenido: `/coleccion` es un
          destino propio al que se puede llegar por link compartido, y sin esto
          el usuario queda sin forma de volver dentro de la app. A diferencia
          de ProductoDetalle (que oculta su BotonVolver en mobile porque tiene
          un header sticky con flecha propia), acá se muestra en todos los
          breakpoints: esta página no tiene ese header, así que ocultarlo en
          mobile dejaría sin salida justo donde el gesto de "atrás" del sistema
          es menos evidente dentro de una SPA. */}
      {/* Va en `surface-container-low`, el MISMO fondo que la barra de filtros
          y la sección de la grilla. Quedó en `background` (el crema del hero)
          hasta el 29/08/2026 y era la única franja de la página en ese tono:
          se leía como un corte horizontal justo debajo del navbar. Todo lo
          que está por debajo del navbar en esta página es una sola capa. */}
      <div className="w-full bg-surface-container-low">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile pb-3 pt-6 md:px-margin-desktop md:pt-8">
          <BotonVolver />
        </div>
      </div>

      {/* El `<h1>` de la página vive DENTRO de esta barra, no arriba de la
          grilla: es lo que queda pegado al navbar al scrollear, junto al
          botón de filtros. */}
      <FiltrosCatalogo
        titulo={encabezado}
        categorias={categorias}
        categoria={categoriaActiva}
        onChangeCategoria={irACategoria}
        search={searchInput}
        onChangeSearch={setSearchInput}
        minPrecio={minPrecio}
        onChangeMinPrecio={(valor) => actualizarFiltro("minPrecio", valor)}
        maxPrecio={maxPrecio}
        onChangeMaxPrecio={(valor) => actualizarFiltro("maxPrecio", valor)}
        onLimpiarFiltros={limpiarFiltrosDePanel}
      />

      {/* Collection Grid — section header from home.html L132-136, card grid idiom from catalogo.html.
          Fondo en surface-container-low (más oscuro que el hero, en background)
          para que la franja de filtros + esta sección se lean como una capa
          propia, y las ProductCard (en surface-container-lowest) resalten con
          más contraste sobre ella. */}
      <section className="w-full bg-surface-container-low">
        <div className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-12">
          {/* Acá había el `<h1>` de la página más un bloque decorativo
              centrado («NUESTRA COLECCIÓN / Productos»). Los dos se sacaron:
              el `<h1>` se mudó a la barra sticky (`FiltrosCatalogo`), y con
              el título ya visible ahí arriba el bloque quedaba diciendo lo
              mismo dos veces y empujaba la grilla ~120px hacia abajo. */}
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
            <div className="grid grid-cols-2 gap-3 md:gap-gutter lg:grid-cols-4">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          )}

          {/* "Mostrar más" en vez de paginado (02/09/2026): explorar una
              tienda es descubrimiento continuo, y las tandas se SUMAN debajo
              sin tocar lo ya visto. Sin contador de avance por pedido
              explícito (02/09/2026): cuando no queda nada por cargar, el
              botón simplemente desaparece. */}
          {!cargando && productos.length < totalProductos ? (
            <div className="mt-10 flex flex-col items-center gap-3">
              {errorMas ? (
                <p role="alert" className="font-body-md text-body-md text-error">
                  {errorMas}
                </p>
              ) : null}
              <button
                type="button"
                onClick={mostrarMas}
                disabled={cargandoMas}
                className="rounded-full border border-outline px-8 py-3 font-label-md text-label-md uppercase tracking-widest text-on-surface transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
              >
                {cargandoMas ? "Cargando…" : "Mostrar más"}
              </button>
            </div>
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
