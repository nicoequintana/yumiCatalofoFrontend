import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { createCategoria, deleteCategoria, getCategorias, updateCategoria } from "../../api/categorias.js";

/**
 * `/catalogo/admin/categorias` — manage the category list (design item 2 of
 * the 6-feature batch). Categories are assigned to products via a dropdown
 * in AdminProductoForm.jsx — this screen only manages the list itself.
 */
function AdminCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [nombreEditado, setNombreEditado] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function cargarCategorias() {
    const data = await getCategorias();
    setCategorias(data);
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getCategorias().then((data) => {
      if (!activo) return;
      setCategorias(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, []);

  async function handleCrear(event) {
    event.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return;

    setError(null);
    setCreando(true);
    try {
      await createCategoria(nombre);
      setNombreNuevo("");
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo crear la categoría.");
    } finally {
      setCreando(false);
    }
  }

  function iniciarEdicion(categoria) {
    setConfirmandoId(null);
    setEditandoId(categoria.id);
    setNombreEditado(categoria.nombre);
  }

  async function handleGuardarEdicion(id) {
    const nombre = nombreEditado.trim();
    if (!nombre) return;

    setError(null);
    setGuardandoEdicion(true);
    try {
      await updateCategoria(id, nombre);
      setEditandoId(null);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo renombrar la categoría.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handleEliminar(id) {
    setError(null);
    setEliminandoId(id);
    try {
      await deleteCategoria(id);
      setConfirmandoId(null);
      await cargarCategorias();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar la categoría.");
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-container-max px-margin-mobile py-8 md:px-margin-desktop md:py-16">
      <div className="mb-6">
        <BotonVolver />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Categorías</h1>
      </div>

      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Nombre de la nueva categoría"
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {creando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
          Agregar
        </button>
      </form>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando categorías…</p>
        </div>
      ) : categorias.length === 0 ? (
        <EstadoVacio
          icono="sell"
          titulo="Todavía no hay categorías"
          mensaje="Agregá la primera categoría para poder asignarla a los productos."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Nombre
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Productos
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => (
                <tr key={categoria.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">
                    {editandoId === categoria.id ? (
                      <input
                        type="text"
                        value={nombreEditado}
                        onChange={(e) => setNombreEditado(e.target.value)}
                        className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                      />
                    ) : (
                      categoria.nombre
                    )}
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {categoria.cantidadProductos}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {editandoId === categoria.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(categoria.id)}
                            disabled={guardandoEdicion || eliminandoId === categoria.id}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-secondary hover:underline disabled:opacity-60"
                          >
                            {guardandoEdicion ? <Spinner className="h-3.5 w-3.5" /> : null}
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoId(null)}
                            className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant hover:underline"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(categoria)}
                          className="flex items-center gap-1 font-label-md text-label-md uppercase tracking-widest text-secondary hover:underline"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          Editar
                        </button>
                      )}

                      {confirmandoId === categoria.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">¿Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(categoria.id)}
                            disabled={eliminandoId === categoria.id || guardandoEdicion}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-error hover:underline disabled:opacity-60"
                          >
                            {eliminandoId === categoria.id ? <Spinner className="h-3.5 w-3.5" /> : null}
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
                          onClick={() => {
                            setEditandoId(null);
                            setConfirmandoId(categoria.id);
                          }}
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

export default AdminCategorias;
