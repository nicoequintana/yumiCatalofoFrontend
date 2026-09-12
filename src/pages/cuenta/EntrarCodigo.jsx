import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import { invalidarPerfil } from "../../hooks/usePerfilCliente.js";
import { loginCodigo, reenviarCodigo } from "../../api/cuenta.js";

const SEGUNDOS_REENVIO = 60;

/**
 * El código por email en dispositivo nuevo (decisión 14 de la spec): la
 * clave por sí sola no alcanza si venía de otra filtración. Sin `email` en
 * el `state` (navegación directa a la URL, o refresh — el `state` de
 * react-router no sobrevive una recarga) no hay a quién pedirle el código:
 * se manda de vuelta a `/cuenta/entrar`.
 */
function EntrarCodigo() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const volverA = location.state?.volverA ?? "/cuenta";

  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const [mensajeReenvio, setMensajeReenvio] = useState(null);

  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const id = setTimeout(() => setSegundosRestantes((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [segundosRestantes]);

  if (!email) {
    return <Navigate to="/cuenta/entrar" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await loginCodigo({ email, codigo });
      invalidarPerfil();
      navigate(volverA);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleReenviar() {
    setError(null);
    setMensajeReenvio(null);
    try {
      const { mensaje } = await reenviarCodigo(email);
      setMensajeReenvio(mensaje ?? "Te reenviamos el código.");
      setSegundosRestantes(SEGUNDOS_REENVIO);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Ingresá el código</h1>
      <p className="text-body-md text-on-surface-variant">
        Te mandamos un código a {email}. Es un dispositivo nuevo, así que lo pedimos una sola vez.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Código</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
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
          {cargando ? "Verificando..." : "Confirmar código"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleReenviar}
          disabled={segundosRestantes > 0}
          className="min-h-11 text-label-md text-primary underline disabled:text-on-surface-variant disabled:no-underline"
        >
          {segundosRestantes > 0 ? `Reenviar (${segundosRestantes}s)` : "Reenviar"}
        </button>
        {mensajeReenvio ? (
          <p className="text-body-md text-on-surface-variant">{mensajeReenvio}</p>
        ) : null}
      </div>

      <PuertaWhatsApp />
    </div>
  );
}

export default EntrarCodigo;
