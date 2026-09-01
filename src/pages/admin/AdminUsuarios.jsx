import { useEffect, useState } from "react";
import CampoPassword from "../../components/CampoPassword.jsx";
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

  // NOTA: `cargarUsuarios` se llama solo desde handlers que ya envuelven todo
  // en try/catch y muestran el error, así que no necesita su propio guard.

  useEffect(() => {
    let activo = true;
    setCargando(true);

    getUsuarios()
      .then((data) => {
        if (!activo) return;
        setUsuarios(data);
        setCargando(false);
      })
      // Sin este catch, un backend caído deja la promesa rechazada sin manejar
      // y el spinner girando para siempre, sin decir qué pasó.
      .catch(() => {
        if (!activo) return;
        setError("No se pudieron cargar los usuarios. Revisá tu conexión e intentá de nuevo.");
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
    <main className="w-full px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <BotonVolver fallback="/catalogo/admin/productos" />
      </div>

      <div className="mb-10">
        <span className="font-label-sm text-label-sm mb-2 block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-lg text-headline-lg text-primary">Usuarios</h1>
      </div>

      {/* Este NO es un formulario de ingreso, y hay que decírselo al navegador.
          Un `type="email"` seguido de un `type="password"` sin declarar nada es
          exactamente la forma de un login, así que Chrome lo rellenaba solo con
          la credencial del admin que estaba en sesión: la pantalla abría con un
          usuario ya escrito que nadie tipeó. `new-password` en la contraseña es
          lo que desarma esa lectura. */}
      <form onSubmit={handleCrear} className="mb-8 flex flex-col gap-3 sm:flex-row">
        <label htmlFor="email-nuevo-usuario" className="sr-only">
          Email del nuevo usuario
        </label>
        <input
          id="email-nuevo-usuario"
          type="email"
          value={emailNuevo}
          onChange={(e) => setEmailNuevo(e.target.value)}
          placeholder="Email del nuevo usuario"
          autoComplete="off"
          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-on-surface focus:border-primary focus:outline-none sm:max-w-sm"
        />
        <CampoPassword
          value={passwordNuevo}
          onChange={setPasswordNuevo}
          etiqueta="Contraseña del nuevo usuario"
          placeholder="Contraseña"
          autoComplete="new-password"
          contenedorClassName="w-full sm:max-w-sm"
        />
        <button
          type="submit"
          disabled={creando}
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {creando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
          Agregar
        </button>
      </form>

      {error ? (
        <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
          {error}
        </p>
      ) : null}

      {cargando ? (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-4 py-24 text-center md:px-8">
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
        <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-ambient">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Email
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Creado
                </th>
                <th className="font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-b border-outline-variant last:border-b-0">
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface">
                    {editandoId === usuario.id ? (
                      <div className="flex flex-col gap-2">
                        {/* Mismo caso que el alta: editar un usuario tampoco es
                            ingresar, así que se declara para que el navegador no
                            lo autocomplete con la sesión abierta. */}
                        <input
                          type="email"
                          value={emailEditado}
                          onChange={(e) => setEmailEditado(e.target.value)}
                          aria-label={`Email de ${usuario.email}`}
                          autoComplete="off"
                          className="font-body-md text-body-md w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:border-primary focus:outline-none"
                        />
                        <CampoPassword
                          value={passwordEditado}
                          onChange={setPasswordEditado}
                          etiqueta={`Contraseña nueva de ${usuario.email}`}
                          placeholder="Dejar en blanco para no cambiar"
                          autoComplete="new-password"
                        />
                      </div>
                    ) : (
                      usuario.email
                    )}
                  </td>
                  <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                    {formatearFecha(usuario.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {editandoId === usuario.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleGuardarEdicion(usuario.id)}
                            disabled={guardandoEdicion || eliminandoId === usuario.id}
                            className="font-label-md text-label-md inline-flex items-center gap-1 uppercase tracking-widest text-secondary hover:underline disabled:opacity-60"
                          >
                            {guardandoEdicion ? <Spinner className="h-3.5 w-3.5" decorativo /> : null}
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
                            {eliminandoId === usuario.id ? <Spinner className="h-3.5 w-3.5" decorativo /> : null}
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
