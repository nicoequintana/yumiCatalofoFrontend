import { useState } from "react";
import { Link } from "react-router-dom";
import CampoPassword from "../../components/CampoPassword.jsx";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import useCarrito, { storageDisponible } from "../../hooks/useCarrito.js";
import { registrarCuenta, reenviarVerificacion } from "../../api/cuenta.js";

function Registro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensajeReenvio, setMensajeReenvio] = useState(null);
  const { carrito } = useCarrito();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await registrarCuenta({ email, password, nombre, telefono, dni });
      // La respuesta es SIEMPRE la misma (spec, decisión 4: cierra la
      // enumeración por registro), así que esta pantalla no ramifica sobre
      // el cuerpo — solo sobre si la request tiró un error de red/servidor.
      setEnviado(true);
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
      const { mensaje } = await reenviarVerificacion(email);
      setMensajeReenvio(mensaje ?? "Te reenviamos el mail.");
    } catch (err) {
      setError(err.message);
    }
  }

  if (enviado) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
        <h1 className="font-display-lg text-headline-lg text-on-background">Revisá tu casilla</h1>
        <p className="text-body-md text-on-surface-variant">
          Te mandamos un mail a {email} para confirmar tu cuenta.
        </p>
        {error ? (
          <p role="alert" className="text-body-md text-error">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleReenviar}
          className="min-h-11 rounded border border-outline-variant px-4 py-2 text-label-md text-on-surface"
        >
          Reenviar
        </button>
        {mensajeReenvio ? (
          <p className="text-body-md text-on-surface-variant">{mensajeReenvio}</p>
        ) : null}
        <PuertaWhatsApp />
      </div>
    );
  }

  const avisoStorage = !storageDisponible() && carrito.length > 0;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Registrate</h1>

      {avisoStorage ? (
        <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
          Tu navegador está bloqueando el guardado. Si iniciás sesión ahora podés perder el
          carrito.
        </p>
      ) : null}

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
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Nombre</span>
          <input
            type="text"
            autoComplete="name"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">Teléfono</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-md text-on-surface-variant">DNI</span>
          <input
            type="text"
            inputMode="numeric"
            required
            value={dni}
            onChange={(e) => setDni(e.target.value)}
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
          {cargando ? "Registrando..." : "Registrarme"}
        </button>
      </form>

      <Link to="/cuenta/entrar" className="text-body-md text-primary underline">
        ¿Ya tenés cuenta? Iniciá sesión
      </Link>
    </div>
  );
}

export default Registro;
