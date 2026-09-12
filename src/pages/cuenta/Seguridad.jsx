import { useState } from "react";
import BotonVolver from "../../components/BotonVolver.jsx";
import CampoPassword from "../../components/CampoPassword.jsx";
import usePerfilCliente, { refrescarPerfil } from "../../hooks/usePerfilCliente.js";
import { cambiarPassword } from "../../api/cuenta.js";

const CLASES_CAMPO =
  "rounded-2xl border border-outline-variant bg-surface-container-lowest py-3.5 pl-11 text-body-md text-on-surface focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/40";

const CLASES_ETIQUETA = "text-label-sm uppercase tracking-wide text-on-surface-variant mb-1.5 block";

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
      await cambiarPassword({ actual, nueva });
      setActualizada(true);
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
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!perfil) return null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <BotonVolver fallback="/cuenta" destinoFijo etiqueta="Volver a mi cuenta" />

      <header className="flex flex-col gap-1.5">
        <h1 className="font-display-lg text-headline-lg text-on-background">Seguridad y acceso</h1>
        <p className="text-body-md text-on-surface-variant">
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
            etiquetaClassName={CLASES_ETIQUETA}
            autoComplete="current-password"
            required
            icono="lock"
            className={CLASES_CAMPO}
          />
          <CampoPassword
            value={nueva}
            onChange={setNueva}
            etiqueta="Contraseña nueva"
            etiquetaVisible
            etiquetaClassName={CLASES_ETIQUETA}
            autoComplete="new-password"
            required
            icono="lock_reset"
            className={CLASES_CAMPO}
          />
          {error ? (
            <p role="alert" className="text-body-md text-error">
              {error}
            </p>
          ) : null}
          {actualizada ? (
            <p className="text-body-md text-on-surface">Contraseña actualizada.</p>
          ) : null}
          <button
            type="submit"
            disabled={cargando}
            className="min-h-11 rounded-2xl bg-primary px-4 py-3.5 text-label-md text-on-primary disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="text-body-md text-on-surface">Entrás a tu cuenta con Google.</p>
          <p className="text-body-md text-on-surface-variant">
            No tenés contraseña que cambiar. Si querés una, usá “¿Olvidaste tu contraseña?” en la
            pantalla de ingreso.
          </p>
        </div>
      )}
    </div>
  );
}

export default Seguridad;
