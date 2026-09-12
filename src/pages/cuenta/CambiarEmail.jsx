import { useState } from "react";
import CampoPassword from "../../components/CampoPassword.jsx";
import usePerfilCliente from "../../hooks/usePerfilCliente.js";
import { cambiarEmail } from "../../api/cuenta.js";

/**
 * `/cuenta/email` — pide el cambio de email. El email todavía NO cambió
 * cuando esto resuelve: el backend manda un mail de confirmación a la
 * dirección nueva, así que acá no hay perfil que escribir ni invalidar. La
 * escritura real pasa en `/cuenta/email/confirmar`, cuando alguien abre ese
 * link.
 */
function CambiarEmail() {
  const { perfil } = usePerfilCliente();
  const [emailNuevo, setEmailNuevo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await cambiarEmail({ emailNuevo, password });
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">Confirmá el cambio</h1>
        <p className="text-body-md text-on-surface-variant">
          Te mandamos un link a {emailNuevo} para confirmar el cambio de email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Cambiar email</h1>
      {perfil?.tieneGoogle ? (
        <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
          Al cambiar el email se desvincula tu cuenta de Google
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Email nuevo</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={emailNuevo}
            onChange={(e) => setEmailNuevo(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
        <CampoPassword
          value={password}
          onChange={setPassword}
          etiqueta="Contraseña actual"
          etiquetaVisible
          etiquetaClassName="text-label-md text-on-surface-variant mb-1 block"
          autoComplete="current-password"
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
          {cargando ? "Enviando..." : "Cambiar email"}
        </button>
      </form>
    </div>
  );
}

export default CambiarEmail;
