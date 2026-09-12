import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import CampoPassword from "../../components/CampoPassword.jsx";
import BotonGmail from "../../components/BotonGmail.jsx";
import PuertaWhatsApp from "../../components/PuertaWhatsApp.jsx";
import useCarrito, { storageDisponible } from "../../hooks/useCarrito.js";
import { invalidarPerfil } from "../../hooks/usePerfilCliente.js";
import { loginCuenta, loginGoogle } from "../../api/cuenta.js";

const DESTINO_POR_DEFECTO = "/cuenta";
const FALLOS_ANTES_DE_PUERTA = 3;

/**
 * Mismo criterio de open-redirect que `destinoTrasLogin` en `AdminLogin.jsx`:
 * solo se obedece una ruta INTERNA — empieza con "/" y no con "//" (que el
 * navegador trata como protocol-relative a otro host).
 */
function destinoValido(volverA) {
  if (typeof volverA !== "string") return DESTINO_POR_DEFECTO;
  if (!volverA.startsWith("/") || volverA.startsWith("//")) return DESTINO_POR_DEFECTO;
  return volverA;
}

function Entrar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [fallosSeguidos, setFallosSeguidos] = useState(0);
  const [cargando, setCargando] = useState(false);
  // `BotonGmail` devuelve null y avisa por acá cuando falta VITE_GOOGLE_CLIENT_ID
  // o el script de Google no carga a tiempo. Sin escuchar el aviso, el rótulo
  // y el separador quedaban señalando un botón que no existe.
  const [googleDisponible, setGoogleDisponible] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { carrito } = useCarrito();
  const volverA = destinoValido(searchParams.get("volverA"));

  function irADestino() {
    invalidarPerfil();
    navigate(volverA);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const respuesta = await loginCuenta({ email, password });
      if (respuesta?.requiereCodigo) {
        navigate("/cuenta/entrar/codigo", { state: { email, volverA } });
        return;
      }
      setFallosSeguidos(0);
      irADestino();
    } catch (err) {
      if (err.status === 401) setFallosSeguidos((n) => n + 1);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCredencialGoogle(credential) {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await loginGoogle(credential);
      invalidarPerfil();
      navigate(
        respuesta?.completar ? `/cuenta/completar?volverA=${encodeURIComponent(volverA)}` : volverA,
      );
    } catch (err) {
      if (err.codigo === "SOLO_GMAIL") {
        setError(
          "Con una cuenta de Google del trabajo no podemos continuar. Registrate con el formulario.",
        );
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }

  const mostrarPuerta = fallosSeguidos >= FALLOS_ANTES_DE_PUERTA;
  const avisoStorage = !storageDisponible() && carrito.length > 0;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-margin-mobile py-16 md:px-margin-desktop">
      <h1 className="font-display-lg text-headline-lg text-on-background">Iniciá sesión</h1>

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
          autoComplete="current-password"
          required
          className="rounded border border-outline-variant bg-surface-container-lowest py-2 pl-3 text-body-md text-on-surface"
        />
        {error ? (
          <p role="alert" className="text-body-md text-error">
            {error}
          </p>
        ) : null}
        {mostrarPuerta ? (
          <div className="flex flex-col gap-2 rounded-lg bg-surface-container-lowest p-4">
            <p className="text-body-md text-on-surface">
              Si olvidaste tu contraseña, podés recuperarla.
            </p>
            <PuertaWhatsApp />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={cargando}
          className="min-h-11 rounded bg-primary px-4 py-2 text-label-md text-on-primary disabled:opacity-50"
        >
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>

      {/* Debajo del formulario y detrás de un separador: entrar con email es la
          vía principal, Google es la alternativa. El bloque entero —separador,
          rótulo y botón— desaparece si Google no se puede dibujar. */}
      {googleDisponible ? (
        <div className="flex flex-col gap-3">
          {/* Sin rótulo propio encima: Google localiza SU botón al idioma del
              navegador ("Acceder con Google") y no deja restilarlo, así que
              cualquier texto nuestro al lado es el mismo mensaje dos veces. El
              separador ya avisa que empieza otra opción. */}
          <div className="flex items-center gap-3" role="separator" aria-label="o">
            <span className="h-px flex-1 bg-outline-variant" />
            <span aria-hidden="true" className="text-label-md text-on-surface-variant">
              o
            </span>
            <span className="h-px flex-1 bg-outline-variant" />
          </div>
          <BotonGmail
            onCredential={handleCredencialGoogle}
            onNoDisponible={() => setGoogleDisponible(false)}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2 text-body-md text-on-surface-variant">
        <Link to="/cuenta/registro" className="text-primary underline">
          ¿No tenés cuenta? Registrate
        </Link>
        <Link to="/cuenta/olvide" className="text-primary underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
}

export default Entrar;
