import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/Badge.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import { deleteProduct, getProducts } from "../../api/products.js";
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
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [error, setError] = useState(null);

  async function cargarProductos() {
    setCargando(true);
    const data = await getProducts();
    setProductos(data);
    setCargando(false);
  }

  useEffect(() => {
    let activo = true;

    getProducts().then((data) => {
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
    try {
      await deleteProduct(id);
      setConfirmandoId(null);
      await cargarProductos();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar el producto.");
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
            to="/catalogo/admin/nuevo"
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
        <EstadoVacio icono="hourglass_empty" mensaje="Cargando productos…" />
      ) : productos.length === 0 ? (
        <EstadoVacio
          icono="inventory_2"
          titulo="Todavía no hay productos"
          mensaje="Agregá el primer producto para verlo acá y en el catálogo público."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Etiqueta
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Precio
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Fotos
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">{producto.nombre}</td>
                  <td className="px-6 py-4">
                    <Badge etiqueta={producto.etiqueta} />
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">
                    {formatPrecio(producto.precio)}
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {producto.fotos?.length ?? 0}/4
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <Link
                        to={`/catalogo/admin/${producto.id}/editar`}
                        className="flex items-center gap-1 font-label-md text-label-md uppercase tracking-widest text-secondary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Editar
                      </Link>

                      {confirmandoId === producto.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">¿Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(producto.id)}
                            className="font-label-md text-label-md uppercase tracking-widest text-error hover:underline"
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoId(null)}
                            className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmandoId(producto.id)}
                          className="flex items-center gap-1 font-label-md text-label-md uppercase tracking-widest text-error hover:underline"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminProductos;
