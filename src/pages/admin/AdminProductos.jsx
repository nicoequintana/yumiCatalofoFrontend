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
    const data = await getProducts({ admin: true });
    setProductos(data);
    setCargando(false);
  }

  useEffect(() => {
    let activo = true;

    getProducts({ admin: true }).then((data) => {
      if (!activo) return;
      setProductos(data);
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

  async function handleGuardarOrden(producto) {
    const valor = ordenEditando[producto.id];
    if (valor === undefined) return;

    const ordenNum = Number(valor);
    if (valor === "" || !Number.isInteger(ordenNum)) {
      setOrdenEditando((actuales) => {
        const { [producto.id]: _omitido, ...resto } = actuales;
        return resto;
      });
      return;
    }
    if (ordenNum === producto.orden) {
      setOrdenEditando((actuales) => {
        const { [producto.id]: _omitido, ...resto } = actuales;
        return resto;
      });
      return;
    }

    setError(null);
    try {
      const actualizado = await updateMerchandising(producto.id, { orden: ordenNum });
      setProductos((actuales) => actuales.map((p) => (p.id === actualizado.id ? actualizado : p)));
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el orden del producto.");
    } finally {
      setOrdenEditando((actuales) => {
        const { [producto.id]: _omitido, ...resto } = actuales;
        return resto;
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-16">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary">Productos</h1>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
        <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
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
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Foto
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  SKU
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Etiqueta
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Categoría
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Precio
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Fotos
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Catálogo
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Destacado
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Orden
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="px-6 py-4">
                    {producto.fotos?.[0]?.url ? (
                      <img
                        src={producto.fotos[0].url}
                        alt={producto.nombre}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </div>
                    )}
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">{producto.nombre}</td>
                  <td className="font-body-md text-body-md whitespace-nowrap px-6 py-4 text-on-surface-variant">
                    {producto.sku}
                  </td>
                  <td className="px-6 py-4">
                    <Badge etiqueta={producto.etiqueta} />
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {producto.categoria?.nombre ?? "—"}
                  </td>
                  <td className="font-body-md text-body-md whitespace-nowrap px-6 py-4 text-on-surface">
                    {formatPrecio(producto.precio)}
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {producto.fotos?.length ?? 0}/10
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={producto.visibleEnCatalogo}
                        aria-label={`Mostrar ${producto.nombre} en el catálogo`}
                        onClick={() => handleToggleVisibilidad(producto)}
                        disabled={actualizandoVisibilidadId === producto.id}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                          producto.visibleEnCatalogo ? "bg-secondary" : "bg-outline-variant"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-surface-container-lowest shadow transition-transform ${
                            producto.visibleEnCatalogo ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      {actualizandoVisibilidadId === producto.id ? (
                        <Spinner className="h-3.5 w-3.5 text-on-surface-variant" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={producto.destacado}
                        aria-label={`Destacar ${producto.nombre}`}
                        onClick={() => handleToggleDestacado(producto)}
                        disabled={actualizandoDestacadoId === producto.id}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                          producto.destacado ? "bg-secondary" : "bg-outline-variant"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-surface-container-lowest shadow transition-transform ${
                            producto.destacado ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      {actualizandoDestacadoId === producto.id ? (
                        <Spinner className="h-3.5 w-3.5 text-on-surface-variant" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      aria-label={`Orden de ${producto.nombre}`}
                      value={ordenEditando[producto.id] ?? producto.orden}
                      onChange={(e) => handleCambiarOrdenLocal(producto, e.target.value)}
                      onBlur={() => handleGuardarOrden(producto)}
                      className="font-body-md text-body-md w-20 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/catalogo/admin/productos/${producto.id}/editar`}
                        aria-label={`Editar ${producto.nombre}`}
                        title="Editar"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-secondary hover:bg-surface-container-high"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => setProductoAEliminar(producto)}
                        aria-label={`Eliminar ${producto.nombre}`}
                        title="Eliminar"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-error hover:bg-error-container"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
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
