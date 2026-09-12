import { useState } from "react";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import { olvidePassword } from "../../api/cuenta.js";

/**
 * `/cuenta/olvide`. `POST /cuenta/olvide` responde 200 exista o no la
 * cuenta (evita enumeración de emails): el mensaje de éxito es SIEMPRE el
 * mismo texto uniforme, nunca el que mande el backend.
 */
function Olvide() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await olvidePassword(email);
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
        <h1 className="font-display-lg text-headline-lg text-on-background">Revisá tu mail</h1>
        <p className="text-body-md text-on-surface-variant">
          Si hay una cuenta con ese email, te mandamos las instrucciones. ¿No te llegó en 5
          minutos? Revisá spam o escribinos por WhatsApp.
        </p>
        <PuertaWhatsApp />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Recuperar contraseña</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
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
          {cargando ? "Enviando..." : "Enviar instrucciones"}
        </button>
      </form>
    </div>
  );
}

export default Olvide;
