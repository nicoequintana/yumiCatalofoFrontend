import { useEffect, useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import { createUsuario, deleteUsuario, getUsuarios, updateUsuario } from "../../api/usuarios.js";

/**
 * `/catalogo/admin/usuarios` — manage admin users (Task 12). Mirrors the
 * table + inline-edit + confirm-delete pattern from AdminCategorias.jsx,
 * adapted for email/password instead of a single name field.
 */
function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [emailNuevo, setEmailNuevo] = useState("");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [emailEditado, setEmailEditado] = useState("");
  const [passwordEditado, setPasswordEditado] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [confirmandoId, setConfirmandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function cargarUsuarios() {
    const data = await getUsuarios();
    setUsuarios(data);
  }

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getUsuarios().then((data) => {
      if (!activo) return;
      setUsuarios(data);
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, []);

  async function handleCrear(event) {
    event.preventDefault();
    const email = emailNuevo.trim();
    const password = passwordNuevo;
    if (!email || !password) return;

    setError(null);
    setCreando(true);
    try {
      await createUsuario(email, password);
      setEmailNuevo("");
      setPasswordNuevo("");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message ?? "No se pudo crear el usuario.");
    } finally {
      setCreando(false);
    }
  }

  function iniciarEdicion(usuario) {
    setConfirmandoId(null);
    setEditandoId(usuario.id);
    setEmailEditado(usuario.email);
    setPasswordEditado("");
  }

  async function handleGuardarEdicion(id) {
    const email = emailEditado.trim();
    if (!email) return;

    setError(null);
    setGuardandoEdicion(true);
    try {
      const datos = { email };
      if (passwordEditado.trim()) {
        datos.password = passwordEditado;
      }
      await updateUsuario(id, datos);
      setEditandoId(null);
      setPasswordEditado("");
      await cargarUsuarios();
    } catch (err) {
      setError(err.message ?? "No se pudo actualizar el usuario.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function handleEliminar(id) {
    setError(null);
    setEliminandoId(id);
    try {
      await deleteUsuario(id);
      setConfirmandoId(null);
      await cargarUsuarios();
    } catch (err) {
      setError(err.message ?? "No se pudo eliminar el usuario.");
    } finally {
      setEliminandoId(null);
    }
  }

  function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
        <h1 className="font-headline-lg text-headline-lg text-primary">Usuarios</h1>
      </div>

      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={emailNuevo}
          onChange={(e) => setEmailNuevo(e.target.value)}
          placeholder="Email del nuevo usuario"
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none sm:max-w-sm"
        />
        <input
          type="password"
          value={passwordNuevo}
          onChange={(e) => setPasswordNuevo(e.target.value)}
          placeholder="Contraseña"
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
          <p className="font-body-md text-body-md text-on-surface-variant">Cargando usuarios…</p>
        </div>
      ) : usuarios.length === 0 ? (
        <EstadoVacio
          icono="person"
          titulo="Todavía no hay usuarios"
          mensaje="Agregá el primer usuario para poder acceder al panel de administración."
        />
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Email
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Creado
                </th>
                <th className="font-label-sm text-label-sm px-6 py-4 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface">
                    {editandoId === usuario.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="email"
                          value={emailEditado}
                          onChange={(e) => setEmailEditado(e.target.value)}
                          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                        />
                        <input
                          type="password"
                          value={passwordEditado}
                          onChange={(e) => setPasswordEditado(e.target.value)}
                          placeholder="Dejar en blanco para no cambiar"
                          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                        />
                      </div>
                    ) : (
                      usuario.email
                    )}
                  </td>
                  <td className="font-body-md text-body-md px-6 py-4 text-on-surface-variant">
                    {formatearFecha(usuario.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {editandoId === usuario.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(usuario.id)}
                            disabled={guardandoEdicion || eliminandoId === usuario.id}
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
                          onClick={() => iniciarEdicion(usuario)}
                          className="flex items-center gap-1 font-label-md text-label-md uppercase tracking-widest text-secondary hover:underline"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          Editar
                        </button>
                      )}

                      {confirmandoId === usuario.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-body-md text-body-md text-on-surface-variant">¿Confirmar?</span>
                          <button
                            type="button"
                            onClick={() => handleEliminar(usuario.id)}
                            disabled={eliminandoId === usuario.id || guardandoEdicion}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-error hover:underline disabled:opacity-60"
                          >
                            {eliminandoId === usuario.id ? <Spinner className="h-3.5 w-3.5" /> : null}
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
                            setConfirmandoId(usuario.id);
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

export default AdminUsuarios;
