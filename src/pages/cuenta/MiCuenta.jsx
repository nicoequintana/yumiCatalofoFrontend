import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CampoPassword from "../../components/CampoPassword.jsx";
import usePerfilCliente, { invalidarPerfil, refrescarPerfil } from "../../hooks/usePerfilCliente.js";
import { cambiarPassword, salirCuenta } from "../../api/cuenta.js";

function MiCuenta() {
  const { perfil } = usePerfilCliente();
  const navigate = useNavigate();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [errorPassword, setErrorPassword] = useState(null);
  const [cargandoPassword, setCargandoPassword] = useState(false);
  const [passwordActualizada, setPasswordActualizada] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  async function handleSubmitPassword(e) {
    e.preventDefault();
    setErrorPassword(null);
    setPasswordActualizada(false);
    setCargandoPassword(true);
    try {
      await cambiarPassword({ actual, nueva });
      setPasswordActualizada(true);
      setActual("");
      setNueva("");
      // La pantalla sigue montada (no hay navegación tras esta escritura), así
      // que se usa `refrescarPerfil()` y NO `invalidarPerfil()`: invalidar
      // limpia el cache y espera un montaje futuro que acá no va a llegar, y
      // `RequireAuthCliente` quedaría con `resuelto:false` para siempre.
      refrescarPerfil();
    } catch (err) {
      // 409: la contraseña cambió por otro lado entre que se abrió el form y
      // se envió. Es un estado real, no un edge case: se muestra el mensaje
      // del backend igual que cualquier otro error de este endpoint.
      setErrorPassword(err.message);
    } finally {
      setCargandoPassword(false);
    }
  }

  async function handleCerrarSesion() {
    await salirCuenta();
    // Acá sí corresponde `invalidarPerfil()`: el logout deja la zona
    // guardada, así que el próximo montaje de `RequireAuthCliente` (en la
    // página a la que se navega) es el que dispara el refetch.
    invalidarPerfil();
    navigate("/");
  }

  if (!perfil) return null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-8 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Mi cuenta</h1>

      <div className="flex flex-col gap-2">
        <p className="text-body-md text-on-surface">
          <span className="text-on-surface-variant">Email: </span>
          {perfil.email}
        </p>
        {perfil.nombre ? (
          <p className="text-body-md text-on-surface">
            <span className="text-on-surface-variant">Nombre: </span>
            {perfil.nombre}
          </p>
        ) : null}
        {perfil.telefono ? (
          <p className="text-body-md text-on-surface">
            <span className="text-on-surface-variant">Teléfono: </span>
            {perfil.telefono}
          </p>
        ) : null}
        <Link to="/cuenta/email" className="text-body-md text-primary underline">
          Cambiar email
        </Link>
        <Link to="/cuenta/pedidos" className="text-body-md text-primary underline">
          Mis pedidos
        </Link>
      </div>

      {perfil.tienePassword ? (
        <form onSubmit={handleSubmitPassword} className="flex flex-col gap-4">
          <h2 className="text-label-lg text-on-surface">Cambiar contraseña</h2>
          <CampoPassword
            value={actual}
            onChange={setActual}
            etiqueta="Contraseña actual"
            etiquetaVisible
            etiquetaClassName="text-label-md text-on-surface-variant mb-1 block"
            autoComplete="current-password"
            required
            className="rounded border border-outline-variant bg-surface-container-lowest py-2 pl-3 text-body-md text-on-surface"
          />
          <CampoPassword
            value={nueva}
            onChange={setNueva}
            etiqueta="Contraseña nueva"
            etiquetaVisible
            etiquetaClassName="text-label-md text-on-surface-variant mb-1 block"
            autoComplete="new-password"
            required
            className="rounded border border-outline-variant bg-surface-container-lowest py-2 pl-3 text-body-md text-on-surface"
          />
          {errorPassword ? (
            <p role="alert" className="text-body-md text-error">
              {errorPassword}
            </p>
          ) : null}
          {passwordActualizada ? (
            <p className="text-body-md text-on-surface">Contraseña actualizada.</p>
          ) : null}
          <button
            type="submit"
            disabled={cargandoPassword}
            className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
          >
            {cargandoPassword ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      ) : null}

      <div className="flex flex-col gap-2">
        {confirmandoSalida ? (
          <>
            <p className="text-body-md text-on-surface-variant">
              Vas a cerrar sesión en todos tus dispositivos.
            </p>
            <button
              type="button"
              onClick={handleCerrarSesion}
              className="min-h-11 rounded bg-error px-4 py-2 text-label-md text-on-error"
            >
              Confirmar cierre de sesión
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoSalida(false)}
              className="min-h-11 text-label-md text-on-surface-variant"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoSalida(true)}
            className="min-h-11 rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export default MiCuenta;
