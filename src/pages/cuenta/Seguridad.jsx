import { useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import CampoPassword from "../../components/CampoPassword.jsx";
import usePerfilCliente from "../../hooks/usePerfilCliente.js";
import { cambiarPassword } from "../../api/cuenta.js";
import {
  claseBotonPrimario,
  claseCampoPassword,
  claseEtiquetaSuelta,
  clasePagina,
  claseTarjetaEscritorio,
} from "./clasesCuenta.js";

function Seguridad() {
  const { perfil } = usePerfilCliente();

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [actualizada, setActualizada] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setActualizada(false);
    setCargando(true);
    try {
      // NO se toca el cache del perfil, y es a propósito: `PUT /cuenta/password`
      // responde `{ok:true}` y no cambia NINGÚN campo del perfil. Lo que
      // escribe son `passwordHash` y `tokenVersion`, y de los dos el perfil
      // solo deriva `tienePassword`, que ya era `true` (si no, esta pantalla ni
      // muestra el formulario); `tokenVersion` no viaja en el perfil, y la
      // cookie nueva la reemite el backend en esta misma respuesta.
      //
      // Antes acá había un `refrescarPerfil()`: además de ser un viaje al
      // pedo, dejaba `resuelto:false` y la primera rama de
      // `RequireAuthCliente` devolvía el Spinner, así que esta pantalla se
      // desmontaba y el "Contraseña actualizada." de abajo no se pintaba nunca.
      await cambiarPassword({ actual, nueva });
      setActualizada(true);
      setActual("");
      setNueva("");
    } catch (err) {
      // 409: la contraseña cambió por otro lado entre que se abrió el form y
      // se envió. Es un estado real, no un edge case: se muestra el mensaje
      // del backend igual que cualquier otro error de este endpoint.
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!perfil) return null;

  return (
    <div className={clasePagina}>
      <BotonVolver fallback="/cuenta" destinoFijo etiqueta="Volver a mi cuenta" />

      {/* La tarjeta en escritorio es la misma que `Entrar` y `Datos`: las
          cuatro pantallas de cuenta comparten un solo sistema, y "Volver a mi
          cuenta" queda AFUERA de ella, igual que "Volver a la tienda". */}
      <div className={claseTarjetaEscritorio}>
        <header className="flex flex-col gap-1.5 lg:text-center">
          <h1 className="font-display-lg text-headline-lg text-on-background">Seguridad y acceso</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Contraseña y datos de ingreso a tu cuenta.
          </p>
        </header>

        {perfil.tienePassword ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <CampoPassword
              value={actual}
              onChange={setActual}
              etiqueta="Contraseña actual"
              etiquetaVisible
              etiquetaClassName={claseEtiquetaSuelta}
              autoComplete="current-password"
              required
              icono="lock"
              className={claseCampoPassword}
            />
            <CampoPassword
              value={nueva}
              onChange={setNueva}
              etiqueta="Contraseña nueva"
              etiquetaVisible
              etiquetaClassName={claseEtiquetaSuelta}
              autoComplete="new-password"
              required
              icono="lock_reset"
              className={claseCampoPassword}
            />
            {error ? (
              <p role="alert" className="font-body-md text-body-md text-error">
                {error}
              </p>
            ) : null}
            {actualizada ? (
              <p role="status" className="font-body-md text-body-md text-on-surface">
                Contraseña actualizada.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={cargando}
              className={claseBotonPrimario}
            >
              {cargando ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
            <p className="font-body-md text-body-md text-on-surface">Entrás a tu cuenta con Google.</p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              No tenés contraseña que cambiar. Si querés una, usá “¿Olvidaste tu contraseña?” en la
              pantalla de ingreso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Seguridad;
