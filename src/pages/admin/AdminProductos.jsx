import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { deleteProduct, getProducts, updateMerchandising, updateVisibilidad } from "../../api/products.js";
import { formatPrecio } from "../../utils/formato.js";

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
 */
function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [error, setError] = useState(null);
  const [actualizandoVisibilidadId, setActualizandoVisibilidadId] = useState(null);
  const [actualizandoDestacadoId, setActualizandoDestacadoId] = useState(null);
  const [ordenEditando, setOrdenEditando] = useState({});

  async function cargarProductos() {
    setCargando(true);
    try {
      const data = await getProducts({ admin: true });
      setProductos(data);
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

    getProducts({ admin: true })
      .then((data) => {
        if (!activo) return;
        setProductos(data);
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
  }, []);

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
        <EstadoVacio
          icono="inventory_2"
          titulo="Todavía no hay productos"
          mensaje="Agregá el primer producto para verlo acá y en el catálogo público."
        />
      ) : (
        <div className="rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[820px] text-left text-[13px] xl:text-sm">
            <thead>
              <tr className="border-b border-outline-variant">
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
                    {producto.fotos?.length ?? 0}/10
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

      {productoAEliminar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-margin-mobile">
          <div className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
            <h2 className="font-headline-md text-headline-md mb-2 text-on-background">Eliminar producto</h2>
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
    </main>
  );
}

export default AdminProductos;
