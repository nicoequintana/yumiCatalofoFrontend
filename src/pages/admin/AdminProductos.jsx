import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import Paginador from "../../components/Paginador.jsx";
import TarjetaMetrica from "../../components/admin/TarjetaMetrica.jsx";
import BotonActualizar from "../../components/admin/BotonActualizar.jsx";
import { claseTablaApilada } from "../../components/admin/clasesTabla.js";
import {
  deleteProductsMasivo,
  getProducts,
  getProductsResumen,
  updateMerchandising,
  updateVisibilidad,
  updateVisibilidadMasiva,
} from "../../api/products.js";
import { formatPrecio } from "../../utils/formato.js";
import useDialogo from "../../hooks/useDialogo.js";
import { MIN_DESTACADOS } from "../../hooks/useDestacados.js";

/** Pausa antes de mandar lo tipeado a la URL (y por lo tanto al backend). */
const DEBOUNCE_BUSQUEDA_MS = 350;

/**
 * Filas por página de ESTA pantalla.
 *
 * Se manda explícito en vez de heredar el `PAGE_SIZE_CATALOGO = 12` del
 * backend: ese 12 existe por la grilla pública, que tiene 1, 2 o 4 columnas
 * según el breakpoint y con otro número dejaría filas huérfanas. Acá es una
 * tabla, así que el argumento no aplica y lo que importa es ver más catálogo
 * de un saque. El techo del backend (`MAX_PAGE_SIZE`) es 100.
 */
const PRODUCTOS_POR_PAGINA = 50;

/**
 * Criterios del selector "Ordenar por", espejo de `ORDENES_LISTADO` en
 * `backend/src/controllers/products.controller.js`.
 *
 * **El orden lo resuelve la BASE, no esta pantalla.** La tabla está paginada:
 * un `sort()` sobre `productos` reordenaría las 50 filas que tocaron, no el
 * catálogo — el mismo error que ya obligó a bajar el ranking de vistas al
 * backend. Por eso cada valor viaja tal cual en `?orden=`.
 *
 * El default (`""`) NO manda el parámetro: el orden lo decide
 * el backend, y mandarlo explícito desde acá duplicaría esa decisión.
 *
 * Es una sincronización manual entre repos, del mismo tipo que
 * `MAX_IDS_POR_CONSULTA` — un valor que no exista allá cae al default sin
 * error, así que un typo acá se ve como "el orden no hace nada".
 */
