import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CampoPassword from "../../components/CampoPassword.jsx";
import { restablecerPassword } from "../../api/cuenta.js";

/**
 * `/cuenta/restablecer`. `POST /cuenta/restablecer` responde `{ok:true}`,
 * NO `{mensaje}` (verificado contra
 * `backend/src/controllers/cuentaRecuperacion.controller.js`): la pantalla
 * pone su propio texto de éxito y no lee ningún campo del cuerpo.
 */
function Restablecer() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await restablecerPassword({ token, password });
      setListo(true);
    } catch (err) {
      if (err.motivo === "USADO") setError("Este link ya se usó.");
      else if (err.motivo === "VENCIDO") setError("Este link venció.");
      else setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">Falta el link</h1>
        <p className="text-body-md text-on-surface-variant">
          Este link de recuperación está incompleto. Volvé a copiarlo del mail.
        </p>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">
          Contraseña actualizada
        </h1>
        <Link to="/cuenta/entrar" className="text-body-md text-primary underline">
          Iniciá sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">
        Elegí una contraseña nueva
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CampoPassword
          value={password}
          onChange={setPassword}
          etiqueta="Contraseña"
          etiquetaVisible
          etiquetaClassName="text-label-md text-on-surface-variant mb-1 block"
          autoComplete="new-password"
          required
          className="rounded border border-outline-variant bg-surface-container-lowest py-2 pl-3 text-body-md text-on-surface"
        />
        {error ? (
          <p role="alert" className="text-body-md text-error">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={cargando}
          className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
        >
          {cargando ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}

export default Restablecer;
