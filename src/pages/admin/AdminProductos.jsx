import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import Paginador from "../../components/Paginador.jsx";
import {
  deleteProduct,
  deleteProductsMasivo,
  getProducts,
  updateMerchandising,
  updateVisibilidad,
  updateVisibilidadMasiva,
} from "../../api/products.js";
import { formatPrecio } from "../../utils/formato.js";
import useDialogo from "../../hooks/useDialogo.js";

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
  const [cargando, setCargando] = useState(true);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState(null);
  const [actualizandoVisibilidadId, setActualizandoVisibilidadId] = useState(null);
  const [actualizandoDestacadoId, setActualizandoDestacadoId] = useState(null);
  const [ordenEditando, setOrdenEditando] = useState({});

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
  }, [pagina, busqueda]);

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

  // El borrado es destructivo e irreversible: el diálogo tiene que atrapar el
  // foco y cerrarse con Escape como cualquier modal, y no dejarse cerrar por
  // teclado mientras el borrado ya salió al backend.
  const eliminandoEnCurso =
    productoAEliminar !== null && eliminandoId === productoAEliminar.id;
  const dialogoRef = useDialogo({
    abierto: productoAEliminar !== null,
    onCerrar: () => {
      if (eliminandoEnCurso) return;
      setProductoAEliminar(null);
    },
  });

  // Mismo tratamiento de diálogo que el borrado individual: trampa de foco,
  // Escape, y sin dejarse cerrar mientras el borrado ya salió al backend.
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
      aplicarPagina(await getProducts({ admin: true, page: pagina, search: busqueda, pageSize: PRODUCTOS_POR_PAGINA }));
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

    getProducts({ admin: true, page: pagina, search: busqueda, pageSize: PRODUCTOS_POR_PAGINA })
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
  }, [pagina, busqueda]);

  // Borrar el último producto de la última página la deja sin filas. En vez de
  // mostrar la tabla vacía como si no hubiera productos, se retrocede una
  // página (el efecto de arriba vuelve a cargar).
  useEffect(() => {
    if (cargando) return;
    // `reemplazar`: la página que quedó vacía no debe volver por "atrás".
    if (pagina > totalPaginas) irAPagina(totalPaginas, { reemplazar: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, pagina, totalPaginas]);

  async function handleEliminar(id) {
    setError(null);
    setEliminandoId(id);
    try {
      await deleteProduct(id);
      setProductoAEliminar(null);
      await cargarProductos();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar el producto.");
    } finally {
      setEliminandoId(null);
    }
  }

  async function handleVisibilidadMasiva(visible) {
    setError(null);
    setResultadoMasivo(null);
    setAccionMasivaEnCurso(true);
    try {
      await updateVisibilidadMasiva(idsSeleccionados, visible);
      setSeleccionados(new Set());
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
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el destacado del producto.");
    } finally {
      setActualizandoDestacadoId(null);
    }
  }

  /** Local, per-row draft while the admin types a new `orden` — committed on blur via `handleGuardarOrden`. */
  function handleCambiarOrdenLocal(producto, valor) {
    setOrdenEditando((actuales) => ({ ...actuales, [producto.id]: valor }));
  }

  /**
   * Clears the local draft for a product's `orden` ONLY if it still matches
   * the value that triggered this particular save (`valorEnvio`, captured in
   * the calling closure). Guards against a race: blur fires an async PATCH,
   * the admin refocuses and types a new value before that PATCH resolves,
   * and the late `finally` would otherwise wipe the newer, still-unsaved
   * draft out from under them — silently reverting the input to the old
   * `producto.orden` with no error or "unsaved" indicator.
   */
  function limpiarDraftOrdenSiVigente(productoId, valorEnvio) {
    setOrdenEditando((actuales) => {
      if (actuales[productoId] !== valorEnvio) return actuales;
      const { [productoId]: _omitido, ...resto } = actuales;
      return resto;
    });
  }

  async function handleGuardarOrden(producto) {
    const valor = ordenEditando[producto.id];
    if (valor === undefined) return;

    const ordenNum = Number(valor);
    if (valor === "" || !Number.isInteger(ordenNum)) {
      limpiarDraftOrdenSiVigente(producto.id, valor);
      return;
    }
    if (ordenNum === producto.orden) {
      limpiarDraftOrdenSiVigente(producto.id, valor);
      return;
    }

    setError(null);
    try {
      const actualizado = await updateMerchandising(producto.id, { orden: ordenNum });
      setProductos((actuales) => actuales.map((p) => (p.id === actualizado.id ? actualizado : p)));
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el orden del producto.");
    } finally {
      limpiarDraftOrdenSiVigente(producto.id, valor);
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
          <Link
            to="/catalogo/admin/productos/importar"
            className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Importar
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

      {/* Un solo campo para nombre, SKU y categoría: el admin no tiene por qué
          declarar en qué campo está tipeando — busca con lo que se acuerde del
          producto. El backend une los tres con OR. */}
      <div className="mb-6">
        <label htmlFor="buscar-productos" className="sr-only">
          Buscar productos por nombre, SKU o categoría
        </label>
        <div className="relative max-w-md">
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

          <table className="w-full min-w-[820px] text-left text-[13px] xl:text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="px-2 py-2 xl:px-3 xl:py-3">
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
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Foto
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Nombre
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  SKU
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Etiqueta
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Categoría
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Precio
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Stock
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Fotos
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Catálogo
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Destacado
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Orden
                </th>
                <th className="px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr
                  key={producto.id}
                  className={`border-b border-outline-variant last:border-b-0 ${
                    producto.stock === 0 ? "bg-error-container/40" : ""
                  }`}
                >
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${producto.nombre}`}
                      checked={seleccionados.has(producto.id)}
                      onChange={() => alternarSeleccion(producto.id)}
                      className="size-4 accent-primary"
                    />
                  </td>
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
                    {producto.fotos?.[0]?.url ? (
                      <img
                        src={producto.fotos[0].url}
                        alt={producto.nombre}
                        className="h-9 w-9 rounded-lg object-cover xl:h-12 xl:w-12"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant xl:h-12 xl:w-12">
                        <span className="material-symbols-outlined text-[16px] xl:text-[20px]">image</span>
                      </div>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-2 py-2 font-body-md text-on-surface xl:max-w-[220px] xl:px-3 xl:py-3" title={producto.nombre}>
                    {producto.nombre}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3">
                    {producto.sku}
                  </td>
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
                    <Badge etiqueta={producto.etiqueta} />
                  </td>
                  <td className="max-w-[120px] truncate px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3" title={producto.categoria?.nombre ?? undefined}>
                    {producto.categoria?.nombre ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface xl:px-3 xl:py-3">
                    {formatPrecio(producto.precio)}
                  </td>
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
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
                  <td className="whitespace-nowrap px-2 py-2 font-body-md text-on-surface-variant xl:px-3 xl:py-3">
                    {/* `cantidadFotos` y no `fotos.length`: el listado
                        liviano trae solo la portada, así que contar el array
                        mostraría "1/10" para cualquier producto con fotos. */}
                    {producto.cantidadFotos ?? 0}/10
                  </td>
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
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
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
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
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
                    <input
                      type="number"
                      aria-label={`Orden de ${producto.nombre}`}
                      value={ordenEditando[producto.id] ?? producto.orden}
                      onChange={(e) => handleCambiarOrdenLocal(producto, e.target.value)}
                      onBlur={() => handleGuardarOrden(producto)}
                      className="w-14 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body-md text-on-surface focus:border-primary focus:outline-none xl:w-20 xl:px-3 xl:py-2"
                    />
                  </td>
                  <td className="px-2 py-2 xl:px-3 xl:py-3">
                    <div className="flex items-center gap-2 xl:gap-4">
                      <Link
                        to={`/catalogo/admin/productos/${producto.id}/editar`}
                        aria-label={`Editar ${producto.nombre}`}
                        title="Editar"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-secondary hover:bg-surface-container-high xl:h-9 xl:w-9"
                      >
                        <span className="material-symbols-outlined text-[16px] xl:text-[20px]">edit</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setProductoAEliminar(producto)}
                        aria-label={`Eliminar ${producto.nombre}`}
                        title="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-full text-error hover:bg-error-container xl:h-9 xl:w-9"
                      >
                        <span className="material-symbols-outlined text-[16px] xl:text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {productoAEliminar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-margin-mobile">
          <div
            ref={dialogoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-producto"
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
          >
            <h2
              id="titulo-eliminar-producto"
              className="font-headline-md text-headline-md mb-2 text-on-background"
            >
              Eliminar producto
            </h2>
            <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
              ¿Seguro que querés eliminar <strong className="text-on-surface">{productoAEliminar.nombre}</strong>?
              Esta acción no se puede deshacer.
            </p>
            {error ? (
              <p className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductoAEliminar(null)}
                disabled={eliminandoId === productoAEliminar.id}
                className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleEliminar(productoAEliminar.id)}
                disabled={eliminandoId === productoAEliminar.id}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-error px-5 py-3 uppercase tracking-widest text-on-error disabled:opacity-60"
              >
                {eliminandoId === productoAEliminar.id ? <Spinner className="h-4 w-4 text-on-error" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
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
                {accionMasivaEnCurso ? <Spinner className="h-4 w-4 text-on-error" /> : null}
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