const ORDENES = [
  { valor: "", etiqueta: "Más recientes" },
  { valor: "nombre", etiqueta: "Nombre: A → Z" },
  { valor: "nombre-desc", etiqueta: "Nombre: Z → A" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
  { valor: "stock-asc", etiqueta: "Stock: menos primero" },
  { valor: "stock-desc", etiqueta: "Stock: más primero" },
  { valor: "fotos-asc", etiqueta: "Sin fotos primero" },
  { valor: "fotos-desc", etiqueta: "Con más fotos primero" },
  { valor: "recientes", etiqueta: "Más recientes primero" },
  { valor: "vistas", etiqueta: "Más vistos primero" },
];

/**
 * Valor de una tarjeta de contador.
 *
 * Se emite el número pelado, sin `toLocaleString`: la salida de `Intl` depende
 * de la versión de ICU del runtime — el mismo motivo por el que `formatPrecio`
 * y `formatearMonto` son manuales en este proyecto — y un conteo de catálogo no
 * llega a necesitar separador de miles.
 *
 * Un valor ausente (todavía cargando, o el pedido falló) es `—`, jamás `0`.
 */
function valorResumen(numero) {
  return typeof numero === "number" ? String(numero) : "—";
}

/** Cuántos productos están cargados pero fuera del catálogo público. */
function detalleTotales(resumen) {
  if (!resumen) return "Contadores no disponibles";
  const ocultos = resumen.total - resumen.visibles;
  return ocultos > 0 ? `${ocultos} ocultos` : "Ninguno oculto";
}

/**
 * Aclara la diferencia entre "visible" y "se ve en la tienda".
 *
 * El toggle "Catálogo" de la tabla es `visibleEnCatalogo`, pero `/coleccion`
 * además excluye los agotados. Sin esta línea, el número de arriba no cuadraría
 * con lo que el admin cuenta en el sitio público y no habría forma de saber por
 * qué.
 */
function detalleVisibles(resumen) {
  if (!resumen) return "Contadores no disponibles";
  const agotados = resumen.visibles - resumen.publicados;
  return agotados > 0
    ? `${agotados} sin stock, no se ven en la tienda`
    : `${resumen.publicados} se ven en la tienda`;
}

/**
 * Contesta la pregunta que aparece cuando el carrusel de la home no se ve.
 *
 * `CarruselDestacados` se esconde por debajo de `MIN_DESTACADOS` productos
 * destacados **visibles y con stock** — no basta con encender el flag. Ese
 * umbral se importa del hook, no se reescribe acá.
 */
function detalleDestacados(resumen) {
  if (!resumen) return "Contadores no disponibles";
  return resumen.destacadosPublicados >= MIN_DESTACADOS
    ? `${resumen.destacadosPublicados} en el carrusel de la home`
    : `El carrusel de la home no se muestra: hacen falta ${MIN_DESTACADOS} destacados visibles y con stock`;
}

/**
 * `/catalogo/admin` — admin product list.
 *
 * No client mockup exists for admin (CLAUDE.md-derived, per spec's "Admin
 * product list" requirement) — this page reuses the same visual language as
 * the public pages (`rounded-xl shadow-ambient`, `Playfair`/`Montserrat`
 * tokens, `Badge`, `EstadoVacio`) rather than inventing a new admin theme.
 * Reuses the shared `Layout`/`Navbar` — no distinct admin chrome (nothing
 * in CLAUDE.md or design.md calls for one), and `/catalogo/admin*` stays
 * unlinked from public nav per the finalized decision.
 *
 * Buscador: un solo campo contra nombre, SKU y categoría (el backend une los
 * tres con OR). El término vive en la URL — un listado filtrado se puede
 * compartir, recargar, y volver de editar un producto devuelve a la búsqueda
 * que lo encontró.
 */
function AdminProductos() {
  // La página vive en la URL, igual que en `/coleccion`: así volver del
  // formulario de edición devuelve a la página desde la que se entró.
  //
  // La búsqueda también: un listado filtrado se puede compartir o recargar, y
  // volver de editar un producto devuelve a la búsqueda que lo encontró en
  // vez de a la tabla completa.
  const [searchParams, setSearchParams] = useSearchParams();
  const paginaUrl = Number(searchParams.get("page"));
  const pagina = Number.isInteger(paginaUrl) && paginaUrl > 0 ? paginaUrl : 1;
  const busqueda = searchParams.get("search") ?? "";
  // Igual que `page` y `search`: vive en la URL, así un listado ordenado se
  // comparte, se recarga, y volver de editar un producto devuelve al mismo
  // orden en vez de a la tabla por defecto.
  const orden = searchParams.get("orden") ?? "";

  // Estado local para que cada tecla no escriba en la URL (y no dispare un
  // request). Se inicializa desde la URL para que recargar con `?search=`
  // muestre el término en el input en vez de una caja vacía sobre una tabla
  // filtrada, que se leería como un bug.
  const [busquedaInput, setBusquedaInput] = useState(busqueda);

  // Último valor que el input emitió o adoptó — mismo patrón que `CampoPrecio`
  // en `FiltrosCatalogo.jsx`. Comparar contra él distingue "el admin está
  // tipeando" de "la URL cambió por navegación" (el link Productos del
  // sidebar, Atrás). Sin esa distinción, navegar a la ruta sin `?search=` no
  // desmonta el componente: el input conservaba el término y el debounce lo
  // volvía a escribir en la URL 350 ms después, resucitando el filtro.
  const ultimoCommit = useRef(busqueda);

  // La URL cambió por afuera del input: el input la adopta.
  useEffect(() => {
    if (busqueda === ultimoCommit.current) return;
    ultimoCommit.current = busqueda;
    setBusquedaInput(busqueda);
  }, [busqueda]);

  const [productos, setProductos] = useState([]);
  const [totalPaginas, setTotalPaginas] = useState(1);

  // Conteos del catálogo ENTERO, independientes de la página y de la búsqueda.
  //
  // Tres formas, y las tres significan cosas distintas: `undefined` es "todavía
  // no llegaron", `null` es "no se pudieron traer" y el objeto son los números.
  // Las dos primeras se muestran como `—`, nunca como `0`: un cero se leería
  // como "no hay productos" justo arriba de una tabla que sí tiene filas, que
  // es exactamente el dato inventado que esta pantalla no puede dar.
  const [resumen, setResumen] = useState(undefined);
  // Se incrementa después de cada mutación exitosa para que los contadores se
  // vuelvan a pedir. Sin esto, los toggles de visibilidad y destacado —que
  // actualizan la fila en memoria sin recargar el listado— dejarían el número
  // de arriba contradiciendo a la tabla de abajo, sin ningún aviso.
  const [versionResumen, setVersionResumen] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizandoVisibilidadId, setActualizandoVisibilidadId] = useState(null);
  const [actualizandoDestacadoId, setActualizandoDestacadoId] = useState(null);

  // Ids tildados con los checkbox. Es un `Set` y no un array porque la
  // pregunta que se le hace en cada fila del render es "¿está este id?".
  const [seleccionados, setSeleccionados] = useState(() => new Set());
  const [accionMasivaEnCurso, setAccionMasivaEnCurso] = useState(false);
  const [confirmandoBorradoMasivo, setConfirmandoBorradoMasivo] = useState(false);
  // Resultado del último borrado masivo, para poder informar lo que NO se
  // borró. Ver el comentario de `handleEliminarMasivo`.
  const [resultadoMasivo, setResultadoMasivo] = useState(null);

  const idsSeleccionados = productos.filter((p) => seleccionados.has(p.id)).map((p) => p.id);
  const haySeleccion = idsSeleccionados.length > 0;
  const todosSeleccionados = productos.length > 0 && idsSeleccionados.length === productos.length;

  // La selección NO sobrevive a un cambio de página ni de búsqueda: los ids
  // tildados dejarían de estar en pantalla, y ejecutar "eliminar" sobre cosas
  // que no se ven es exactamente el accidente que este checkbox podría causar.
  useEffect(() => {
    setSeleccionados(new Set());
    setResultadoMasivo(null);
  }, [pagina, busqueda, orden]);

  function alternarSeleccion(id) {
    setSeleccionados((actuales) => {
      const siguiente = new Set(actuales);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  function alternarTodos() {
    setSeleccionados(todosSeleccionados ? new Set() : new Set(productos.map((p) => p.id)));
  }

  // El borrado individual vive en el editor del producto (`EditorHeader`), no
  // acá: esta tabla solo lleva a la ficha. Lo que queda es el borrado EN LOTE,
  // que es otra acción — destructiva e irreversible, así que su diálogo atrapa
  // el foco, cierra con Escape, y no se deja cerrar por teclado mientras el
  // pedido ya salió al backend.
  const dialogoMasivoRef = useDialogo({
    abierto: confirmandoBorradoMasivo,
    onCerrar: () => {
      if (accionMasivaEnCurso) return;
      setConfirmandoBorradoMasivo(false);
    },
  });

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
  }

  /**
   * Commitea el término de búsqueda a la URL.
   *
   * `replace`: refinar una búsqueda es seguir en el mismo lugar, no navegar a
   * otro — sin esto cada tecla comiteada apila una entrada de historial y
   * "atrás" necesitaría un click por letra para salir de la pantalla. Es el
   * mismo criterio que usan los filtros de `/coleccion`.
   *
   * Se borra `page` porque la página 4 del resultado anterior puede no existir
   * en el nuevo, y quedarse ahí mostraría una tabla vacía como si la búsqueda
   * no encontrara nada.
   */
  /**
   * Commitea el criterio de orden a la URL.
   *
   * Mismo criterio que `commitBusqueda`: se borra `page` (la página 3 del
   * orden anterior no contiene lo mismo en el nuevo, y quedarse ahí muestra
   * filas que nadie pidió) y va con `replace` porque reordenar es seguir en
   * la misma pantalla, no navegar a otra.
   *
   * El default se quita de la URL en vez de escribirse como `orden=`: una
   * dirección sin el parámetro y una con el valor vacío tienen que significar
   * lo mismo.
   */
  function cambiarOrden(valor) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) {
          next.set("orden", valor);
        } else {
          next.delete("orden");
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function commitBusqueda(valor) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (valor) {
          next.set("search", valor);
        } else {
          next.delete("search");
        }
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  // Debounce: el término llega a la URL (y al efecto de fetch) recién cuando
  // el admin deja de tipear. La guarda contra `ultimoCommit` evita el commit
  // de más del montaje y el rebote de un valor recién adoptado desde la URL.
  useEffect(() => {
    if (busquedaInput === ultimoCommit.current) return;

    const timeoutId = setTimeout(() => {
      ultimoCommit.current = busquedaInput;
      commitBusqueda(busquedaInput);
    }, DEBOUNCE_BUSQUEDA_MS);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busquedaInput]);

  function aplicarPagina({ data, total, pageSize }) {
    setProductos(data);
    setTotalPaginas(Math.max(1, Math.ceil(total / pageSize)));
  }

  async function cargarProductos() {
    setCargando(true);
    try {
      aplicarPagina(await getProducts({ admin: true, page: pagina, search: busqueda, orden: orden || undefined, pageSize: PRODUCTOS_POR_PAGINA }));
    } catch {
      setError("No se pudieron cargar los productos. Revisá tu conexión e intentá de nuevo.");
    } finally {
      // En `finally` a propósito: si la recarga falla, el spinner tiene que
      // apagarse igual y dejar la tabla anterior a la vista.
      setCargando(false);
    }
  }

  useEffect(() => {
    let activo = true;

    setCargando(true);

    getProducts({ admin: true, page: pagina, search: busqueda, orden: orden || undefined, pageSize: PRODUCTOS_POR_PAGINA })
      .then((respuesta) => {
        if (!activo) return;
        aplicarPagina(respuesta);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre, sin decir qué pasó.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar los productos. Revisá tu conexión e intentá de nuevo.");
        setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [pagina, busqueda, orden]);

  // Los contadores se piden aparte del listado: son globales, así que no
  // dependen de `pagina` ni de `busqueda`. Un fallo acá deja `resumen` en
  // `null` (las tarjetas muestran `—`) y NO toca `error`: la tabla es lo que
  // esta pantalla existe para mostrar, y un cartel rojo arriba de un listado
  // que cargó bien confundiría más de lo que informa.
  useEffect(() => {
    let activo = true;

    (async () => {
      try {
        const datos = await getProductsResumen();
        if (activo) setResumen(datos ?? null);
      } catch {
        if (activo) setResumen(null);
      }
    })();

    return () => {
      activo = false;
    };
  }, [versionResumen]);

  /** Marca los contadores como vencidos tras una mutación exitosa. */
  function refrescarResumen() {
    setVersionResumen((v) => v + 1);
  }

  // Borrar el último producto de la última página la deja sin filas. En vez de
  // mostrar la tabla vacía como si no hubiera productos, se retrocede una
  // página (el efecto de arriba vuelve a cargar).
  useEffect(() => {
    if (cargando) return;
    // `reemplazar`: la página que quedó vacía no debe volver por "atrás".
    if (pagina > totalPaginas) irAPagina(totalPaginas, { reemplazar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, pagina, totalPaginas]);

  async function handleVisibilidadMasiva(visible) {
    setError(null);
    setResultadoMasivo(null);
    setAccionMasivaEnCurso(true);
    try {
      await updateVisibilidadMasiva(idsSeleccionados, visible);
      setSeleccionados(new Set());
      refrescarResumen();
      await cargarProductos();
    } catch (err) {
      setError(err.message ?? "No se pudo cambiar la visibilidad de los productos seleccionados.");
    } finally {
      setAccionMasivaEnCurso(false);
    }
  }

  /**
   * Borra los seleccionados y guarda el resultado para poder informarlo.
   *
   * **El resultado es parcial y hay que mostrarlo.** El backend rechaza todo
   * producto que aparezca en alguna orden (`ItemOrden.product` es
   * `onDelete: NoAction`), y en una selección grande eso es lo habitual. Un
   * cartel de éxito a secas dejaría al admin creyendo que limpió el catálogo
   * cuando la mitad sigue ahí — por eso se guarda `rechazados` con su motivo
   * y se renderiza debajo de la barra de acciones.
   */
  async function handleEliminarMasivo() {
    setError(null);
    setAccionMasivaEnCurso(true);
    try {
      const resultado = await deleteProductsMasivo(idsSeleccionados);
      setResultadoMasivo(resultado);
      setConfirmandoBorradoMasivo(false);
      setSeleccionados(new Set());
      refrescarResumen();
      await cargarProductos();
    } catch (err) {
      setError(err.message ?? "No se pudieron eliminar los productos seleccionados.");
    } finally {
      setAccionMasivaEnCurso(false);
    }
  }

  async function handleToggleVisibilidad(producto) {
    setError(null);
    setActualizandoVisibilidadId(producto.id);
    try {
      const actualizado = await updateVisibilidad(producto.id, !producto.visibleEnCatalogo);
      setProductos((actuales) => actuales.map((p) => (p.id === actualizado.id ? actualizado : p)));
      refrescarResumen();
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar la visibilidad del producto.");
    } finally {
      setActualizandoVisibilidadId(null);
    }
  }

  async function handleToggleDestacado(producto) {
    setError(null);
    setActualizandoDestacadoId(producto.id);
    try {
      const actualizado = await updateMerchandising(producto.id, { destacado: !producto.destacado });
      setProductos((actuales) => actuales.map((p) => (p.id === actualizado.id ? actualizado : p)));
      refrescarResumen();
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el destacado del producto.");
    } finally {
      setActualizandoDestacadoId(null);
    }
  }

  return (
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Productos</h1>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {/* La skill de alta desde MercadoLibre carga productos por API
              mientras esta pantalla está abierta; hasta ahora la única forma de
              verlos era F5, que además perdía la página y el filtro.
              `cargarProductos` respeta ambos, y `refrescarResumen` mantiene los
              contadores de arriba en línea con la tabla de abajo. */}
          <BotonActualizar
            onActualizar={() => {
              refrescarResumen();
              cargarProductos();
            }}
            actualizando={cargando}
          />
          <Link
            to="/catalogo/admin/productos/importar"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Importar
          </Link>
          <Link
            to="/catalogo/admin/productos/actualizar-masivo"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">sync_alt</span>
            Actualizar por Excel
          </Link>
          <Link
            to="/catalogo/admin/productos/precios"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">sell</span>
            Costos y precios
          </Link>
          <Link
            to="/catalogo/admin/productos/salud"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
            Salud
          </Link>
          <Link
            to="/catalogo/admin/productos/nuevo"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Agregar producto
          </Link>
        </div>
      </div>

      {/* Contadores del catálogo entero, no de esta página ni de esta búsqueda:
          la pregunta que contestan es "cuánto catálogo tengo cargado". Van
          ARRIBA del buscador para que quede claro que no los filtra. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <TarjetaMetrica
          testId="resumen-total"
          icono="inventory_2"
          etiqueta="Productos totales"
          valor={valorResumen(resumen?.total)}
          detalle={detalleTotales(resumen)}
        />
        <TarjetaMetrica
          testId="resumen-visibles"
          icono="storefront"
          etiqueta="En el catálogo"
          valor={valorResumen(resumen?.visibles)}
          detalle={detalleVisibles(resumen)}
        />
        <TarjetaMetrica
          testId="resumen-destacados"
          icono="star"
          etiqueta="Destacados"
          valor={valorResumen(resumen?.destacados)}
          detalle={detalleDestacados(resumen)}
        />
      </div>

      {/* Un solo campo para nombre, SKU y categoría: el admin no tiene por qué
          declarar en qué campo está tipeando — busca con lo que se acuerde del
          producto. El backend une los tres con OR. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label htmlFor="buscar-productos" className="sr-only">
          Buscar productos por nombre, SKU o categoría
        </label>
        <div className="relative w-full max-w-md">
          <span
            className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            aria-hidden="true"
          >
            search
          </span>
          <input
            id="buscar-productos"
            type="search"
            value={busquedaInput}
            onChange={(e) => setBusquedaInput(e.target.value)}
            placeholder="Buscar por nombre, SKU o categoría…"
            className="w-full rounded-lg border border-outline-variant bg-surface py-3 pl-11 pr-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
          />
        </div>

        {/* El orden lo resuelve el backend sobre el catálogo entero, no un
            `sort()` sobre las 50 filas de esta página — ver `ORDENES`. Sin
            debounce a propósito: un `<select>` emite una sola vez por
            selección, mismo criterio que el selector de categoría de
            `/coleccion`. */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <label
            htmlFor="orden-productos"
            className="font-label-sm text-label-sm shrink-0 uppercase tracking-widest text-on-surface-variant"
          >
            Ordenar por
          </label>
          <select
            id="orden-productos"
            value={orden}
            onChange={(e) => cambiarOrden(e.target.value)}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-3 font-body-md text-body-md text-on-surface focus:border-primary focus:outline-none"
          >
            {ORDENES.map((opcion) => (
              <option key={opcion.valor || "default"} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando productos…</p>
        </div>
      ) : productos.length === 0 ? (
        // "Todavía no hay productos" sería falso con una búsqueda activa: los
        // productos están, la búsqueda no los alcanza. Decir lo contrario
        // manda al admin a cargar algo que ya tiene cargado.
        busqueda ? (
          <EstadoVacio
            icono="search_off"
            titulo="Sin resultados"
            mensaje={`Ningún producto coincide con "${busqueda}". Probá con otro nombre, SKU o categoría.`}
          />
        ) : (
          <EstadoVacio
            icono="inventory_2"
            titulo="Todavía no hay productos"
            mensaje="Agregá el primer producto para verlo acá y en el catálogo público."
          />
        )
      ) : (
        <div className="rounded-xl bg-surface-container-lowest shadow-ambient">
          {haySeleccion ? (
            <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant px-3 py-3">
              <span className="font-label-md text-on-surface">
                {idsSeleccionados.length === 1
                  ? "1 producto seleccionado"
                  : `${idsSeleccionados.length} productos seleccionados`}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleVisibilidadMasiva(false)}
                  disabled={accionMasivaEnCurso}
                  className="rounded-lg border border-outline px-3 py-1.5 font-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                >
                  Ocultar seleccionados
                </button>
                <button
                  type="button"
                  onClick={() => handleVisibilidadMasiva(true)}
                  disabled={accionMasivaEnCurso}
                  className="rounded-lg border border-outline px-3 py-1.5 font-label-md text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
                >
                  Mostrar seleccionados
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoBorradoMasivo(true)}
                  disabled={accionMasivaEnCurso}
                  className="rounded-lg bg-error px-3 py-1.5 font-label-md text-on-error transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Eliminar seleccionados
                </button>
              </div>
            </div>
          ) : null}

          {resultadoMasivo ? (
            <div
              role="status"
              className="border-b border-outline-variant px-3 py-3 font-body-md text-on-surface"
            >
              <p>
                {resultadoMasivo.eliminados.length === 0
                  ? "No se eliminó ningún producto."
                  : resultadoMasivo.eliminados.length === 1
                    ? "Se eliminó 1 producto."
                    : `Se eliminaron ${resultadoMasivo.eliminados.length} productos.`}
              </p>
              {resultadoMasivo.rechazados.length > 0 ? (
                <>
                  <p className="mt-1 text-on-surface-variant">Estos no se pudieron eliminar:</p>
                  <ul className="mt-1 list-disc pl-5 text-on-surface-variant">
                    {resultadoMasivo.rechazados.map((rechazado) => (
                      <li key={rechazado.id}>
                        <strong className="text-on-surface">
                          {rechazado.nombre ?? `Producto #${rechazado.id}`}
                        </strong>
                        {" — "}
                        {rechazado.motivo}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table
              role="table"
              className={`${claseTablaApilada} w-full min-w-[820px] text-left text-[13px] xl:text-sm`}
            >
              <thead role="rowgroup">
                <tr role="row" className="border-b border-outline-variant">
                  <th role="columnheader" className="px-2 py-2 xl:px-3 xl:py-3">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los productos de esta página"
                      checked={todosSeleccionados}
                      // `indeterminate` no existe como atributo HTML, solo como
                      // propiedad del nodo: se setea por ref o no se ve nunca.
                      ref={(nodo) => {
                        if (nodo) {
                          nodo.indeterminate = haySeleccion && !todosSeleccionados;
                        }
                      }}
                      onChange={alternarTodos}
                      className="size-4 accent-primary"
                    />
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Foto
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Nombre
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    SKU
                  </th>
                  <th role="columnheader" data-celda="secundaria" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Etiqueta
                  </th>
                  <th role="columnheader" data-celda="secundaria" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Categoría
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Precio
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Stock
                  </th>
                  <th role="columnheader" data-celda="secundaria" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Fotos
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Catálogo
                  </th>
                  <th role="columnheader" className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                    Destacado
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {productos.map((producto) => (
                  <tr
                    key={producto.id}
                    role="row"
                    className={`border-b border-outline-variant last:border-b-0 ${
                      producto.stock === 0 ? "bg-error-container/40" : ""
                    }`}
                  >
                    <td role="cell" data-celda="control" className="px-2 py-2 xl:px-3 xl:py-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${producto.nombre}`}
                        checked={seleccionados.has(producto.id)}
                        onChange={() => alternarSeleccion(producto.id)}
                        className="size-4 accent-primary"
                      />
                    </td>
                    {/* Foto y nombre son la puerta a la ficha: la columna
                        "Acciones" con su ícono de lápiz se eliminó. Son dos links
                        al mismo destino y por eso llevan nombres accesibles
                        distintos — dos enlaces con el mismo texto en la misma
                        fila se leen como dos destinos y obligan a probar cuál es
                        cuál. El de la foto declara la acción ("Editar X") porque
                        una imagen no tiene texto propio; el del nombre ya ES el
                        nombre del producto. */}
                    <td role="cell" data-celda="control" className="px-2 py-2 xl:px-3 xl:py-3">
                      <Link
                        to={`/catalogo/admin/productos/${producto.id}/editar`}
                        aria-label={`Editar ${producto.nombre}`}
                        className="block w-fit rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {producto.fotos?.[0]?.url ? (
                          <img
                            src={producto.fotos[0].url}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover xl:h-12 xl:w-12"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant xl:h-12 xl:w-12">
                            <span className="material-symbols-outlined text-[16px] xl:text-[20px]">image</span>
                          </div>
                        )}
                      </Link>
                    </td>
                    <td role="cell" data-celda="identidad" className="max-w-[160px] px-2 py-2 xl:max-w-[220px] xl:px-3 xl:py-3">
                      <Link
                        to={`/catalogo/admin/productos/${producto.id}/editar`}
                        title={producto.nombre}
                        className="block md:truncate font-body-md text-on-surface hover:text-primary hover:underline"
                      >
                        {producto.nombre}
                      </Link>
                    </td>
                    <td role="cell" data-label="SKU" className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3">
                      {producto.sku}
                    </td>
                    <td role="cell" data-celda="secundaria" className="px-2 py-2 xl:px-3 xl:py-3">
                      <Badge etiqueta={producto.etiqueta} />
                    </td>
                    <td role="cell" data-celda="secundaria" className="max-w-[120px] truncate px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3" title={producto.categoria?.nombre ?? undefined}>
                      {producto.categoria?.nombre ?? "—"}
                    </td>
                    <td role="cell" data-label="Precio" className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface xl:px-3 xl:py-3">
                      {formatPrecio(producto.precio)}
                    </td>
                    <td role="cell" data-label="Stock" className="px-2 py-2 xl:px-3 xl:py-3">
                      {producto.stock === 0 ? (
                        <span className="inline-block whitespace-nowrap rounded bg-error-container px-1.5 py-0.5 font-label-sm text-[11px] uppercase tracking-wide text-on-error-container xl:px-2 xl:py-1 xl:text-label-sm">
                          Sin stock
                        </span>
                      ) : (
                        <span
                          className={`font-body-md ${
                            producto.stock <= 3 ? "font-semibold text-secondary" : "text-on-surface-variant"
                          }`}
                        >
                          {producto.stock}
                        </span>
                      )}
                    </td>
                    <td role="cell" data-celda="secundaria" className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3">
                      {/* `cantidadFotos` y no `fotos.length`: el listado
                          liviano trae solo la portada, así que contar el array
                          mostraría "1/10" para cualquier producto con fotos. */}
                      {producto.cantidadFotos ?? 0}/10
                    </td>
                    <td role="cell" data-label="Catálogo" className="px-2 py-2 xl:px-3 xl:py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={producto.visibleEnCatalogo}
                          aria-label={`Mostrar ${producto.nombre} en el catálogo`}
                          onClick={() => handleToggleVisibilidad(producto)}
                          disabled={actualizandoVisibilidadId === producto.id}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 xl:h-6 xl:w-11 ${
                            producto.visibleEnCatalogo ? "bg-secondary" : "bg-outline-variant"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-container-lowest shadow transition-transform xl:h-4 xl:w-4 ${
                              producto.visibleEnCatalogo ? "translate-x-5 xl:translate-x-6" : "translate-x-0.5 xl:translate-x-1"
                            }`}
                          />
                        </button>
                        {actualizandoVisibilidadId === producto.id ? (
                          <Spinner className="h-3.5 w-3.5 text-on-surface-variant" />
                        ) : null}
                      </div>
                    </td>
                    <td role="cell" data-label="Destacado" className="px-2 py-2 xl:px-3 xl:py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={producto.destacado}
                          aria-label={`Destacar ${producto.nombre}`}
                          onClick={() => handleToggleDestacado(producto)}
                          disabled={actualizandoDestacadoId === producto.id}
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 xl:h-6 xl:w-11 ${
                            producto.destacado ? "bg-secondary" : "bg-outline-variant"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface-container-lowest shadow transition-transform xl:h-4 xl:w-4 ${
                              producto.destacado ? "translate-x-5 xl:translate-x-6" : "translate-x-0.5 xl:translate-x-1"
                            }`}
                          />
                        </button>
                        {actualizandoDestacadoId === producto.id ? (
                          <Spinner className="h-3.5 w-3.5 text-on-surface-variant" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!cargando && productos.length > 0 ? (
        <Paginador
          pagina={pagina}
          totalPaginas={totalPaginas}
          onCambiar={irAPagina}
          etiqueta="Paginación de productos"
        />
      ) : null}

      {confirmandoBorradoMasivo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-margin-mobile">
          <div
            ref={dialogoMasivoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-masivo"
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
          >
            <h2
              id="titulo-eliminar-masivo"
              className="font-headline-md text-headline-md mb-2 text-on-background"
            >
              Eliminar productos
            </h2>
            <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
              ¿Seguro que querés eliminar{" "}
              <strong className="text-on-surface">
                {idsSeleccionados.length === 1
                  ? "1 producto"
                  : `${idsSeleccionados.length} productos`}
              </strong>
              ? Esta acción no se puede deshacer. Si alguno tiene ventas, las órdenes conservan su
              detalle pero dejan de estar ligadas al producto.
            </p>
            {error ? (
              <p className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoBorradoMasivo(false)}
                disabled={accionMasivaEnCurso}
                className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarMasivo}
                disabled={accionMasivaEnCurso}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-error px-5 py-3 uppercase tracking-widest text-on-error disabled:opacity-60"
              >
                {accionMasivaEnCurso ? <Spinner className="h-4 w-4 text-on-error" decorativo /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default AdminProductos;
